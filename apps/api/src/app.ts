import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppVariables } from "./middleware";

import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { balanceRoutes } from "./routes/balance";
import { distributorRoutes } from "./routes/distributor";
import { rechargeRoutes } from "./routes/recharge";
import { retailerRoutes } from "./routes/retailer";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        process.env.WEB_ORIGIN ?? "http://localhost:3000",
        process.env.BETTER_AUTH_URL,
      ].filter(Boolean) as string[];
      if (!origin) return allowed[0] ?? "http://localhost:3000";
      if (allowed.includes(origin)) return origin;
      return allowed[0] ?? "http://localhost:3000";
    },
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/", authRoutes);
app.route("/", adminRoutes);
app.route("/", balanceRoutes);
app.route("/", distributorRoutes);
app.route("/", rechargeRoutes);
app.route("/", retailerRoutes);

export default app;
