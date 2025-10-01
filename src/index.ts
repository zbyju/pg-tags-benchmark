import { createConnection } from "./database";
import { runBenchmark } from "./benchmark";
import { generateIllnessCases } from "./generator";
import { getModelImplementation } from "./models";
import { calculateExpectedResults } from "./verification";
import type { BenchmarkConfig, BenchmarkResult, DataModel } from "./types";
import { writeFile } from "fs/promises";

const ILLNESS_CASE_COUNTS = [1000, 10000, 100000, 1000000, 10000000];
const DOCUMENTS_PER_CASE = [5, 20, 50, 100];
const DATA_MODELS: DataModel[] = [
  "separate_table",
  "separate_table_indexed",
  "jsonb",
  "jsonb_indexed",
  "separate_columns",
  "separate_columns_indexed",
];
const RUNS = 3;

async function writeResults(results: BenchmarkResult[]) {
  const csv = [
    "illnessCases,documentsPerCase,totalDocuments,dataModel,insertTimeMs,query1TimeMs,query2TimeMs,query3TimeMs,run,timestamp",
  ];

  for (const result of results) {
    csv.push(
      `${result.illnessCases},${result.documentsPerCase},${result.totalDocuments},${result.dataModel},${result.insertTimeMs},${result.query1TimeMs},${result.query2TimeMs},${result.query3TimeMs},${result.run},${result.timestamp}`,
    );
  }

  await writeFile("benchmark_results.csv", csv.join("\n"));
  console.log(
    `\nResults written to benchmark_results.csv (${results.length} entries)`,
  );
}

