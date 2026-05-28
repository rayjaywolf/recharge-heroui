ALTER TABLE "user"
  ALTER COLUMN "earnings" TYPE numeric(10,2) USING round("earnings"::numeric, 2),
  ALTER COLUMN "earnings" SET DEFAULT 0;

ALTER TABLE "transaction"
  ALTER COLUMN "retailerCommission" TYPE numeric(10,2) USING round("retailerCommission"::numeric, 2),
  ALTER COLUMN "distributorCommission" TYPE numeric(10,2) USING round("distributorCommission"::numeric, 2),
  ALTER COLUMN "adminCommission" TYPE numeric(10,2) USING round("adminCommission"::numeric, 2),
  ALTER COLUMN "retailerCommission" SET DEFAULT 0,
  ALTER COLUMN "distributorCommission" SET DEFAULT 0,
  ALTER COLUMN "adminCommission" SET DEFAULT 0;

ALTER TABLE "commission_rule"
  ALTER COLUMN "providerMargin" TYPE numeric(10,2) USING round("providerMargin"::numeric, 2),
  ALTER COLUMN "adminMargin" TYPE numeric(10,2) USING round("adminMargin"::numeric, 2),
  ALTER COLUMN "distributorMargin" TYPE numeric(10,2) USING round("distributorMargin"::numeric, 2),
  ALTER COLUMN "retailerMargin" TYPE numeric(10,2) USING round("retailerMargin"::numeric, 2),
  ALTER COLUMN "providerMargin" SET DEFAULT 0,
  ALTER COLUMN "adminMargin" SET DEFAULT 0,
  ALTER COLUMN "distributorMargin" SET DEFAULT 0,
  ALTER COLUMN "retailerMargin" SET DEFAULT 0;
