import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppVariables } from "./middleware";

import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { balanceRoutes } from "./routes/balance";
import { distributorRoutes } from "./routes/distributor";
import { rechargeRoutes } from "./routes/recharge";
import { notificationRoutes } from "./routes/notifications";
import { retailerRoutes } from "./routes/retailer";

function parseOriginList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Origins allowed for browser clients (web dashboard, Flutter web). Native apps skip CORS. */
function getAllowedCorsOrigins(): string[] {
  return [
    process.env.WEB_ORIGIN ?? "http://localhost:3000",
    process.env.BETTER_AUTH_URL,
    ...parseOriginList(process.env.CORS_ORIGINS),
    // Common local dev targets for the retailer mobile app
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://10.0.2.2:3001",
  ]
    .map((origin) => origin?.replace(/\/$/, ""))
    .filter((origin): origin is string => Boolean(origin))
    .filter((origin, index, list) => list.indexOf(origin) === index);
}

const allowedCorsOrigins = getAllowedCorsOrigins();
const defaultCorsOrigin =
  allowedCorsOrigins[0] ?? "http://localhost:3000";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return defaultCorsOrigin;
      const normalized = origin.replace(/\/$/, "");
      if (allowedCorsOrigins.includes(normalized)) return normalized;
      return defaultCorsOrigin;
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
app.route("/", notificationRoutes);

export default app;
