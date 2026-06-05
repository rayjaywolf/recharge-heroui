import { and, asc, count, eq, inArray, notInArray, sum } from "drizzle-orm";
import { db, transaction, user, type Role } from "@repo/db";
import { computeUserEarningsMap } from "@repo/server/user-earnings";
import { RECHARGE_EXCLUDED_OPERATORS } from "@/lib/transaction-filters";

export type UserReportRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  balance: number;
  earnings: number;
  accountStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  distributorName: string | null;
  retailerCount: number;
  successCount: number;
  successVolume: number;
  pendingCount: number;
};

const rechargeOperatorFilter = notInArray(
  transaction.operator,
  [...RECHARGE_EXCLUDED_OPERATORS],
);

async function attachRechargeStats(
  users: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    role: string;
    balance: number;
    accountStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
    createdAt: Date;
    distributorName: string | null;
    retailerCount: number;
  }[],
): Promise<UserReportRow[]> {
  if (users.length === 0) return [];

  const ids = users.map((u) => u.id);

  const successGroups = await db
    .select({
      userId: transaction.userId,
      count: count(),
      volume: sum(transaction.amount),
    })
    .from(transaction)
    .where(
      and(
        inArray(transaction.userId, ids),
        eq(transaction.status, "SUCCESS"),
        rechargeOperatorFilter,
      ),
    )
    .groupBy(transaction.userId);

  const pendingGroups = await db
    .select({
      userId: transaction.userId,
      count: count(),
    })
    .from(transaction)
    .where(
      and(
        inArray(transaction.userId, ids),
        eq(transaction.status, "PENDING"),
        rechargeOperatorFilter,
      ),
    )
    .groupBy(transaction.userId);

  const successByUser = new Map(
    successGroups.map((g) => [
      g.userId,
      { count: g.count, volume: Number(g.volume ?? 0) },
    ]),
  );
  const pendingByUser = new Map(
    pendingGroups.map((g) => [g.userId, g.count]),
  );

  const earningsByUser = await computeUserEarningsMap(db);

  return users.map((u) => {
    const success = successByUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber,
      role: u.role,
      balance: u.balance,
      earnings: earningsByUser.get(u.id) ?? 0,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt.toISOString(),
      distributorName: u.distributorName,
      retailerCount: u.retailerCount,
      successCount: success?.count ?? 0,
      successVolume: success?.volume ?? 0,
      pendingCount: pendingByUser.get(u.id) ?? 0,
    };
  });
}

export async function fetchUserReportRows(
  roles: Role | Role[],
): Promise<UserReportRow[]> {
  const roleList = Array.isArray(roles) ? roles : [roles];

  const users = await db.query.user.findMany({
    where: inArray(user.role, roleList),
    columns: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      balance: true,
      accountStatus: true,
      createdAt: true,
    },
    with: {
      distributor: { columns: { name: true } },
      retailers: { columns: { id: true } },
    },
    orderBy: (users, { asc }) => [asc(users.name)],
  });

  const mapped = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phoneNumber: u.phoneNumber,
    role: u.role,
    balance: u.balance,
    accountStatus: u.accountStatus,
    createdAt: u.createdAt,
    distributorName: u.distributor?.name ?? null,
    retailerCount: u.retailers.length,
  }));

  return attachRechargeStats(mapped);
}
