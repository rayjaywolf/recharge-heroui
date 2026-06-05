-- Phone-only accounts use phoneNumber for sign-in; email is optional.
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;

UPDATE "user"
SET "email" = NULL
WHERE "email" LIKE '%@phone.rechargepro.local';
