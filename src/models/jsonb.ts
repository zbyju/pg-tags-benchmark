import type postgres from "postgres";
import type { IllnessCase } from "../types";
import type { DataModelImplementation } from "./base";

export class JsonbModel implements DataModelImplementation {
  constructor(private indexed: boolean) {}

  async setupSchema(sql: postgres.Sql): Promise<void> {
    await sql.unsafe("DROP TABLE IF EXISTS documents CASCADE");

    await sql`
      CREATE TABLE documents (
        document_id UUID PRIMARY KEY,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        tags JSONB NOT NULL
      )
    `;

    if (this.indexed) {
      await sql`CREATE INDEX idx_documents_tags_gin ON documents USING GIN (tags)`;
      await sql`CREATE INDEX idx_documents_created_at ON documents(created_at)`;
    }
  }

  async insertData(sql: postgres.Sql, cases: IllnessCase[]): Promise<void> {
    const documents = cases.flatMap((c) => c.documents);

    if (documents.length === 0) return;

    const totalDocs = documents.length;

    // Each document has 4 columns (document_id, created_by, created_at, tags)
    // The tags field contains 5 tag objects, but it's passed as a single JSONB parameter
    // So each row = 4 parameters
    // Safe limit: 65534 / 4 = ~16383 rows per batch
    const isLargeDataset = totalDocs >= 10000000;
    const docBatchSize = isLargeDataset ? 15000 : 10000;

    // Use transactions for better performance
    await sql.begin(async (sql) => {
      // Insert documents in parallel using connection pool
      const insertPromises: Promise<any>[] = [];

      for (let i = 0; i < documents.length; i += docBatchSize) {
        const docBatch = documents.slice(i, i + docBatchSize);
        const docInserts = docBatch.map((doc) => ({
          document_id: doc.documentId,
          created_by: doc.createdBy,
          created_at: doc.createdAt,
          tags: [
            { key: "firstname", value: doc.firstName },
            { key: "lastname", value: doc.lastName },
            { key: "illness_case_id", value: doc.illnessCaseId },
            { key: "tenant_id", value: doc.tenantId },
            { key: "published_at", value: doc.publishedAt.toISOString() },
          ],
        }));

        insertPromises.push(sql`INSERT INTO documents ${sql(docInserts)}`);
      }

      // Wait for all parallel inserts to complete
      await Promise.all(insertPromises);
    });
  }

  async query1(sql: postgres.Sql, firstName: string): Promise<any[]> {
    const result = await sql`
      SELECT document_id,
             created_by,
             created_at,
             (SELECT value->>'value' FROM jsonb_array_elements(tags) WHERE value->>'key' = 'firstname' LIMIT 1) as firstname
      FROM documents
      WHERE tags @> ${sql.json([{ key: "firstname", value: firstName }])}
    `;
    return result;
  }

  async query2(sql: postgres.Sql, illnessCaseId: string): Promise<any[]> {
    const result = await sql`
      SELECT document_id,
             created_by,
             created_at,
             (SELECT value->>'value' FROM jsonb_array_elements(tags) WHERE value->>'key' = 'illness_case_id' LIMIT 1) as illness_case_id
      FROM documents
      WHERE tags @> ${sql.json([{ key: "illness_case_id", value: illnessCaseId }])}
    `;
    return result;
  }

  async query3(sql: postgres.Sql): Promise<any[]> {
    const result = await sql`
      SELECT document_id,
             created_by,
             created_at,
             (SELECT value->>'value' FROM jsonb_array_elements(tags) WHERE value->>'key' = 'published_at' LIMIT 1) as published_at
      FROM documents
      ORDER BY (
        SELECT value->>'value'
        FROM jsonb_array_elements(tags)
        WHERE value->>'key' = 'published_at'
        LIMIT 1
      ) ASC
      LIMIT 100
    `;
    return result;
  }

  async cleanup(sql: postgres.Sql): Promise<void> {
    await sql.unsafe("DROP TABLE IF EXISTS documents CASCADE");
  }
}
