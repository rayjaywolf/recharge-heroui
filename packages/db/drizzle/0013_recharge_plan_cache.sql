CREATE TABLE IF NOT EXISTS "recharge_plan_cache" (
  "id" text PRIMARY KEY NOT NULL,
  "planapiOperatorCode" text NOT NULL,
  "planapiCircleCode" text NOT NULL,
  "operatorLabel" text NOT NULL,
  "circleLabel" text NOT NULL,
  "payload" text NOT NULL,
  "fetchedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "recharge_plan_cache_operator_circle_key"
  ON "recharge_plan_cache" ("planapiOperatorCode", "planapiCircleCode");
