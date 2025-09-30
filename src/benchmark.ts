import type postgres from "postgres";
import { getModelImplementation } from "./models";
import { verifyQueryResults } from "./verification";
import type { BenchmarkConfig, BenchmarkResult, QueryTestData, IllnessCase } from "./types";

const QUERY_TIMEOUT_MS = 20 * 1000; // 20 seconds

async function runQueryWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

export async function runBenchmark(
  sql: postgres.Sql,
  config: BenchmarkConfig,
  run: number,
  cases: IllnessCase[],
  testData: QueryTestData,
): Promise<BenchmarkResult | null> {
  console.log(
    `Running benchmark: model: ${config.dataModel}, run: ${run + 1}/3`,
  );

  const model = getModelImplementation(config.dataModel);

  const startSetup = Date.now();
  await model.setupSchema(sql);
  console.log(`  Schema setup: ${Date.now() - startSetup}ms`);

  const totalDocs = cases.reduce((sum, c) => sum + c.documents.length, 0);

  const startInsert = Date.now();
  await model.insertData(sql, cases);
  const insertTime = Date.now() - startInsert;
  console.log(`  Insert time: ${insertTime}ms`);

  // Query 1: Search by firstname
  console.log(`  Running Query 1 (search by firstname)...`);
  const startQuery1 = Date.now();
  const result1 = await runQueryWithTimeout(
    () => model.query1(sql, testData.sampleFirstName),
    QUERY_TIMEOUT_MS,
  );
  const query1Time = Date.now() - startQuery1;

  if (result1 === null) {
    console.log(`  Query 1 TIMEOUT after ${query1Time}ms`);
    await model.cleanup(sql);
    return null;
  }
  console.log(`  Query 1 time: ${query1Time}ms (${result1.length} results)`);

  // Query 2: Search by illness_case_id
  console.log(`  Running Query 2 (search by illness_case_id)...`);
  const startQuery2 = Date.now();
  const result2 = await runQueryWithTimeout(
    () => model.query2(sql, testData.sampleIllnessCaseId),
    QUERY_TIMEOUT_MS,
  );
  const query2Time = Date.now() - startQuery2;

  if (result2 === null) {
    console.log(`  Query 2 TIMEOUT after ${query2Time}ms`);
    await model.cleanup(sql);
    return null;
  }
  console.log(`  Query 2 time: ${query2Time}ms (${result2.length} results)`);

  // Query 3: Get first 100 ordered by published_at
  console.log(`  Running Query 3 (first 100 ordered by published_at)...`);
  const startQuery3 = Date.now();
  const result3 = await runQueryWithTimeout(
    () => model.query3(sql),
    QUERY_TIMEOUT_MS,
  );
  const query3Time = Date.now() - startQuery3;

  if (result3 === null) {
    console.log(`  Query 3 TIMEOUT after ${query3Time}ms`);
    await model.cleanup(sql);
    return null;
  }
  console.log(`  Query 3 time: ${query3Time}ms (${result3.length} results)`);

  // Verify results match expected counts
  verifyQueryResults(
    config.dataModel,
    result1.length,
    result2.length,
    result3.length,
    testData,
  );

  // Cleanup
  await model.cleanup(sql);
  console.log(`  Cleanup completed`);

  return {
    illnessCases: config.illnessCases,
    documentsPerCase: config.documentsPerCase,
    totalDocuments: totalDocs,
    dataModel: config.dataModel,
    insertTimeMs: insertTime,
    query1TimeMs: query1Time,
    query2TimeMs: query2Time,
    query3TimeMs: query3Time,
    run: run + 1,
    timestamp: new Date().toISOString(),
  };
}
