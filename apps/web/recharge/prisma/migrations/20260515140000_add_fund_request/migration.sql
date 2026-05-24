-- CreateEnum
CREATE TYPE "FundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "fund_request" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "remarks" TEXT,
    "status" "FundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fund_request_retailerId_idx" ON "fund_request"("retailerId");
CREATE INDEX "fund_request_distributorId_idx" ON "fund_request"("distributorId");
CREATE INDEX "fund_request_status_idx" ON "fund_request"("status");

-- AddForeignKey
ALTER TABLE "fund_request" ADD CONSTRAINT "fund_request_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fund_request" ADD CONSTRAINT "fund_request_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
