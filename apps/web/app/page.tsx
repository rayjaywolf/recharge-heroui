import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, user } from "@repo/db";

import { ButtonLink } from "@/components/button-link";
import { auth } from "@/lib/auth";
import { getDashboardPath } from "@/lib/dashboard-path";

export default async function HomePage() {
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

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="flex flex-col justify-between bg-accent p-8 lg:p-12">
        <div>
          <p className="text-sm font-medium text-accent-foreground/80">
            RechargePro
          </p>
          <h1 className="mt-6 max-w-md text-3xl font-semibold leading-tight tracking-tight text-accent-foreground sm:text-4xl">
            Mobile recharge for retailers.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-accent-foreground/75">
            Manage wallet balance, process recharges, and track commissions from
            one dashboard.
          </p>
        </div>
        <p className="mt-10 text-xs text-accent-foreground/50 lg:mt-0">
          Admin and distributor accounts use the same sign-in.
        </p>
      </aside>

      <main className="flex flex-col justify-center gap-8 px-6 py-12 sm:px-12 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Get started</h2>
          <p className="mt-2 text-sm text-muted">
            Sign in to your account or apply as a new retailer.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <ButtonLink fullWidth href="/login" variant="primary">
              Sign in
            </ButtonLink>
            <ButtonLink fullWidth href="/register" variant="secondary">
              Apply as retailer
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
