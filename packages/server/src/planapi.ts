import { createHmac } from "node:crypto";
import {
  mapPlanapiCircleCode,
  mapPlanapiOperatorKey,
  matchConfiguredCircle,
  matchConfiguredOperator,
} from "@repo/shared/planapi-mapping";
import type { CircleOption } from "@repo/shared/recharge-config";
import { normalizePhoneNumber, validatePhoneNumber } from "@repo/shared/phone";

export type PlanapiOperatorLookupResult = {
  operator: string;
  circleCode: string | null;
  circleLabel: string | null;
  planapi: {
    operator: string;
    opCode: string;
    circle: string;
    circleCode: string;
    message: string;
  };
};

export type PlanapiRawResponse = {
  ERROR?: string;
  STATUS?: string;
  Mobile?: string;
  Operator?: string;
  OpCode?: string | null;
  Circle?: string;
  CircleCode?: string | null;
  Message?: string;
};

export function isPlanapiConfigured(): boolean {
  return Boolean(
    process.env.PLANAPI_USER_ID?.trim() &&
      process.env.PLANAPI_API_PASSWORD?.trim(),
  );
}

export async function fetchPlanapiOperatorLookup(
  phone: string,
): Promise<PlanapiRawResponse> {
  const userId = process.env.PLANAPI_USER_ID?.trim();
  const password = process.env.PLANAPI_API_PASSWORD?.trim();
  if (!userId || !password) {
    throw new Error("Planapi credentials are not configured.");
  }

  const url = new URL("https://planapi.in/api/Mobile/OperatorFetchNew");
  url.searchParams.set("ApiUserID", userId);
  url.searchParams.set("ApiPassword", password);
  url.searchParams.set("Mobileno", phone);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Planapi request failed (${response.status}).`);
  }

  const data = (await response.json()) as PlanapiRawResponse;
  return data;
}

export function resolveOperatorLookupFromPlanapi(params: {
  planapi: PlanapiRawResponse;
  configuredOperators: string[];
  circlesForOperator: CircleOption[];
}): PlanapiOperatorLookupResult | null {
  const errorCode = String(params.planapi.ERROR ?? "").trim();
  if (errorCode !== "0") {
    return null;
  }

  const planapiOperator = String(params.planapi.Operator ?? "").trim();
  const planapiOpCode = String(params.planapi.OpCode ?? "").trim();
  const planapiCircle = String(params.planapi.Circle ?? "").trim();
  const planapiCircleCode = String(params.planapi.CircleCode ?? "").trim();

  const internalKey = mapPlanapiOperatorKey(planapiOpCode, planapiOperator);
  const operator = matchConfiguredOperator(
    internalKey,
    params.configuredOperators,
  );
  if (!operator) return null;

  const internalCircle = mapPlanapiCircleCode(
    planapiCircleCode,
    planapiCircle,
  );
  const allowedCodes = params.circlesForOperator.map((c) => c.code);
  const circleCode = matchConfiguredCircle(internalCircle, allowedCodes);
  const circleLabel =
    circleCode != null
      ? (params.circlesForOperator.find((c) => c.code === circleCode)?.label ??
        planapiCircle)
      : null;

  return {
    operator,
    circleCode,
    circleLabel,
    planapi: {
      operator: planapiOperator,
      opCode: planapiOpCode,
      circle: planapiCircle,
      circleCode: planapiCircleCode,
      message: String(params.planapi.Message ?? "").trim(),
    },
  };
}

export function lookupMobileOperatorAndCircleFromPlanapi(params: {
  planapi: PlanapiRawResponse;
  configuredOperators: string[];
  circlesByProvider: Record<string, CircleOption[]>;
  operatorProviders: Record<string, string>;
}): PlanapiOperatorLookupResult {
  const errorCode = String(params.planapi.ERROR ?? "").trim();
  if (errorCode !== "0") {
    const message =
      String(params.planapi.Message ?? "").trim() ||
      "Could not detect operator for this number.";
    throw new Error(message);
  }

  const internalKey = mapPlanapiOperatorKey(
    String(params.planapi.OpCode ?? ""),
    String(params.planapi.Operator ?? ""),
  );
  const operator = matchConfiguredOperator(
    internalKey,
    params.configuredOperators,
  );
  if (!operator) {
    const detected =
      String(params.planapi.Operator ?? "").trim() || internalKey;
    throw new Error(
      `Detected ${detected}, but no matching operator is configured for recharge.`,
    );
  }

  const provider = params.operatorProviders[operator] ?? "TEST";
  const circlesForOperator = params.circlesByProvider[provider] ?? [];

  const resolved = resolveOperatorLookupFromPlanapi({
    planapi: params.planapi,
    configuredOperators: params.configuredOperators,
    circlesForOperator,
  });

  if (!resolved) {
    throw new Error("Could not map operator lookup to your recharge settings.");
  }

  return resolved;
}

/** Uncached lookup — prefer {@link lookupMobileOperatorAndCircleCached}. */
export async function lookupMobileOperatorAndCircle(params: {
  phone: string;
  configuredOperators: string[];
  circlesByProvider: Record<string, CircleOption[]>;
  operatorProviders: Record<string, string>;
}): Promise<PlanapiOperatorLookupResult> {
  const normalized = normalizePhoneNumber(params.phone);
  if (!validatePhoneNumber(normalized)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }

  if (!isPlanapiConfigured()) {
    throw new Error("Operator lookup is not configured on the server.");
  }

  const planapi = await fetchPlanapiOperatorLookup(normalized);
  return lookupMobileOperatorAndCircleFromPlanapi({
    planapi,
    configuredOperators: params.configuredOperators,
    circlesByProvider: params.circlesByProvider,
    operatorProviders: params.operatorProviders,
  });
}

type PlanapiMobilePlansRaw = {
  ERROR?: string;
  STATUS?: string;
  Operator?: string;
  Circle?: string;
  RDATA?: Record<string, unknown>;
  Message?: string;
};

export async function fetchPlanapiMobilePlans(params: {
  operatorCode: string;
  circleCode: string;
}): Promise<{
  operator: string;
  circle: string;
  rdata: Record<string, unknown>;
}> {
  const userId = process.env.PLANAPI_USER_ID?.trim();
  const password = process.env.PLANAPI_API_PASSWORD?.trim();
  if (!userId || !password) {
    throw new Error("Planapi credentials are not configured.");
  }

  const url = new URL("https://planapi.in/api/Mobile/NewMobilePlans");
  url.searchParams.set("apimember_id", userId);
  url.searchParams.set("api_password", password);
  url.searchParams.set("operatorcode", params.operatorCode);
  url.searchParams.set("cricle", params.circleCode);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Planapi plans request failed (${response.status}).`);
  }

  const data = (await response.json()) as PlanapiMobilePlansRaw;
  const errorCode = String(data.ERROR ?? "").trim();
  if (errorCode !== "0") {
    const message =
      String(data.Message ?? "").trim() || "Could not load recharge plans.";
    throw new Error(message);
  }

  return {
    operator: String(data.Operator ?? "").trim(),
    circle: String(data.Circle ?? "").trim(),
    rdata: data.RDATA ?? {},
  };
}

