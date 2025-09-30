import type postgres from "postgres";
import type { IllnessCase } from "../types";
import type { DataModelImplementation } from "./base";

export class SeparateTableModel implements DataModelImplementation {
  constructor(private indexed: boolean) {}

  async setupSchema(sql: postgres.Sql): Promise<void> {
    await sql.unsafe("DROP TABLE IF EXISTS document_tags CASCADE");
    await sql.unsafe("DROP TABLE IF EXISTS documents CASCADE");

    await sql`
      CREATE TABLE documents (
        document_id UUID PRIMARY KEY,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL
      )
    `;

    await sql`
      CREATE TABLE document_tags (
        id SERIAL PRIMARY KEY,
        document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL
      )
    `;

    if (this.indexed) {
      await sql`CREATE INDEX idx_document_tags_document_id ON document_tags(document_id)`;
      await sql`CREATE INDEX idx_document_tags_key ON document_tags(key)`;
      await sql`CREATE INDEX idx_document_tags_value ON document_tags(value)`;
      await sql`CREATE INDEX idx_document_tags_key_value ON document_tags(key, value)`;
    }
  }

  async insertData(sql: postgres.Sql, cases: IllnessCase[]): Promise<void> {
    const documents = cases.flatMap((c) => c.documents);

    if (documents.length === 0) return;

    const totalDocs = documents.length;

    // Documents: 3 columns per row, so 65534 / 3 = ~21844 rows max
    // Tags: 3 columns per row, 5 tags per doc, so (65534 / 3) / 5 = ~4368 docs per batch
    const isLargeDataset = totalDocs >= 10000000;
    const docBatchSize = isLargeDataset ? 20000 : 15000;
    const tagDocBatchSize = isLargeDataset ? 4000 : 3000;

    // Use transactions for better performance
    await sql.begin(async (sql) => {
      // Batch documents to avoid parameter limit
      for (let i = 0; i < documents.length; i += docBatchSize) {
        const docBatch = documents.slice(i, i + docBatchSize);
        const docInserts = docBatch.map((doc) => ({
          document_id: doc.documentId,
          created_by: doc.createdBy,
          created_at: doc.createdAt,
        }));

        await sql`INSERT INTO documents ${sql(docInserts)}`;

        // Insert tags in parallel using multiple connections from the pool
        // Split tag batches across parallel promises
        const tagBatches: Promise<any>[] = [];
        for (let j = 0; j < docBatch.length; j += tagDocBatchSize) {
          const tagDocBatch = docBatch.slice(j, j + tagDocBatchSize);
          const tagInserts = tagDocBatch.flatMap((doc) => [
            {
              document_id: doc.documentId,
              key: "firstname",
              value: doc.firstName,
            },
            {
              document_id: doc.documentId,
              key: "lastname",
              value: doc.lastName,
            },
            {
              document_id: doc.documentId,
              key: "illness_case_id",
              value: doc.illnessCaseId,
            },
            {
              document_id: doc.documentId,
              key: "tenant_id",
              value: doc.tenantId,
            },
            {
              document_id: doc.documentId,
              key: "published_at",
              value: doc.publishedAt.toISOString(),
            },
          ]);

          tagBatches.push(sql`INSERT INTO document_tags ${sql(tagInserts)}`);
        }

        // Wait for all parallel tag inserts to complete
        await Promise.all(tagBatches);
      }
    });
  }

  async query1(sql: postgres.Sql, firstName: string): Promise<any[]> {
    const result = await sql`
      SELECT d.document_id, d.created_by, d.created_at, dt_fname.value as firstname
      FROM documents d
      JOIN document_tags dt_fname ON d.document_id = dt_fname.document_id AND dt_fname.key = 'firstname'
      WHERE dt_fname.value = ${firstName}
    `;
    return result;
  }

  async query2(sql: postgres.Sql, illnessCaseId: string): Promise<any[]> {
    const result = await sql`
      SELECT d.document_id, d.created_by, d.created_at, dt_illness.value as illness_case_id
      FROM documents d
      JOIN document_tags dt_illness ON d.document_id = dt_illness.document_id AND dt_illness.key = 'illness_case_id'
      WHERE dt_illness.value = ${illnessCaseId}
    `;
    return result;
  }

  async query3(sql: postgres.Sql): Promise<any[]> {
    const result = await sql`
      SELECT d.document_id, d.created_by, d.created_at, dt.value as published_at
      FROM documents d
      JOIN document_tags dt ON d.document_id = dt.document_id AND dt.key = 'published_at'
      ORDER BY dt.value ASC
      LIMIT 100
    `;
    return result;
  }

  async cleanup(sql: postgres.Sql): Promise<void> {
    await sql.unsafe("DROP TABLE IF EXISTS document_tags CASCADE");
    await sql.unsafe("DROP TABLE IF EXISTS documents CASCADE");
  }
}
