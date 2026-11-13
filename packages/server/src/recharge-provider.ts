/** Recharge gateway used for a transaction (`Transaction.provider` in Prisma). */
export type RechargeProvider =
  | "A1TOPUP"
  | "REALROBO"
  | "JIOPOSLITE"
  | "MROBOTICS"
  | "ROBOTICEXCHANGE"
  | "TEST";

const PROVIDER_LABELS: Record<RechargeProvider, string> = {
  A1TOPUP: "A1",
  REALROBO: "Real Robo",
  JIOPOSLITE: "Jio Pos Lite",
  MROBOTICS: "MRobotics",
  ROBOTICEXCHANGE: "Robotic Exchange",
  TEST: "Test",
};

export function formatRechargeProvider(provider: string | null | undefined): string {
  if (!provider) return "—";
  return PROVIDER_LABELS[provider as RechargeProvider] ?? provider;
}