export type PlanapiAadhaarResponse = {
  Errorcode: number;
  status: string;
  msg: string;
  response: {
    ref_id: string | null;
    message: string | null;
  };
};

export async function verifyAadhaarNumber(
  aadhaarId: string,
): Promise<{ success: boolean; message: string; refId?: string | null }> {
  const userId = process.env.PLANAPI_USER_ID?.trim();
  const password = process.env.PLANAPI_API_PASSWORD?.trim();
  const tokenId = process.env.PLANAPI_TOKEN_ID?.trim();
  const apiMode = process.env.PLANAPI_API_MODE?.trim() || "0";

  if (!userId || !password || !tokenId) {
    throw new Error(
      "Planapi credentials (user ID, password, or token ID) are not configured.",
    );
  }

  const cleanAadhaar = aadhaarId.replace(/\s+/g, "");
  if (!/^\d{12}$/.test(cleanAadhaar)) {
    return {
      success: false,
      message: "Aadhaar number must be exactly 12 numeric digits.",
    };
  }

  const bodyParams = new URLSearchParams();
  bodyParams.set("Aadhaarid", cleanAadhaar);
  bodyParams.set("ApiMode", apiMode);

  const response = await fetch("https://planapi.in/Api/Ekyc/AdharVerification", {
    method: "POST",
    headers: {
      TokenID: tokenId,
      ApiUserID: userId,
      ApiPassword: password,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: bodyParams.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Planapi Aadhaar request failed (${response.status}).`);
  }

  const data = (await response.json()) as PlanapiAadhaarResponse;
  const errorCode = Number(data.Errorcode);

  if (errorCode === 100 || errorCode === 200) {
    return {
      success: true,
      message:
        data.response?.message || "Aadhaar verification successful (OTP generated).",
      refId: data.response?.ref_id,
    };
  }

  if (errorCode === 211) {
    return {
      success: false,
      message:
        data.msg ||
        "Invalid Aadhaar number! Please retry with a valid Aadhaar number.",
    };
  }

  return {
    success: false,
    message: data.msg || "Aadhaar verification failed.",
  };
}

export async function submitAadhaarOtp(params: {
  aadhaarId: string;
  otp: string;
  refId: string;
}): Promise<{ success: boolean; message: string }> {
  const userId = process.env.PLANAPI_USER_ID?.trim();
  const password = process.env.PLANAPI_API_PASSWORD?.trim();
  const tokenId = process.env.PLANAPI_TOKEN_ID?.trim();
  const apiMode = process.env.PLANAPI_API_MODE?.trim() || "0";

  if (!userId || !password || !tokenId) {
    throw new Error(
      "Planapi credentials (user ID, password, or token ID) are not configured.",
    );
  }

  const cleanAadhaar = params.aadhaarId.replace(/\s+/g, "");
  const cleanOtp = params.otp.replace(/\s+/g, "");

  const bodyParams = new URLSearchParams();
  bodyParams.set("Aadhaarid", cleanAadhaar);
  bodyParams.set("OTP", cleanOtp);
  bodyParams.set("ReqId", params.refId);
  bodyParams.set("ApiMode", apiMode);

  const response = await fetch(
    "https://planapi.in/Api/Ekyc/AdharVerificationSubmitOtp",
    {
      method: "POST",
      headers: {
        TokenID: tokenId,
        ApiUserID: userId,
        ApiPassword: password,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: bodyParams.toString(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Planapi OTP verification failed (${response.status}).`);
  }

  const data = (await response.json()) as PlanapiAadhaarResponse;
  const errorCode = Number(data.Errorcode);

  if (errorCode === 100 || errorCode === 200) {
    return {
      success: true,
      message: data.response?.message || "OTP verified successfully.",
    };
  }

  return {
    success: false,
    message: data.msg || "OTP verification failed.",
  };
}

export function generateAadhaarVerificationToken(aadhaarNumber: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || "default_secret";
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity
  const data = `${aadhaarNumber}:${expiresAt}`;
  const signature = createHmac("sha256", secret).update(data).digest("hex");
  return `${aadhaarNumber}:${expiresAt}:${signature}`;
}

export function verifyAadhaarVerificationToken(
  token: string,
  aadhaarNumber: string,
): boolean {
  try {
    const [num, expiresAtStr, signature] = token.split(":");
    if (num !== aadhaarNumber) return false;
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return false;
    const secret = process.env.BETTER_AUTH_SECRET || "default_secret";
    const data = `${aadhaarNumber}:${expiresAt}`;
    const expectedSignature = createHmac("sha256", secret).update(data).digest("hex");
    return expectedSignature === signature;
  } catch {
    return false;
  }
}


