-- AlterTable
ALTER TABLE "user" ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "phoneNumberVerified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill login phone from WhatsApp for existing users
UPDATE "user"
SET "phoneNumber" = right(regexp_replace("whatsappNumber", '\D', '', 'g'), 10),
    "phoneNumberVerified" = true
WHERE "whatsappNumber" IS NOT NULL
  AND "phoneNumber" IS NULL
  AND length(regexp_replace("whatsappNumber", '\D', '', 'g')) >= 10;

-- UniqueIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");
