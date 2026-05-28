import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: path.resolve(import.meta.dirname, "apps/api/.env") });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "apps/web"),
      "@repo/db": path.resolve(import.meta.dirname, "packages/db/src/index.ts"),
      "@repo/server/recharge-gateway": path.resolve(
        import.meta.dirname,
        "packages/server/src/recharge-gateway.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
