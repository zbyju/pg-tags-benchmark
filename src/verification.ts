import type { IllnessCase, QueryTestData } from "./types";

export function calculateExpectedResults(cases: IllnessCase[]): QueryTestData {
  const documents = cases.flatMap((c) => c.documents);

  if (documents.length === 0) {
    throw new Error("No documents to generate test data from");
  }

  // Pick random elements (not first)
  const randomCaseIndex = Math.floor(Math.random() * cases.length);
  const randomCase = cases[randomCaseIndex];
  const sampleFirstName = randomCase.firstName;
  const sampleIllnessCaseId = randomCase.illnessCaseId;

  // Query 1: Count documents with matching firstName
  const expectedQuery1Count = documents.filter(
    (doc) => doc.firstName === sampleFirstName
  ).length;

  // Query 2: Count documents with matching illnessCaseId
  const expectedQuery2Count = documents.filter(
    (doc) => doc.illnessCaseId === sampleIllnessCaseId
  ).length;

  // Query 3: Count first 100 documents sorted by publishedAt
  const expectedQuery3Count = Math.min(100, documents.length);

  return {
    sampleFirstName,
    sampleIllnessCaseId,
    expectedQuery1Count,
    expectedQuery2Count,
    expectedQuery3Count,
  };
}

export function verifyQueryResults(
  modelName: string,
  query1Count: number,
  query2Count: number,
  query3Count: number,
  expected: QueryTestData,
): void {
  const errors: string[] = [];

  if (query1Count !== expected.expectedQuery1Count) {
    errors.push(
      `Query 1 mismatch: expected ${expected.expectedQuery1Count}, got ${query1Count}`
    );
  }

  if (query2Count !== expected.expectedQuery2Count) {
    errors.push(
      `Query 2 mismatch: expected ${expected.expectedQuery2Count}, got ${query2Count}`
    );
  }

  if (query3Count !== expected.expectedQuery3Count) {
    errors.push(
      `Query 3 mismatch: expected ${expected.expectedQuery3Count}, got ${query3Count}`
    );
  }

  if (errors.length > 0) {
    console.error(`\n❌ VERIFICATION FAILED for ${modelName}:`);
    errors.forEach((err) => console.error(`  - ${err}`));
    throw new Error(`Verification failed for ${modelName}`);
  } else {
    console.log(`  ✓ Verification passed (Q1: ${query1Count}, Q2: ${query2Count}, Q3: ${query3Count})`);
  }
}
