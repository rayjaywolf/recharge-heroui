CREATE TABLE IF NOT EXISTS "operator_lookup_cache" (
  "id" text PRIMARY KEY NOT NULL,
  "phone" text NOT NULL,
  "payload" text NOT NULL,
  "fetchedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "operator_lookup_cache_phone_key"
  ON "operator_lookup_cache" ("phone");
