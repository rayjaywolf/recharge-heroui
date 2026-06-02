import type { ProviderBalanceResult } from "@repo/server/provider-balances";
import { serverApiFetch } from "@/lib/server-api";

export async function getAllProviderBalances(): Promise<ProviderBalanceResult[]> {
  const response = await serverApiFetch("/api/admin/provider-balances");

  if (!response.ok) {
    throw new Error("Failed to fetch provider balances.");
  }

  const payload = (await response.json()) as { balances?: ProviderBalanceResult[] };
  return payload.balances ?? [];
}

export type { ProviderBalanceResult } from "@repo/server/provider-balances";
export { formatProviderBalance } from "@repo/server/provider-balances";
