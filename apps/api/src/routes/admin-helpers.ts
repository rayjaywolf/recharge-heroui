import type { Provider } from "@repo/db";
import {
  BACKUP_NONE,
  RECHARGE_PROVIDER_IDS,
  normalizeOperatorKey,
  type BackupSlot,
  type RechargeProviderId,
} from "@repo/server/operator-provider";

export { BACKUP_NONE, normalizeOperatorKey };
export type { BackupSlot };

export function assertProvider(provider: string): RechargeProviderId {
  if (!RECHARGE_PROVIDER_IDS.includes(provider as RechargeProviderId)) {
    throw new Error("Invalid provider");
  }
  return provider as RechargeProviderId;
}

export function parseBackupValue(backup: string): Provider | null {
  return backup === BACKUP_NONE ? null : (assertProvider(backup) as Provider);
}
