import { eq } from "drizzle-orm";
import {
  commissionRule,
  createId,
  db,
  operatorProviderConfig,
  type Provider,
} from "@repo/db";
import {
  normalizeOperatorKey,
  type OperatorProviderRouting,
  type RechargeProviderId,
} from "@repo/shared/recharge-providers";

export {
  BACKUP_NONE,
  buildProviderAttemptChain,
  normalizeOperatorKey,
  RECHARGE_PROVIDER_IDS,
} from "@repo/shared/recharge-providers";
export type {
  BackupSlot,
  OperatorProviderRouting,
  RechargeProviderId,
} from "@repo/shared/recharge-providers";

export async function resolveProvidersForOperator(
  operator: string,
): Promise<OperatorProviderRouting> {
  const key = normalizeOperatorKey(operator);
  const [config] = await db
    .select()
    .from(operatorProviderConfig)
    .where(eq(operatorProviderConfig.operator, key))
    .limit(1);

  const primary = (config?.provider ?? "REALROBO") as RechargeProviderId;
  const backup1 = config?.backupProvider
    ? (config.backupProvider as RechargeProviderId)
    : null;
  const backup2 = config?.backupProvider2
    ? (config.backupProvider2 as RechargeProviderId)
    : null;

  return { primary, backup1, backup2 };
}

export async function resolveProviderForOperator(
  operator: string,
): Promise<RechargeProviderId> {
  const { primary } = await resolveProvidersForOperator(operator);
  return primary;
}

export async function syncOperatorProviderConfigsFromCommissionRules() {
  const rules = await db
    .select({ operator: commissionRule.operator })
    .from(commissionRule);
  const existing = await db
    .select({ operator: operatorProviderConfig.operator })
    .from(operatorProviderConfig);
  const existingSet = new Set(existing.map((r) => r.operator));

  const missing = rules
    .map((r) => normalizeOperatorKey(r.operator))
    .filter((op) => !existingSet.has(op));

  if (missing.length === 0) return;

  const now = new Date();
  await db.insert(operatorProviderConfig).values(
    missing.map((operator) => ({
      id: createId(),
      operator,
      provider: "REALROBO" as Provider,
      createdAt: now,
      updatedAt: now,
    })),
  ).onConflictDoNothing({ target: operatorProviderConfig.operator });
}
