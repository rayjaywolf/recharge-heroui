DO $$
BEGIN
  CREATE TYPE "DisputeStatus" AS ENUM ('PENDING', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "dispute" (
  "id" text PRIMARY KEY NOT NULL,
  "distributorId" text NOT NULL,
  "transactionId" text NOT NULL,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" text,
  "resolvedBy" text,
  "resolvedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "dispute"
    ADD CONSTRAINT "dispute_distributorId_fkey"
    FOREIGN KEY ("distributorId") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "dispute"
    ADD CONSTRAINT "dispute_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "dispute"
    ADD CONSTRAINT "dispute_resolvedBy_fkey"
    FOREIGN KEY ("resolvedBy") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "dispute_distributorId_idx" ON "dispute" ("distributorId");
CREATE INDEX IF NOT EXISTS "dispute_transactionId_idx" ON "dispute" ("transactionId");
CREATE INDEX IF NOT EXISTS "dispute_status_idx" ON "dispute" ("status");
CREATE INDEX IF NOT EXISTS "dispute_resolvedBy_idx" ON "dispute" ("resolvedBy");
CREATE UNIQUE INDEX IF NOT EXISTS "dispute_transactionId_status_key"
  ON "dispute" ("transactionId", "status");
