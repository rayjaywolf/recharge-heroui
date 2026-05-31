-- Allow only one open (PENDING) dispute per transaction.
-- Resolving updates the same row; a second PENDING after RESOLVED was blocked on resolve
-- by the old (transactionId, status) unique index.

DROP INDEX IF EXISTS "dispute_transactionId_status_key";

CREATE UNIQUE INDEX IF NOT EXISTS "dispute_transactionId_pending_key"
  ON "dispute" ("transactionId")
  WHERE status = 'PENDING';
