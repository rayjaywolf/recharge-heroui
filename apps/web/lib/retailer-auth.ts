import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, user } from "@repo/db";

import { auth } from "@/lib/auth";

export async function requireRetailer() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const [retailer] = await db
    .select({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      balance: user.balance,
      distributorId: user.distributorId,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      isApproved: user.isApproved,
      isSuspended: user.isSuspended,
      isRejected: user.isRejected,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!retailer || retailer.role !== "RETAILER") {
    redirect("/login");
  }

  return retailer;
}
