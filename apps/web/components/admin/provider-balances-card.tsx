import { Wallet } from "lucide-react";
import { Card } from "@heroui/react";

import {
  formatProviderBalance,
  type ProviderBalanceResult,
} from "@/lib/provider-balances";

function balanceValue(item: ProviderBalanceResult): string {
  if (item.status === "ok" && item.balance != null) {
    return formatProviderBalance(item.balance);
  }
  if (item.status === "unconfigured") {
    return "—";
  }
  return "Unavailable";
}

export function ProviderBalancesCard({
  balances,
}: {
  balances: ProviderBalanceResult[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          API wallet balances
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {balances.map((item) => (
          <Card key={item.id} variant="default">
            <Card.Header className="flex flex-row items-center justify-between gap-2 pb-0">
              <Card.Title className="text-sm font-medium text-muted">
                {item.label}
              </Card.Title>
              <Wallet className="size-4 shrink-0 text-muted" aria-hidden />
            </Card.Header>
            <Card.Content className="pt-2">
              <p
                className={`text-2xl font-semibold tracking-tight ${
                  item.status === "error" ? "text-danger" : "text-foreground"
                }`}
              >
                {balanceValue(item)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {item.status === "ok"
                  ? "Available balance"
                  : (item.detail ?? "—")}
              </p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
