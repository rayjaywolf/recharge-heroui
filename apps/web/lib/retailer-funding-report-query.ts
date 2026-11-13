import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, transaction, user } from "@repo/db";
import type {
  RetailerFundingReportRow,
  RetailerOption,
} from "./retailer-funding-report";

export async function fetchRetailerFundingReportData(): Promise<{
  rows: RetailerFundingReportRow[];
  retailers: RetailerOption[];
}> {
  const distributorUser = alias(user, "distributor_user");

  const [retailersList, rowsRaw] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        storeName: user.storeName,
        phoneNumber: user.phoneNumber,
      })
      .from(user)
      .where(eq(user.role, "RETAILER"))
      .orderBy(asc(user.name)),

    db
      .select({
        id: transaction.id,
        createdAt: transaction.createdAt,
        amount: transaction.amount,
        operator: transaction.operator,
        status: transaction.status,
        apiMessage: transaction.apiMessage,
        openingBalance: transaction.openingBalance,
        closingBalance: transaction.closingBalance,
        retailerId: user.id,
        retailerName: user.name,
        retailerStoreName: user.storeName,
        retailerEmail: user.email,
        retailerPhoneNumber: user.phoneNumber,
        distributorId: distributorUser.id,
        distributorName: distributorUser.name,
        distributorStoreName: distributorUser.storeName,
      })
      .from(transaction)
      .innerJoin(user, eq(transaction.userId, user.id))
      .leftJoin(distributorUser, eq(user.distributorId, distributorUser.id))
      .where(
        and(
          eq(user.role, "RETAILER"),
          inArray(transaction.operator, ["MANUAL_CREDIT", "FUNDS_RECEIVED"]),
          eq(transaction.status, "SUCCESS"),
        ),
      )
      .orderBy(desc(transaction.createdAt)),
  ]);

  const rows: RetailerFundingReportRow[] = rowsRaw.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    amount: r.amount,
    operator: r.operator,
    status: r.status,
    apiMessage: r.apiMessage,
    openingBalance: r.openingBalance,
    closingBalance: r.closingBalance,
    retailerId: r.retailerId,
    retailerName: r.retailerName,
    retailerStoreName: r.retailerStoreName,
    retailerEmail: r.retailerEmail,
    retailerPhoneNumber: r.retailerPhoneNumber,
    distributorId: r.distributorId,
    distributorName: r.distributorName,
    distributorStoreName: r.distributorStoreName,
  }));

  const retailers: RetailerOption[] = retailersList.sort((a, b) => {
    const labelA = a.storeName || a.name;
    const labelB = b.storeName || b.name;
    return labelA.localeCompare(labelB);
  });

  return { rows, retailers };
}
