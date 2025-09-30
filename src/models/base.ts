import type postgres from "postgres";
import type { IllnessCase, QueryTestData } from "../types";

export interface DataModelImplementation {
  setupSchema(sql: postgres.Sql): Promise<void>;
  insertData(sql: postgres.Sql, cases: IllnessCase[]): Promise<void>;
  query1(sql: postgres.Sql, firstName: string): Promise<any[]>;
  query2(sql: postgres.Sql, illnessCaseId: string): Promise<any[]>;
  query3(sql: postgres.Sql): Promise<any[]>;
  cleanup(sql: postgres.Sql): Promise<void>;
}
