import { PROVIDER_LABELS, type RechargeProvider } from "@repo/shared/recharge-config";
import {
  getAvailableProviders,
  type LiveProvider,
  validateProviderCredentials,
} from "./env-validation";
import { getMRoboticsBalance } from "./mrobotics";
import { getRealRoboBalance } from "./realrobo";

export type ProviderBalanceStatus = "ok" | "unconfigured" | "error";

export type ProviderBalanceResult = {
  id: RechargeProvider;
  label: string;
  status: ProviderBalanceStatus;
  balance: number | null;
  detail?: string;
};

const DISPLAY_ORDER: RechargeProvider[] = [
  "REALROBO",
  "MROBOTICS",
  "A1TOPUP",
  "TEST",
];

async function fetchA1TopUpBalance(): Promise<number> {
  validateProviderCredentials("A1TOPUP");

  const balanceUrl = new URL("https://business.a1topup.com/recharge/balance");
  balanceUrl.searchParams.append("username", process.env.A1TOPUP_USERNAME || "");
  balanceUrl.searchParams.append("pwd", process.env.A1TOPUP_PASSWORD || "");
  balanceUrl.searchParams.append("format", "json");

  const response = await fetch(balanceUrl.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const textResponse = await response.text();

  let data: unknown;
  try {
    data = JSON.parse(textResponse);
  } catch {
    data = textResponse;
  }

  if (typeof data === "number" && !Number.isNaN(data)) return data;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.balance !== "undefined") {
      const balance = parseFloat(String(record.balance));
      if (!Number.isNaN(balance)) return balance;
    }
    if (typeof record.msg !== "undefined") {
      const fromMsg = parseFloat(String(record.msg));
      if (!Number.isNaN(fromMsg)) return fromMsg;
    }
  }

  const plain = parseFloat(textResponse);
  if (!Number.isNaN(plain)) return plain;

  throw new Error("Could not parse A1TopUp balance response");
}

async function fetchRealRoboBalance(): Promise<number> {
  const response = await getRealRoboBalance();
  if (!response.status) {
    throw new Error(response.msg || "RealRobo balance request failed");
  }
  return response.data.balance;
}

async function fetchMRoboticsBalance(): Promise<number> {
  const response = await getMRoboticsBalance();
  if (response.error) {
    throw new Error("MRobotics balance request failed");
  }
  return Object.values(response.data).reduce(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0
  );
}

async function fetchProviderBalance(
  provider: RechargeProvider
): Promise<ProviderBalanceResult> {
  const label = PROVIDER_LABELS[provider];
  const liveProviders = getAvailableProviders();

  if (provider === "TEST") {
    return {
      id: provider,
      label,
      status: "unconfigured",
      balance: null,
      detail: "Simulated provider",
    };
  }

  if (!liveProviders.includes(provider as LiveProvider)) {
    return {
      id: provider,
      label,
      status: "unconfigured",
      balance: null,
      detail: "Credentials not configured",
    };
  }

  try {
    let balance: number;
    if (provider === "REALROBO") {
      balance = await fetchRealRoboBalance();
    } else if (provider === "MROBOTICS") {
      balance = await fetchMRoboticsBalance();
    } else {
      balance = await fetchA1TopUpBalance();
    }

    return { id: provider, label, status: "ok", balance };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch balance";
    return {
      id: provider,
      label,
      status: "error",
      balance: null,
      detail: message,
    };
  }
}

export async function getAllProviderBalances(): Promise<ProviderBalanceResult[]> {
  return Promise.all(
    DISPLAY_ORDER.map((provider) => fetchProviderBalance(provider))
  );
}

export function formatProviderBalance(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
