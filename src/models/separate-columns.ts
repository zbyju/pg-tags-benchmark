import type postgres from "postgres";
import type { IllnessCase } from "../types";
import type { DataModelImplementation } from "./base";

export class SeparateColumnsModel implements DataModelImplementation {
  constructor(private indexed: boolean) {}

  async setupSchema(sql: postgres.Sql): Promise<void> {
    await sql.unsafe("DROP TABLE IF EXISTS documents CASCADE");

    await sql`
      CREATE TABLE documents (
        document_id UUID PRIMARY KEY,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL,
        illness_case_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        published_at TEXT NOT NULL,
        email TEXT,
        phone_number TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        zip_code TEXT,
        diagnosis TEXT,
        severity TEXT,
        status TEXT,
        assigned_to TEXT,
        department TEXT,
        priority TEXT,
        category TEXT,
        subcategory TEXT,
        notes TEXT
      )
    `;

    if (this.indexed) {
      await sql`CREATE INDEX idx_documents_firstname ON documents(firstname)`;
      await sql`CREATE INDEX idx_documents_illness_case_id ON documents(illness_case_id)`;
      await sql`CREATE INDEX idx_documents_published_at ON documents(published_at)`;
    }
  }

  async insertData(sql: postgres.Sql, cases: IllnessCase[]): Promise<void> {
    const documents = cases.flatMap((c) => c.documents);

    if (documents.length === 0) return;

    const totalDocs = documents.length;

    // Each document has 23 columns
    // Safe limit: 65534 / 23 = ~2849 rows per batch
    const isLargeDataset = totalDocs >= 10000000;
    const docBatchSize = isLargeDataset ? 2800 : 2500;

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
          firstname: doc.firstName,
          lastname: doc.lastName,
          illness_case_id: doc.illnessCaseId,
          tenant_id: doc.tenantId,
          published_at: doc.publishedAt.toISOString(),
          email: doc.email || null,
          phone_number: doc.phoneNumber || null,
          address: doc.address || null,
          city: doc.city || null,
          country: doc.country || null,
          zip_code: doc.zipCode || null,
          diagnosis: doc.diagnosis || null,
          severity: doc.severity || null,
          status: doc.status || null,
          assigned_to: doc.assignedTo || null,
          department: doc.department || null,
          priority: doc.priority || null,
          category: doc.category || null,
          subcategory: doc.subcategory || null,
          notes: doc.notes || null,
        }));

        insertPromises.push(sql`INSERT INTO documents ${sql(docInserts)}`);
      }

      // Wait for all parallel inserts to complete
      await Promise.all(insertPromises);
    });
  }

  async query1(sql: postgres.Sql, firstName: string): Promise<any[]> {
    const result = await sql`
      SELECT document_id
      FROM documents
      WHERE firstname = ${firstName}
    `;
    return result;
  }

  async query2(sql: postgres.Sql, illnessCaseId: string): Promise<any[]> {
    const result = await sql`
      SELECT document_id
      FROM documents
      WHERE illness_case_id = ${illnessCaseId}
    `;
    return result;
  }

  async query3(sql: postgres.Sql): Promise<any[]> {
    const result = await sql`
      SELECT document_id
      FROM documents
      ORDER BY published_at ASC
      LIMIT 100
    `;
    return result;
  }

  async cleanup(sql: postgres.Sql): Promise<void> {
    await sql.unsafe("DROP TABLE IF EXISTS documents CASCADE");
  }
}
