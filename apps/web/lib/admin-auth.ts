import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, user } from "@repo/db";

import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [admin] = await db
    .select({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      balance: user.balance,
      accountStatus: user.accountStatus,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!admin || admin.role !== "ADMIN") {
    redirect("/login");
  }

  return admin;
}
