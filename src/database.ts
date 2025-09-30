import postgres from "postgres";

export function createConnection() {
  return postgres({
    host: "localhost",
    port: 5432,
    database: "benchdb",
    username: "benchuser",
    password: "benchpass",
    max: 20,
    onnotice: () => {}, // Suppress NOTICE messages
  });
}
