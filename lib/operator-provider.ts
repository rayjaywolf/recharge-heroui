import type { Provider } from "@/generated/prisma/client";
import { prisma } from "@/lib/auth";
import {
  normalizeOperatorKey,
  type OperatorProviderRouting,
  type RechargeProviderId,
} from "@/lib/recharge-providers";

export {
  BACKUP_NONE,
  buildProviderAttemptChain,
  normalizeOperatorKey,
  RECHARGE_PROVIDER_IDS,
} from "@/lib/recharge-providers";
export type {
  BackupSlot,
  OperatorProviderRouting,
  RechargeProviderId,
} from "@/lib/recharge-providers";

export async function resolveProvidersForOperator(
  operator: string
): Promise<OperatorProviderRouting> {
  const key = normalizeOperatorKey(operator);
  const config = await prisma.operatorProviderConfig.findUnique({
    where: { operator: key },
  });

  const primary = (config?.provider ?? "REALROBO") as RechargeProviderId;
  const backup1 = config?.backupProvider
    ? (config.backupProvider as RechargeProviderId)
    : null;
  const backup2 = config?.backupProvider2
    ? (config.backupProvider2 as RechargeProviderId)
    : null;

  return { primary, backup1, backup2 };
}

/** @deprecated Use resolveProvidersForOperator */
export async function resolveProviderForOperator(
  operator: string
): Promise<RechargeProviderId> {
  const { primary } = await resolveProvidersForOperator(operator);
  return primary;
}

/** Ensure every commission-rule operator has a routing row (defaults to REALROBO). */
export async function syncOperatorProviderConfigsFromCommissionRules() {
  const rules = await prisma.commissionRule.findMany({
    select: { operator: true },
  });
  const existing = await prisma.operatorProviderConfig.findMany({
    select: { operator: true },
  });
  const existingSet = new Set(existing.map((r) => r.operator));

  const missing = rules
    .map((r) => normalizeOperatorKey(r.operator))
    .filter((op) => !existingSet.has(op));

  if (missing.length === 0) return;

  await prisma.operatorProviderConfig.createMany({
    data: missing.map((operator) => ({
      operator,
      provider: "REALROBO" satisfies Provider,
    })),
    skipDuplicates: true,
  });
}
