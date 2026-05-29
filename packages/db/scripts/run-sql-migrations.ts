import { config } from "dotenv";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
for (const envPath of [
  join(repoRoot, "apps/api/.env"),
  join(repoRoot, "apps/web/.env.local"),
  join(repoRoot, ".env"),
]) {
  if (!existsSync(envPath)) continue;
  config({ path: envPath });
  if (process.env.DATABASE_URL) break;
}

const migrationsDir = join(__dirname, "../drizzle");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to apps/api/.env or run: pnpm --filter @repo/db db:migrate",
    );
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
