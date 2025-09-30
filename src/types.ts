export interface IllnessCase {
  illnessCaseId: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  documents: Document[];
}

export interface Document {
  documentId: string;
  createdBy: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  illnessCaseId: string;
  tenantId: string;
  publishedAt: Date;
}

export type DataModel = 'separate_table' | 'separate_table_indexed' | 'jsonb' | 'jsonb_indexed';

export interface BenchmarkConfig {
  illnessCases: number;
  documentsPerCase: number;
  dataModel: DataModel;
}

export interface BenchmarkResult {
  illnessCases: number;
  documentsPerCase: number;
  totalDocuments: number;
  dataModel: DataModel;
  insertTimeMs: number;
  query1TimeMs: number;  // search by firstname
  query2TimeMs: number;  // search by illness_case_id
  query3TimeMs: number;  // get first 100 ordered by published_at
  run: number;
  timestamp: string;
}

export interface QueryTestData {
  sampleFirstName: string;
  sampleIllnessCaseId: string;
  expectedQuery1Count: number;
  expectedQuery2Count: number;
  expectedQuery3Count: number;
}
