import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../..");

for (const envPath of [
  join(repoRoot, "apps/api/.env"),
  join(repoRoot, "apps/web/.env.local"),
  join(repoRoot, ".env"),
  join(__dirname, ".env"),
]) {
  if (!existsSync(envPath)) continue;
  config({ path: envPath });
  if (process.env.DATABASE_URL) break;
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

