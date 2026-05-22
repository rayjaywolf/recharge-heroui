import { prisma } from "@/lib/auth";

import {
  UsersTable,
  type AdminUserRow,
} from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["RETAILER", "DISTRIBUTOR"] } },
    select: {
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
      distributor: {
        select: { name: true },
      },
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const distributors = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR" },
    select: { id: true, name: true },
  });

  const toRow = (user: (typeof users)[number]): AdminUserRow => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    whatsappNumber: user.whatsappNumber,
    role: user.role,
    balance: user.balance,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt.toISOString(),
    distributorId: user.distributorId,
    distributor: user.distributor,
    _count: user._count,
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
