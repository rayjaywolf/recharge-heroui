import { validateProviderCredentials } from "./env-validation";
import {
  generateNumericRequestId,
  type RealRoboBalanceResponse,
  type RealRoboRechargeResponse,
  type RealRoboStatusResponse,
  validateRealRoboCircle,
} from "./realrobo";

export const JIOPOSLITE_DEFAULT_LAPU_ID = "641942";
export const JIOPOSLITE_OPERATOR_ID = 13;

export function getJioPosLiteApiToken(): string {
  const token =
    process.env.JIOPOSLITE_API_TOKEN?.trim() ||
    process.env.REALROBO_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Jio Pos Lite API token not configured. Set JIOPOSLITE_API_TOKEN or REALROBO_API_TOKEN.",
    );
  }
  return token;
}

export function getJioPosLiteLapuId(): string {
  return (
    process.env.JIOPOSLITE_LAPU_ID?.trim() ||
    process.env.REALROBO_JIO_POS_LITE_LAPU_ID?.trim() ||
    JIOPOSLITE_DEFAULT_LAPU_ID
  );
}

export async function performJioPosLiteRecharge(
  phoneNumber: string,
  _operatorName: string,
  amount: number,
  circleCode?: string,
  transactionId?: string,
): Promise<RealRoboRechargeResponse> {
  validateProviderCredentials("JIOPOSLITE");
  const apiToken = getJioPosLiteApiToken();
  const stateId = validateRealRoboCircle(circleCode);
  const baseRequestId =
    transactionId && /^\d+$/.test(transactionId)
      ? transactionId
      : generateNumericRequestId();
  const lapuId = getJioPosLiteLapuId();

  const url = new URL("https://realrobo.in/api/recharge");
  url.searchParams.append("api_token", apiToken);
  url.searchParams.append("number", phoneNumber);
  url.searchParams.append("amount", amount.toString());
  url.searchParams.append("operator_id", JIOPOSLITE_OPERATOR_ID.toString());
  url.searchParams.append("req_id", baseRequestId);
  url.searchParams.append("state_id", stateId.toString());
  if (lapuId) {
    url.searchParams.append("lapu_id", lapuId);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `Jio Pos Lite API error: ${response.status} ${response.statusText}`,
    );
  }

  const textResponse = await response.text();
  try {
    return JSON.parse(textResponse) as RealRoboRechargeResponse;
  } catch {
    throw new Error(`Invalid JSON response from Jio Pos Lite: ${textResponse}`);
  }
}

export async function checkJioPosLiteStatus(
  reqId: string,
): Promise<RealRoboStatusResponse> {
  validateProviderCredentials("JIOPOSLITE");
  const apiToken = getJioPosLiteApiToken();

  const url = new URL("https://realrobo.in/api/status_check");
  url.searchParams.append("api_token", apiToken);
  url.searchParams.append("req_id", reqId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `Jio Pos Lite Status API error: ${response.status} ${response.statusText}`,
    );
  }

  const textResponse = await response.text();
  try {
    return JSON.parse(textResponse) as RealRoboStatusResponse;
  } catch {
    throw new Error(
      `Invalid JSON response from Jio Pos Lite status: ${textResponse}`,
    );
  }
}

export async function getJioPosLiteBalance(): Promise<RealRoboBalanceResponse> {
  validateProviderCredentials("JIOPOSLITE");
  const apiToken = getJioPosLiteApiToken();
  const lapuId = getJioPosLiteLapuId();

  const url = new URL("https://realrobo.in/api/lapu_balance");
  url.searchParams.append("api_token", apiToken);
  url.searchParams.append("lapu_id", lapuId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `Jio Pos Lite Balance API error: ${response.status} ${response.statusText}`,
    );
  }

  const textResponse = await response.text();
  try {
    const json = JSON.parse(textResponse) as {
      status?: boolean;
      msg?: string;
      data?: { balance?: number | string; lapu_no?: string };
    };

    const balanceNum = Number(json?.data?.balance ?? 0);
    return {
      status: json?.status ?? true,
      msg: json?.msg || "Success.",
      data: {
        balance: Number.isFinite(balanceNum) ? balanceNum : 0,
      },
    };
  } catch {
    throw new Error(
      `Invalid JSON response from Jio Pos Lite balance: ${textResponse}`,
    );
  }
}
