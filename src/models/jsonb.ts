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
    // The tags field contains up to 20 tag objects, but it's passed as a single JSONB parameter
    // So each row = 4 parameters (but with more data in the JSONB)
    // Safe limit: 65534 / 4 = ~16383 rows per batch (reduced for larger JSONB payloads)
    const isLargeDataset = totalDocs >= 10000000;
    const docBatchSize = isLargeDataset ? 12000 : 8000;

    // Use transactions for better performance
    await sql.begin(async (sql) => {
      // Insert documents in parallel using connection pool
      const insertPromises: Promise<any>[] = [];

      for (let i = 0; i < documents.length; i += docBatchSize) {
        const docBatch = documents.slice(i, i + docBatchSize);
        const docInserts = docBatch.map((doc) => {
          const tags = [];

          // Core tags (always present)
          tags.push({ key: "firstname", value: doc.firstName });
          tags.push({ key: "lastname", value: doc.lastName });
          tags.push({ key: "illness_case_id", value: doc.illnessCaseId });
          tags.push({ key: "tenant_id", value: doc.tenantId });
          tags.push({ key: "published_at", value: doc.publishedAt.toISOString() });

          // Optional tags (only add if defined)
          if (doc.email) tags.push({ key: "email", value: doc.email });
          if (doc.phoneNumber) tags.push({ key: "phone_number", value: doc.phoneNumber });
          if (doc.address) tags.push({ key: "address", value: doc.address });
          if (doc.city) tags.push({ key: "city", value: doc.city });
          if (doc.country) tags.push({ key: "country", value: doc.country });
          if (doc.zipCode) tags.push({ key: "zip_code", value: doc.zipCode });
          if (doc.diagnosis) tags.push({ key: "diagnosis", value: doc.diagnosis });
          if (doc.severity) tags.push({ key: "severity", value: doc.severity });
          if (doc.status) tags.push({ key: "status", value: doc.status });
          if (doc.assignedTo) tags.push({ key: "assigned_to", value: doc.assignedTo });
          if (doc.department) tags.push({ key: "department", value: doc.department });
          if (doc.priority) tags.push({ key: "priority", value: doc.priority });
          if (doc.category) tags.push({ key: "category", value: doc.category });
          if (doc.subcategory) tags.push({ key: "subcategory", value: doc.subcategory });
          if (doc.notes) tags.push({ key: "notes", value: doc.notes });

          return {
            document_id: doc.documentId,
            created_by: doc.createdBy,
            created_at: doc.createdAt,
            tags,
          };
        });

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
             tags
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
             tags
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
             tags
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
