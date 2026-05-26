import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Must run before any import that pulls in @repo/db (ESM hoists static imports).
const apiRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const loaded = config({ path: resolve(apiRoot, ".env") });
if (loaded.error) {
  console.warn(`Could not load ${resolve(apiRoot, ".env")}:`, loaded.error.message);
}

const { serve } = await import("@hono/node-server");
const { default: app } = await import("./app");

const port = Number(process.env.PORT ?? 3001);

console.log(`API server listening on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
