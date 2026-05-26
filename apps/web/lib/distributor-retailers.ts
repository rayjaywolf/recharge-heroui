import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, user } from "@repo/db";

import { auth } from "@/lib/auth";

export type DistributorRetailerRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  balance: number;
  isSuspended: boolean;
  isApproved: boolean;
  isRejected: boolean;
  createdAt: string;
  transactionCount: number;
};

export async function requireDistributor() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [distributor] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!distributor || distributor.role !== "DISTRIBUTOR") {
    redirect("/login");
  }

  return distributor;
}

export async function fetchDistributorRetailers(): Promise<DistributorRetailerRow[]> {
  const distributor = await requireDistributor();

  const retailers = await db.query.user.findMany({
    where: eq(user.distributorId, distributor.id),
    columns: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      whatsappNumber: true,
      balance: true,
      isSuspended: true,
      isApproved: true,
      isRejected: true,
      createdAt: true,
    },
    with: {
      transactions: { columns: { id: true } },
    },
    orderBy: desc(user.createdAt),
  });

  return retailers.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phoneNumber: r.phoneNumber,
    whatsappNumber: r.whatsappNumber,
    balance: r.balance,
    isSuspended: r.isSuspended,
    isApproved: r.isApproved,
    isRejected: r.isRejected,
    createdAt: r.createdAt.toISOString(),
    transactionCount: r.transactions.length,
  }));
}

export async function fetchDistributorRetailerById(
  retailerId: string,
): Promise<DistributorRetailerRow | null> {
  const distributor = await requireDistributor();

  const retailer = await db.query.user.findFirst({
    where: eq(user.id, retailerId),
    columns: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      whatsappNumber: true,
      balance: true,
      isSuspended: true,
      isApproved: true,
      isRejected: true,
      createdAt: true,
      distributorId: true,
    },
    with: {
      transactions: { columns: { id: true } },
    },
  });

  if (!retailer || retailer.distributorId !== distributor.id) {
    return null;
  }

  return {
    id: retailer.id,
    name: retailer.name,
    email: retailer.email,
    phoneNumber: retailer.phoneNumber,
    whatsappNumber: retailer.whatsappNumber,
    balance: retailer.balance,
    isSuspended: retailer.isSuspended,
    isApproved: retailer.isApproved,
    isRejected: retailer.isRejected,
    createdAt: retailer.createdAt.toISOString(),
    transactionCount: retailer.transactions.length,
  };
}
