DO $$
BEGIN
  CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'isSuspended'
  ) THEN
    UPDATE "user"
    SET "accountStatus" = CASE
      WHEN "isSuspended" = true THEN 'SUSPENDED'::"AccountStatus"
      WHEN "isRejected" = true THEN 'REJECTED'::"AccountStatus"
      WHEN "isApproved" = true THEN 'APPROVED'::"AccountStatus"
      ELSE 'PENDING'::"AccountStatus"
    END
    WHERE "accountStatus" IS NULL;
  ELSE
    UPDATE "user"
    SET "accountStatus" = COALESCE("accountStatus", 'PENDING'::"AccountStatus")
    WHERE "accountStatus" IS NULL;
  END IF;
END $$;

ALTER TABLE "user"
  ALTER COLUMN "accountStatus" SET DEFAULT 'PENDING'::"AccountStatus",
  ALTER COLUMN "accountStatus" SET NOT NULL;

ALTER TABLE "user"
  DROP COLUMN IF EXISTS "isSuspended",
  DROP COLUMN IF EXISTS "isApproved",
  DROP COLUMN IF EXISTS "isRejected";
