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
  // Core tags (always present)
  firstName: string;
  lastName: string;
  illnessCaseId: string;
  tenantId: string;
  publishedAt: Date;
  // Optional tags (may be null/undefined)
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  diagnosis?: string;
  severity?: string;
  status?: string;
  assignedTo?: string;
  department?: string;
  priority?: string;
  category?: string;
  subcategory?: string;
  notes?: string;
}

export type DataModel = 'separate_table' | 'separate_table_indexed' | 'jsonb' | 'jsonb_indexed' | 'separate_columns' | 'separate_columns_indexed';

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
