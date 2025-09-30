import { faker } from "@faker-js/faker";
import type { IllnessCase, Document } from "./types";

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return Math.max(1, Math.round(mean + z0 * stdDev));
}

export function generateIllnessCases(
  count: number,
  docsPerCase: number,
): IllnessCase[] {
  const cases: IllnessCase[] = [];

  for (let i = 0; i < count; i++) {
    const illnessCaseId = faker.string.uuid();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const tenantId = faker.string.uuid();

    const numDocs = gaussianRandom(docsPerCase, docsPerCase * 0.2);
    const documents: Document[] = [];

    for (let j = 0; j < numDocs; j++) {
      documents.push({
        documentId: faker.string.uuid(),
        createdBy: faker.internet.email(),
        createdAt: faker.date.past({ years: 2 }),
        firstName,
        lastName,
        illnessCaseId,
        tenantId,
        publishedAt: faker.date.past({ years: 1 }),
      });
    }

    cases.push({
      illnessCaseId,
      firstName,
      lastName,
      tenantId,
      documents,
    });
  }

  return cases;
}
