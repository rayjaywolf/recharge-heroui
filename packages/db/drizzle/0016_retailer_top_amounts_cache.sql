CREATE TABLE IF NOT EXISTS "retailer_top_amounts_cache" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "operator" text NOT NULL,
  "amounts" text NOT NULL,
  "fetchedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "retailer_top_amounts_cache_user_operator_key"
  ON "retailer_top_amounts_cache" ("userId", "operator");
