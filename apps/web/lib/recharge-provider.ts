/** Recharge gateway used for a transaction (`Transaction.provider` in Prisma). */
export type RechargeProvider = "A1TOPUP" | "REALROBO" | "MROBOTICS" | "TEST";

const PROVIDER_LABELS: Record<RechargeProvider, string> = {
  A1TOPUP: "A1",
  REALROBO: "Real Robo",
  MROBOTICS: "MRobotics",
  TEST: "Test",
};

export function formatRechargeProvider(provider: string | null | undefined): string {
  if (!provider) return "—";
  return PROVIDER_LABELS[provider as RechargeProvider] ?? provider;
}