async function calculateAverages(results: BenchmarkResult[]) {
  const grouped = new Map<string, BenchmarkResult[]>();

  for (const result of results) {
    const key = `${result.illnessCases}_${result.documentsPerCase}_${result.dataModel}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(result);
  }

  const averages: BenchmarkResult[] = [];

  for (const [key, group] of grouped) {
    if (group.length > 0) {
      const avgInsert =
        group.reduce((sum, r) => sum + r.insertTimeMs, 0) / group.length;
      const avgQuery1 =
        group.reduce((sum, r) => sum + r.query1TimeMs, 0) / group.length;
      const avgQuery2 =
        group.reduce((sum, r) => sum + r.query2TimeMs, 0) / group.length;
      const avgQuery3 =
        group.reduce((sum, r) => sum + r.query3TimeMs, 0) / group.length;

      averages.push({
        ...group[0],
        insertTimeMs: Math.round(avgInsert),
        query1TimeMs: Math.round(avgQuery1),
        query2TimeMs: Math.round(avgQuery2),
        query3TimeMs: Math.round(avgQuery3),
        run: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const csv = [
    "illnessCases,documentsPerCase,totalDocuments,dataModel,avgInsertTimeMs,avgQuery1TimeMs,avgQuery2TimeMs,avgQuery3TimeMs,numRuns,timestamp",
  ];

  for (const avg of averages) {
    const numRuns = grouped.get(
      `${avg.illnessCases}_${avg.documentsPerCase}_${avg.dataModel}`,
    )!.length;
    csv.push(
      `${avg.illnessCases},${avg.documentsPerCase},${avg.totalDocuments},${avg.dataModel},${avg.insertTimeMs},${avg.query1TimeMs},${avg.query2TimeMs},${avg.query3TimeMs},${numRuns},${avg.timestamp}`,
    );
  }

  await writeFile("benchmark_averages.csv", csv.join("\n"));
  console.log(
    `Averages written to benchmark_averages.csv (${averages.length} entries)`,
  );
}

async function main() {
  const sql = createConnection();

  const configs: BenchmarkConfig[] = [];
  for (const illnessCases of ILLNESS_CASE_COUNTS) {
    for (const docsPerCase of DOCUMENTS_PER_CASE) {
      for (const dataModel of DATA_MODELS) {
        configs.push({
          illnessCases,
          documentsPerCase: docsPerCase,
          dataModel,
        });
      }
    }
  }

  const results: BenchmarkResult[] = [];
  const skippedConfigs = new Set<string>();

  // Group configs by illnessCases and documentsPerCase so we can reuse generated data
  const configGroups = new Map<string, BenchmarkConfig[]>();
  for (const config of configs) {
    const groupKey = `${config.illnessCases}_${config.documentsPerCase}`;
    if (!configGroups.has(groupKey)) {
      configGroups.set(groupKey, []);
    }
    configGroups.get(groupKey)!.push(config);
  }

  // Process each group (illnessCases + documentsPerCase combination)
  for (const [groupKey, groupConfigs] of configGroups) {
    const [illnessCases, documentsPerCase] = groupKey.split('_').map(Number);

    // Check if any config in this group should be skipped
    let groupSkipped = false;
    for (const config of groupConfigs) {
      const skipKey = `${config.illnessCases}_${config.documentsPerCase}_${config.dataModel}`;

      // Check if any smaller dataset with same config timed out
      for (const smallerCount of ILLNESS_CASE_COUNTS) {
        if (smallerCount >= config.illnessCases) break;
        const smallerKey = `${smallerCount}_${config.documentsPerCase}_${config.dataModel}`;
        if (skippedConfigs.has(smallerKey)) {
          console.log(
            `\nSkipping ${config.illnessCases} cases, ${config.documentsPerCase} docs/case, ${config.dataModel} (smaller dataset timed out)`,
          );
          skippedConfigs.add(skipKey);
          groupSkipped = true;
          break;
        }
      }
    }

    if (groupSkipped && groupConfigs.every(c => skippedConfigs.has(`${c.illnessCases}_${c.documentsPerCase}_${c.dataModel}`))) {
      continue;
    }

    // Run 3 times with different generated data
    for (let run = 0; run < RUNS; run++) {
      console.log(`\n=== Run ${run + 1}/3 for ${illnessCases} cases, ${documentsPerCase} docs/case ===`);

      // Generate data once for this run
      console.log(`  Generating data...`);
      const startGen = Date.now();
      const cases = generateIllnessCases(illnessCases, documentsPerCase);
      const totalDocs = cases.reduce((sum, c) => sum + c.documents.length, 0);
      const genTime = Date.now() - startGen;
      console.log(`  Generated ${totalDocs} documents in ${genTime}ms`);

      // Calculate expected results from in-memory data
      const testData = calculateExpectedResults(cases);
      console.log(`  Expected counts: Q1=${testData.expectedQuery1Count}, Q2=${testData.expectedQuery2Count}, Q3=${testData.expectedQuery3Count}`);

      // Run all 4 data models with the same generated data
      for (const config of groupConfigs) {
        const skipKey = `${config.illnessCases}_${config.documentsPerCase}_${config.dataModel}`;

        if (skippedConfigs.has(skipKey)) {
          console.log(
            `Skipping ${config.dataModel} (previous timeout)`,
          );
          continue;
        }

        try {
          const result = await runBenchmark(sql, config, run, cases, testData);

          if (result) {
            results.push(result);
            await writeResults(results);
            await calculateAverages(results);
          } else {
            console.log(
              `\nTimeout occurred - marking ${config.dataModel} and larger configs for skipping`,
            );
            skippedConfigs.add(skipKey);
          }
        } catch (error) {
          console.error(`Error during benchmark:`, error);
          // Ensure cleanup happens even on error
          try {
            const model = getModelImplementation(config.dataModel);
            await model.cleanup(sql);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          skippedConfigs.add(skipKey);
        }
      }
    }
  }

  console.log("\n=== Benchmark Complete ===");
  console.log(`Total successful runs: ${results.length}`);
  console.log(`Total skipped configurations: ${skippedConfigs.size}`);

  await sql.end();
}

main().catch(console.error);
