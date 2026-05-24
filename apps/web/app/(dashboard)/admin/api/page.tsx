import { asc } from "drizzle-orm";
import { db, operatorProviderConfig } from "@repo/db";

import { ProviderBalancesCard } from "@/components/admin/provider-balances-card";
import {
  OperatorProvidersTable,
  type OperatorProviderRow,
} from "@/components/admin/operator-providers-table";
import { syncOperatorProviderConfigsFromCommissionRules } from "@/lib/operator-provider";
import { getAllProviderBalances } from "@/lib/provider-balances";

export default async function AdminApiPage() {
  await syncOperatorProviderConfigsFromCommissionRules();

  const providerBalances = await getAllProviderBalances();

  const configs = await db
    .select()
    .from(operatorProviderConfig)
    .orderBy(asc(operatorProviderConfig.operator));

  const rows: OperatorProviderRow[] = configs.map((c) => ({
    id: c.id,
    operator: c.operator,
    provider: c.provider,
    backupProvider: c.backupProvider,
    backupProvider2: c.backupProvider2,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          API
        </h1>
        <p className="mt-1 text-sm text-muted">
          Set primary and up to two backup recharge gateways per operator. If the
          primary API fails, the system retries backup 1, then backup 2.
        </p>
      </div>

      <ProviderBalancesCard balances={providerBalances} />

      <OperatorProvidersTable initialRows={rows} />
    </div>
  );
}
