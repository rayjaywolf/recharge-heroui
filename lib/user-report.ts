import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/auth";
import { RECHARGE_EXCLUDED_OPERATORS } from "@/lib/transaction-filters";

export type UserReportRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  balance: number;
  earnings: number;
  isSuspended: boolean;
  createdAt: string;
  distributorName: string | null;
  retailerCount: number;
  successCount: number;
  successVolume: number;
  pendingCount: number;
};

const rechargeWhere = {
  operator: { notIn: [...RECHARGE_EXCLUDED_OPERATORS] },
} as const;

async function attachRechargeStats(
  users: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    role: string;
    balance: number;
    earnings: number;
    isSuspended: boolean;
    createdAt: Date;
    distributor: { name: string } | null;
    _count: { retailers: number };
  }[]
): Promise<UserReportRow[]> {
  if (users.length === 0) return [];

  const ids = users.map((u) => u.id);

  const [successGroups, pendingGroups] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["userId"],
      where: {
        userId: { in: ids },
        status: "SUCCESS",
        ...rechargeWhere,
      },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["userId"],
      where: {
        userId: { in: ids },
        status: "PENDING",
        ...rechargeWhere,
      },
      _count: { _all: true },
    }),
  ]);

  const successByUser = new Map(
    successGroups.map((g) => [
      g.userId,
      { count: g._count._all, volume: g._sum.amount ?? 0 },
    ])
  );
  const pendingByUser = new Map(
    pendingGroups.map((g) => [g.userId, g._count._all])
  );

  return users.map((user) => {
    const success = successByUser.get(user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      balance: user.balance,
      earnings: user.earnings,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt.toISOString(),
      distributorName: user.distributor?.name ?? null,
      retailerCount: user._count.retailers,
      successCount: success?.count ?? 0,
      successVolume: success?.volume ?? 0,
      pendingCount: pendingByUser.get(user.id) ?? 0,
    };
  });
}

export async function fetchUserReportRows(
  roles: Role | Role[]
): Promise<UserReportRow[]> {
  const roleList = Array.isArray(roles) ? roles : [roles];

  const users = await prisma.user.findMany({
    where: { role: { in: roleList } },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      balance: true,
      earnings: true,
      isSuspended: true,
      createdAt: true,
      distributor: { select: { name: true } },
      _count: { select: { retailers: true } },
    },
    orderBy: { name: "asc" },
  });

  return attachRechargeStats(users);
}
