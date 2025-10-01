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
        // Core tags (always present)
        firstName,
        lastName,
        illnessCaseId,
        tenantId,
        publishedAt: faker.date.past({ years: 1 }),
        // Optional tags (70% chance of being present)
        email: Math.random() > 0.3 ? faker.internet.email() : undefined,
        phoneNumber: Math.random() > 0.3 ? faker.phone.number() : undefined,
        address: Math.random() > 0.3 ? faker.location.streetAddress() : undefined,
        city: Math.random() > 0.3 ? faker.location.city() : undefined,
        country: Math.random() > 0.3 ? faker.location.country() : undefined,
        zipCode: Math.random() > 0.3 ? faker.location.zipCode() : undefined,
        diagnosis: Math.random() > 0.3 ? faker.helpers.arrayElement(['COVID-19', 'Flu', 'Pneumonia', 'Bronchitis', 'Asthma']) : undefined,
        severity: Math.random() > 0.3 ? faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']) : undefined,
        status: Math.random() > 0.3 ? faker.helpers.arrayElement(['New', 'In Progress', 'Completed', 'Closed']) : undefined,
        assignedTo: Math.random() > 0.3 ? faker.internet.email() : undefined,
        department: Math.random() > 0.3 ? faker.helpers.arrayElement(['Emergency', 'ICU', 'Surgery', 'Cardiology', 'Neurology']) : undefined,
        priority: Math.random() > 0.3 ? faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Urgent']) : undefined,
        category: Math.random() > 0.3 ? faker.helpers.arrayElement(['Medical', 'Administrative', 'Billing', 'Insurance']) : undefined,
        subcategory: Math.random() > 0.3 ? faker.helpers.arrayElement(['Type A', 'Type B', 'Type C', 'Type D']) : undefined,
        notes: Math.random() > 0.3 ? faker.lorem.sentence() : undefined,
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
