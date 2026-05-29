DO $$
BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('RETAILER_PENDING_APPROVAL', 'DISPUTE_PENDING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "notification" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "href" text NOT NULL,
  "entityId" text NOT NULL,
  "readAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "notification"
    ADD CONSTRAINT "notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "notification_userId_idx" ON "notification" ("userId");
CREATE INDEX IF NOT EXISTS "notification_userId_readAt_idx" ON "notification" ("userId", "readAt");
CREATE INDEX IF NOT EXISTS "notification_type_entityId_idx" ON "notification" ("type", "entityId");
