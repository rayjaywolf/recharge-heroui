CREATE TABLE IF NOT EXISTS "retailer_commission_override" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "operator" text NOT NULL,
  "providerMargin" numeric(10, 2) DEFAULT '0' NOT NULL,
  "adminMargin" numeric(10, 2) DEFAULT '0' NOT NULL,
  "distributorMargin" numeric(10, 2) DEFAULT '0' NOT NULL,
  "retailerMargin" numeric(10, 2) DEFAULT '0' NOT NULL,
  "createdAt" timestamp(3) DEFAULT now() NOT NULL,
  "updatedAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "retailer_commission_override_user_operator_key"
  ON "retailer_commission_override" ("userId", "operator");

CREATE INDEX IF NOT EXISTS "retailer_commission_override_userId_idx"
  ON "retailer_commission_override" ("userId");
