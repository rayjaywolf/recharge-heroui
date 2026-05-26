import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, user } from "@repo/db";

import { auth } from "@/lib/auth";
import { getDashboardPath } from "@/lib/dashboard-path";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    const [found] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (found) {
      redirect(getDashboardPath(found.role));
    }
  }

  return <LoginForm />;
}
