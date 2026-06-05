import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: path.resolve(import.meta.dirname, "apps/api/.env") });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "apps/web"),
      "@repo/db": path.resolve(import.meta.dirname, "packages/db/src/index.ts"),
      "@repo/server/a1topup": path.resolve(
        import.meta.dirname,
        "packages/server/src/a1topup.ts",
      ),
      "@repo/server/recharge-gateway": path.resolve(
        import.meta.dirname,
        "packages/server/src/recharge-gateway.ts",
      ),
      "@repo/server/retailer-registration": path.resolve(
        import.meta.dirname,
        "packages/server/src/retailer-registration.ts",
      ),
      "@repo/shared/email": path.resolve(
        import.meta.dirname,
        "packages/shared/src/email.ts",
      ),
      "@repo/shared/phone": path.resolve(
        import.meta.dirname,
        "packages/shared/src/phone.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
