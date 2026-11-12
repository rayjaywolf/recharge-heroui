import { validateProviderCredentials } from "./env-validation";

/**
 * Robotic Exchange (api.roboticexchange.in) client.
 * Spec: docs/robotic_exchange_api.md. All calls are GET with query params and
 * require the server's outbound IP to be whitelisted (error 18 otherwise).
 */

const BASE_URL = "https://api.roboticexchange.in/Robotics/webservice";

/** Recharge / status response. Keys are upper-cased by `normalizeKeys`. */
export interface RoboticExchangeRechargeResponse {
  ERROR?: string;
  STATUS?: number | string;
  ORDERID?: string | null;
  OPTRANSID?: string | null;
  MEMBERREQID?: string | null;
  MESSAGE?: string | null;
  [key: string]: unknown;
}

export interface RoboticExchangeBalanceResponse {
  Errorcode?: string;
  Status?: number;
  Message?: string;
  BuyerWalletBalance?: number;
  SellerWalletBalance?: number;
}

function credentials() {
  validateProviderCredentials("ROBOTICEXCHANGE");
  return {
    Apimember_id: process.env.ROBOTICEXCHANGE_MEMBER_ID!.trim(),
    Api_password: process.env.ROBOTICEXCHANGE_API_PASSWORD!.trim(),
  };
}

function buildUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries({ ...credentials(), ...params })) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function normalizeKeys(data: unknown): RoboticExchangeRechargeResponse {
  if (!data || typeof data !== "object") return {};
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([k, v]) => [
      k.toUpperCase(),
      v,
    ]),
  );
}

/** Internal operator name → Robotic Exchange operator code. */
export function getRoboticExchangeOperatorCode(operatorName: string): string {
  const n = operatorName.toLowerCase();
  // DTH first so "videocon" / "airtel dth" don't match mobile operators.
  if (n.includes("airtel") && n.includes("dth")) return "AD";
  if (n.includes("dish")) return "DT";
  if (n.includes("tata")) return "TS";
  if (n.includes("videocon") || n.includes("d2h")) return "VD";
  if (n.includes("sun")) return "SD";
  if (n.includes("myjio")) return "MJ";
  if (n.includes("airtel") && !n.includes("money")) return "AT";
  if (n.includes("jio") || n.includes("reliance")) return "JO";
  if (n.includes("bsnl")) return "BS";
  if (n.includes("vodafone") || n.includes("idea") || /\bvi\b/.test(n)) {
    return "VI";
  }
  throw new Error(`Unsupported operator for Robotic Exchange: ${operatorName}`);
}

/** App circle code (DL, MH, …) → Robotic Exchange circle code. */
const CIRCLE_MAP: Record<string, string> = {
  AP: "49",
  AS: "56",
  BR: "52",
  CG: "22",
  CH: "02",
  CI: "40",
  CN: "40",
  DL: "10",
  GB: "97",
  GJ: "98",
  GOA: "90",
  HP: "03",
  HR: "96",
  JH: "20",
  JK: "55",
  KA: "06",
  KL: "95",
  KO: "31",
  MH: "90",
  MP: "93",
  MU: "92",
  NE: "16",
  OR: "53",
  PB: "02",
  RJ: "70",
  TN: "94",
  UP: "54",
  UPE: "54",
  UPW: "97",
  WB: "51",
};

/** App circle codes that map to a Robotic Exchange circle. */
export const ROBOTICEXCHANGE_CIRCLE_CODES = Object.keys(CIRCLE_MAP);

export function getRoboticExchangeCircleCode(
  circleCode: string | undefined,
): string {
  if (!circleCode) return "50"; // "All"
  const normalized = circleCode.toUpperCase().trim();
  if (/^\d{2}$/.test(normalized)) return normalized;
  return CIRCLE_MAP[normalized] ?? "50";
}

/**
 * Submit a recharge. Never throws on network/timeout/bad-JSON errors: the
 * request may have reached Robotic Exchange, so it returns a PENDING-shaped
 * response for status reconciliation instead of letting a backup provider
 * recharge the same number again.
 */
export async function performRoboticExchangeRecharge(
  phone: string,
  operatorName: string,
  amount: number,
  circleCode: string | undefined,
  transactionId: string,
): Promise<RoboticExchangeRechargeResponse> {
  const url = buildUrl("GetMobileRecharge", {
    Mobile_no: phone,
    Operator_code: getRoboticExchangeOperatorCode(operatorName),
    Amount: String(amount),
    Member_request_txnid: transactionId,
    Circle: getRoboticExchangeCircleCode(circleCode),
  });

  let text = "";
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(60000),
    });
    text = await response.text();
    return normalizeKeys(JSON.parse(text));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[ROBOTICEXCHANGE] recharge request failed:", detail, text);
    return {
      STATUS: 2,
      MEMBERREQID: transactionId,
      MESSAGE: `Robotic Exchange request did not return a result (${detail}). Left pending for status reconciliation.`,
    };
  }
}

export async function checkRoboticExchangeStatus(
  transactionId: string,
): Promise<RoboticExchangeRechargeResponse> {
  const url = buildUrl("GetStatus", { Member_request_txnid: transactionId });
  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  try {
    return normalizeKeys(JSON.parse(text));
  } catch {
    throw new Error(`Invalid JSON response from Robotic Exchange status: ${text}`);
  }
}

export async function getRoboticExchangeBalance(): Promise<RoboticExchangeBalanceResponse> {
  const url = buildUrl("GetWalletBalance", {});
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as RoboticExchangeBalanceResponse;
  } catch {
    throw new Error(`Invalid JSON response from Robotic Exchange balance: ${text}`);
  }
}

/** Error codes that mean "request exists / in progress", not a hard failure. */
const NON_FINAL_ERRORS = new Set(["16", "26", "27", "30"]);

export type RoboticExchangeParsedStatus = "SUCCESS" | "FAILED" | "PENDING";

export function classifyRoboticExchangeResponse(
  response: RoboticExchangeRechargeResponse,
): RoboticExchangeParsedStatus {
  const status = Number(response.STATUS);
  const error = String(response.ERROR ?? "").trim();
  if (status === 1) return "SUCCESS";
  if (status === 3 && !NON_FINAL_ERRORS.has(error)) return "FAILED";
  return "PENDING";
}
