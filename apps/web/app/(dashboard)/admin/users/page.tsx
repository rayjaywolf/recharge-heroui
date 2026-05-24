import { desc, eq, inArray } from "drizzle-orm";
import { db, user } from "@repo/db";

import {
  UsersTable,
  type AdminUserRow,
} from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const users = await db.query.user.findMany({
    where: inArray(user.role, ["RETAILER", "DISTRIBUTOR"]),
    columns: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      whatsappNumber: true,
      role: true,
      balance: true,
      isSuspended: true,
      createdAt: true,
      distributorId: true,
    },
    with: {
      distributor: { columns: { name: true } },
      transactions: { columns: { id: true } },
    },
    orderBy: desc(user.createdAt),
  });

  const distributors = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.role, "DISTRIBUTOR"));

  const toRow = (u: (typeof users)[number]): AdminUserRow => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phoneNumber: u.phoneNumber,
    whatsappNumber: u.whatsappNumber,
    role: u.role,
    balance: u.balance,
    isSuspended: u.isSuspended,
    createdAt: u.createdAt.toISOString(),
    distributorId: u.distributorId,
    distributor: u.distributor,
    _count: { transactions: u.transactions.length },
  });

  const distributorsData = users
    .filter((u) => u.role === "DISTRIBUTOR")
    .map(toRow);
  const retailersData = users.filter((u) => u.role === "RETAILER").map(toRow);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Users
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage user accounts and hierarchy configurations.
        </p>
      </div>

      <div className="space-y-12">
        <UsersTable
          distributors={distributors}
          hideDistributorCol
          initialData={distributorsData}
          title="Distributors"
        />
        <UsersTable
          distributors={distributors}
          initialData={retailersData}
          title="Retailers"
        />
      </div>
    </div>
  );
}
