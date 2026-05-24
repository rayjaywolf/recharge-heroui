import { auth, prisma } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DistributorFundsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== "DISTRIBUTOR") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funds</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your master wallet capabilities.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distributor Funding</CardTitle>
          <CardDescription>
            Contact your Administrator to load balance directly into your mastering distributor wallet so you can subsequently pass down the balances across your retail network.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground font-semibold">
            Your current available tier-wallet balance is <span className="text-emerald-600 text-lg">₹{user.balance.toLocaleString()}</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
