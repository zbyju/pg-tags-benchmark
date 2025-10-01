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
    // Tags: 3 columns per row, ~15.5 tags per doc on average, so (65534 / 3) / 15.5 = ~1410 docs per batch
    const isLargeDataset = totalDocs >= 10000000;
    const docBatchSize = isLargeDataset ? 20000 : 15000;
    const tagDocBatchSize = isLargeDataset ? 1400 : 1200;

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
          const tagInserts = tagDocBatch.flatMap((doc) => {
            const tags = [];

            // Core tags (always present)
            tags.push({ document_id: doc.documentId, key: "firstname", value: doc.firstName });
            tags.push({ document_id: doc.documentId, key: "lastname", value: doc.lastName });
            tags.push({ document_id: doc.documentId, key: "illness_case_id", value: doc.illnessCaseId });
            tags.push({ document_id: doc.documentId, key: "tenant_id", value: doc.tenantId });
            tags.push({ document_id: doc.documentId, key: "published_at", value: doc.publishedAt.toISOString() });

            // Optional tags (only add if defined)
            if (doc.email) tags.push({ document_id: doc.documentId, key: "email", value: doc.email });
            if (doc.phoneNumber) tags.push({ document_id: doc.documentId, key: "phone_number", value: doc.phoneNumber });
            if (doc.address) tags.push({ document_id: doc.documentId, key: "address", value: doc.address });
            if (doc.city) tags.push({ document_id: doc.documentId, key: "city", value: doc.city });
            if (doc.country) tags.push({ document_id: doc.documentId, key: "country", value: doc.country });
            if (doc.zipCode) tags.push({ document_id: doc.documentId, key: "zip_code", value: doc.zipCode });
            if (doc.diagnosis) tags.push({ document_id: doc.documentId, key: "diagnosis", value: doc.diagnosis });
            if (doc.severity) tags.push({ document_id: doc.documentId, key: "severity", value: doc.severity });
            if (doc.status) tags.push({ document_id: doc.documentId, key: "status", value: doc.status });
            if (doc.assignedTo) tags.push({ document_id: doc.documentId, key: "assigned_to", value: doc.assignedTo });
            if (doc.department) tags.push({ document_id: doc.documentId, key: "department", value: doc.department });
            if (doc.priority) tags.push({ document_id: doc.documentId, key: "priority", value: doc.priority });
            if (doc.category) tags.push({ document_id: doc.documentId, key: "category", value: doc.category });
            if (doc.subcategory) tags.push({ document_id: doc.documentId, key: "subcategory", value: doc.subcategory });
            if (doc.notes) tags.push({ document_id: doc.documentId, key: "notes", value: doc.notes });

            return tags;
          });

          tagBatches.push(sql`INSERT INTO document_tags ${sql(tagInserts)}`);
        }

        // Wait for all parallel tag inserts to complete
        await Promise.all(tagBatches);
      }
    });
  }

  async query1(sql: postgres.Sql, firstName: string): Promise<any[]> {
    const result = await sql`
      SELECT d.document_id, d.created_by, d.created_at,
             jsonb_object_agg(dt_all.key, dt_all.value) as tags
      FROM documents d
      JOIN document_tags dt_fname ON d.document_id = dt_fname.document_id AND dt_fname.key = 'firstname'
      JOIN document_tags dt_all ON d.document_id = dt_all.document_id
      WHERE dt_fname.value = ${firstName}
      GROUP BY d.document_id, d.created_by, d.created_at
    `;
    return result;
  }

  async query2(sql: postgres.Sql, illnessCaseId: string): Promise<any[]> {
    const result = await sql`
      SELECT d.document_id, d.created_by, d.created_at,
             jsonb_object_agg(dt_all.key, dt_all.value) as tags
      FROM documents d
      JOIN document_tags dt_illness ON d.document_id = dt_illness.document_id AND dt_illness.key = 'illness_case_id'
      JOIN document_tags dt_all ON d.document_id = dt_all.document_id
      WHERE dt_illness.value = ${illnessCaseId}
      GROUP BY d.document_id, d.created_by, d.created_at
    `;
    return result;
  }

  async query3(sql: postgres.Sql): Promise<any[]> {
    const result = await sql`
      SELECT d.document_id, d.created_by, d.created_at,
             jsonb_object_agg(dt_all.key, dt_all.value) as tags
      FROM documents d
      JOIN document_tags dt ON d.document_id = dt.document_id AND dt.key = 'published_at'
      JOIN document_tags dt_all ON d.document_id = dt_all.document_id
      GROUP BY d.document_id, d.created_by, d.created_at, dt.value
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
