export const RECHARGE_PROVIDERS = [
  "TEST",
  "REALROBO",
  "MROBOTICS",
  "A1TOPUP",
] as const;
export type RechargeProvider = (typeof RECHARGE_PROVIDERS)[number];

/** Real gateways that need env credentials */
export const LIVE_PROVIDERS = ["REALROBO", "MROBOTICS", "A1TOPUP"] as const;
export type LiveRechargeProvider = (typeof LIVE_PROVIDERS)[number];

export type CircleOption = {
  /** Value sent to POST /api/recharge (e.g. DL, MH). Server maps per provider. */
  code: string;
  label: string;
};

const CIRCLE_LABELS: Record<string, string> = {
  AP: "Andhra Pradesh",
  AS: "Assam",
  BR: "Bihar / Jharkhand",
  CG: "Chhattisgarh",
  CH: "Chandigarh",
  CI: "Chennai",
  CN: "Chennai",
  DL: "Delhi / NCR",
  GJ: "Gujarat",
  GB: "Ghaziabad / Noida",
  GOA: "Goa",
  HP: "Himachal Pradesh",
  HR: "Haryana",
  JK: "Jammu & Kashmir",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  KO: "Kolkata",
  MH: "Maharashtra",
  MP: "Madhya Pradesh / Chhattisgarh",
  MU: "Mumbai",
  NE: "North East",
  OR: "Odisha",
  PB: "Punjab",
  RJ: "Rajasthan",
  TN: "Tamil Nadu",
  UPE: "Uttar Pradesh East",
  UPW: "Uttar Pradesh West",
  UP: "Uttar Pradesh West",
  WB: "West Bengal",
};

function circles(codes: string[]): CircleOption[] {
  return codes.map((code) => ({
    code,
    label: CIRCLE_LABELS[code] ?? code,
  }));
}

/** Circles supported by RealRobo (`lib/realrobo.ts` state map). */
const REALROBO_CODES = [
  "AP",
  "AS",
  "BR",
  "CN",
  "DL",
  "GJ",
  "HR",
  "HP",
  "JK",
  "KA",
  "KL",
  "KO",
  "MH",
  "MP",
  "MU",
  "NE",
  "OR",
  "PB",
  "RJ",
  "TN",
  "UPE",
  "UPW",
  "WB",
  "CH",
] as const;

/** Circles supported by MRobotics (`lib/mrobotics.ts` state map). */
const MROBOTICS_CODES = [
  "AP",
  "AS",
  "BR",
  "DL",
  "GJ",
  "HP",
  "HR",
  "JK",
  "KA",
  "KL",
  "KO",
  "MH",
  "MP",
  "MU",
  "NE",
  "OR",
  "PB",
  "RJ",
  "TN",
  "UPE",
  "UPW",
  "WB",
  "GB",
  "CI",
] as const;

/** Circles supported by A1TopUp (`app/api/recharge/route.ts` circle map). */
const A1TOPUP_CODES = [
  "AP",
  "AS",
  "BR",
  "CG",
  "DL",
  "GJ",
  "HR",
  "HP",
  "JK",
  "JH",
  "KA",
  "KL",
  "MH",
  "MP",
  "MU",
  "NE",
  "OR",
  "PB",
  "RJ",
  "TN",
  "UPE",
  "UPW",
  "UP",
  "WB",
  "CN",
  "KO",
] as const;

export const CIRCLES_BY_PROVIDER: Record<RechargeProvider, CircleOption[]> = {
  TEST: circles([...REALROBO_CODES]),
  REALROBO: circles([...REALROBO_CODES]),
  MROBOTICS: circles([...MROBOTICS_CODES]),
  A1TOPUP: circles([...A1TOPUP_CODES]),
};

export const PROVIDER_LABELS: Record<RechargeProvider, string> = {
  TEST: "Test (simulated)",
  REALROBO: "RealRobo",
  MROBOTICS: "MRobotics",
  A1TOPUP: "A1TopUp",
};

export function getClientProviders(liveProviderIds: LiveRechargeProvider[]): {
  id: RechargeProvider;
  label: string;
  default: boolean;
}[] {
  const live = RECHARGE_PROVIDERS.filter((id) =>
    liveProviderIds.includes(id as LiveRechargeProvider)
  );
  const ids: RechargeProvider[] = ["TEST", ...live.filter((id) => id !== "TEST")];
  const defaultId: RechargeProvider =
    live.length > 0 && process.env.DEFAULT_RECHARGE_PROVIDER === "live"
      ? live[0]
      : "TEST";

  return ids.map((id) => ({
    id,
    label: PROVIDER_LABELS[id],
    default: id === defaultId,
  }));
}
