import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const migrationsDir = join(__dirname, "../drizzle");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No SQL migrations found.");
    return;
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`Running ${file}...`);
      await client.query(sql);
      console.log(`  OK`);
    }
    console.log("Migrations complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
