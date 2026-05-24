/** Client-safe recharge provider types and constants (no Prisma/Node deps). */

export type RechargeProviderId = "A1TOPUP" | "REALROBO" | "MROBOTICS" | "TEST";

/** Select value when no backup API is configured for an operator. */
export const BACKUP_NONE = "none";

export const RECHARGE_PROVIDER_IDS: RechargeProviderId[] = [
  "TEST",
  "REALROBO",
  "MROBOTICS",
  "A1TOPUP",
];

export type BackupSlot = 1 | 2;

export type OperatorProviderRouting = {
  primary: RechargeProviderId;
  backup1: RechargeProviderId | null;
  backup2: RechargeProviderId | null;
};

/** Normalize operator keys for consistent lookups (e.g. "airtel" → "AIRTEL"). */
export function normalizeOperatorKey(operator: string): string {
  return operator.trim().toUpperCase();
}

/** Build attempt chain: primary, then backup 1, then backup 2 (skips duplicates). */
export function buildProviderAttemptChain(
  routing: OperatorProviderRouting
): RechargeProviderId[] {
  const chain: RechargeProviderId[] = [routing.primary];
  const seen = new Set<RechargeProviderId>([routing.primary]);

  for (const backup of [routing.backup1, routing.backup2]) {
    if (backup && !seen.has(backup)) {
      chain.push(backup);
      seen.add(backup);
    }
  }

  return chain;
}
