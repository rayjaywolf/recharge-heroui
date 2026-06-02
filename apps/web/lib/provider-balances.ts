import { headers } from "next/headers";

import type { ProviderBalanceResult } from "@repo/server/provider-balances";

function inferOriginFromHeaders(h: Headers): string {
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = h.get("host");
  if (host) {
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function getAllProviderBalances(): Promise<ProviderBalanceResult[]> {
  const h = await headers();
  const origin = inferOriginFromHeaders(h);

  const response = await fetch(`${origin}/api/admin/provider-balances`, {
    cache: "no-store",
    headers: {
      cookie: h.get("cookie") ?? "",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch provider balances.");
  }

  const payload = (await response.json()) as { balances?: ProviderBalanceResult[] };
  return payload.balances ?? [];
}

export type { ProviderBalanceResult } from "@repo/server/provider-balances";
export { formatProviderBalance } from "@repo/server/provider-balances";
