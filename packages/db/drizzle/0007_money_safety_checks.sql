DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_balance_non_negative_check'
  ) THEN
    ALTER TABLE "user"
      ADD CONSTRAINT user_balance_non_negative_check CHECK ("balance" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transaction_amount_positive_check'
  ) THEN
    ALTER TABLE "transaction"
      ADD CONSTRAINT transaction_amount_positive_check CHECK ("amount" > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fund_request_amount_positive_check'
  ) THEN
    ALTER TABLE "fund_request"
      ADD CONSTRAINT fund_request_amount_positive_check CHECK ("amount" > 0);
  END IF;
END $$;
