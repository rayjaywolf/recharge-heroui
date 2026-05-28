import type { RechargeProviderId } from "@repo/shared/recharge-providers";
import { performMRoboticsRecharge } from "./mrobotics";
import { performRealRoboRecharge } from "./realrobo";
import { performTestRecharge } from "./test-provider";

export type ParsedRechargeResponse = {
  finalStatus: "SUCCESS" | "FAILED" | "PENDING";
  apiMessage: string;
  apiReferenceId: string | null;
  shouldRefund: boolean;
};

export type RechargeCallParams = {
  providerId: RechargeProviderId;
  phone: string;
  operator: string;
  amount: number;
  circleCode: string | null | undefined;
  transactionId: string;
};

function getOperatorCode(opName: string): string {
  const normalized = opName.toLowerCase();

  if (normalized === "airtel") return "A";
  if (normalized === "vodafone") return "V";
  if (normalized === "vi") return "V";
  if (normalized === "bsnl topup") return "BT";
  if (normalized === "reliance - jio") return "RC";
  if (normalized === "jio") return "RC";
  if (normalized === "idea") return "I";
  if (normalized === "bsnl - stv") return "BR";
  if (normalized === "bsnl recharge") return "BR";

  return opName;
}

function getCircleCode(circleInput: string): string {
  const circleMap: Record<string, string> = {
    AP: "13",
    "ANDHRA PRADESH": "13",
    AS: "24",
    ASSAM: "24",
    BR: "17",
    BIHAR: "17",
    CG: "27",
    CHHATTISGARH: "27",
    GJ: "12",
    GUJARAT: "12",
    HR: "20",
    HARYANA: "20",
    HP: "21",
    "HIMACHAL PRADESH": "21",
    JK: "25",
    "JAMMU AND KASHMIR": "25",
    JH: "22",
    JHARKHAND: "22",
    KA: "9",
    KARNATAKA: "9",
    KL: "14",
    KERALA: "14",
    MP: "16",
    "MADHYA PRADESH": "16",
    MH: "4",
    MAHARASHTRA: "4",
    OR: "23",
    ODISHA: "23",
    ORISSA: "23",
    PB: "1",
    PUNJAB: "1",
    RJ: "18",
    RAJASTHAN: "18",
    TN: "8",
    "TAMIL NADU": "8",
    UP: "11",
    "UTTAR PRADESH WEST": "11",
    UPW: "11",
    UPE: "10",
    "UTTAR PRADESH EAST": "10",
    WB: "2",
    "WEST BENGAL": "2",
    MU: "3",
    MUMBAI: "3",
    DL: "5",
    DELHI: "5",
    CN: "7",
    CHENNAI: "7",
    KO: "6",
    KOLKATA: "6",
    NE: "26",
    "NORTH EAST": "26",
  };

  const normalized = circleInput.toUpperCase().trim();
  return circleMap[normalized] || circleInput;
}

export async function callRechargeProvider(
  params: RechargeCallParams
): Promise<unknown> {
  const { providerId, phone, operator, amount, circleCode, transactionId } =
    params;

  const circle = circleCode ?? undefined;

  if (providerId === "TEST") {
    return performTestRecharge(phone, operator, amount, transactionId, circle);
  }

  if (providerId === "REALROBO") {
    return performRealRoboRecharge(
      phone,
      operator,
      amount,
      circle,
      transactionId
    );
  }

  if (providerId === "MROBOTICS") {
    return performMRoboticsRecharge(
      phone,
      operator,
      amount,
      circle,
      transactionId
    );
  }

  const apiUrl = new URL("https://business.a1topup.com/recharge/api");
  apiUrl.searchParams.append("username", process.env.A1TOPUP_USERNAME || "");
  apiUrl.searchParams.append("pwd", process.env.A1TOPUP_PASSWORD || "");
  apiUrl.searchParams.append("number", phone);
  apiUrl.searchParams.append("operatorcode", getOperatorCode(operator));
  if (circleCode) {
    apiUrl.searchParams.append("circlecode", getCircleCode(circleCode));
  }
  apiUrl.searchParams.append("amount", amount.toString());
  apiUrl.searchParams.append("orderid", transactionId);
  apiUrl.searchParams.append("format", "json");

  try {
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    });
    const textResponse = await response.text();

    try {
      return JSON.parse(textResponse);
    } catch {
      return { status: "error", message: textResponse };
    }
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown provider error";
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        detail.toLowerCase().includes("timeout"));

    console.error("[A1TOPUP] recharge request failed:", error);

    return {
      status: "pending",
      message: isTimeout
        ? "A1TopUp request timed out. Left pending for status reconciliation."
        : `A1TopUp request failed (${detail}). Left pending for status reconciliation.`,
      transaction_id: transactionId,
      orderid: transactionId,
    };
  }
}

export function parseRechargeProviderResponse(
  providerId: RechargeProviderId,
  apiResult: unknown,
  transactionId: string
): ParsedRechargeResponse {
  if (providerId === "TEST") {
    const response = apiResult as {
      status: string;
      message: string;
      referenceId: string;
    };
    if (response.status === "success") {
      return {
        finalStatus: "SUCCESS",
        apiMessage: response.message,
        apiReferenceId: response.referenceId,
        shouldRefund: false,
      };
    }
    if (response.status === "failure") {
      return {
        finalStatus: "FAILED",
        apiMessage: response.message,
        apiReferenceId: response.referenceId,
        shouldRefund: true,
      };
    }
    return {
      finalStatus: "PENDING",
      apiMessage: response.message,
      apiReferenceId: response.referenceId,
      shouldRefund: false,
    };
  }

  if (providerId === "REALROBO") {
    const response = apiResult as {
      status: string;
      remark?: string;
      message?: string;
      txid?: string;
      req_id?: string;
    };
    const ref = `${response.txid ?? ""} [REQ_ID: ${response.req_id ?? ""}]`.trim();
    const detail = response.remark || response.message || "";
    const isPendingDetail = (text: string) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("pending") ||
        lower.includes("in process") ||
        lower.includes("processing")
      );
    };

    if (
      response.status === "pending" ||
      isPendingDetail(detail)
    ) {
      return {
        finalStatus: "PENDING",
        apiMessage: detail || "Recharge is pending at provider",
        apiReferenceId: ref,
        shouldRefund: false,
      };
    }

    if (response.status === "success") {
      return {
        finalStatus: "SUCCESS",
        apiMessage: detail || "Recharge successful",
        apiReferenceId: ref,
        shouldRefund: false,
      };
    }
    if (response.status === "failure") {
      return {
        finalStatus: "FAILED",
        apiMessage:
          response.remark || response.message || "Recharge failed at provider",
        apiReferenceId: ref,
        shouldRefund: true,
      };
    }
    return {
      finalStatus: "PENDING",
      apiMessage:
        response.remark || response.message || "Recharge status unknown",
      apiReferenceId: ref,
      shouldRefund: false,
    };
  }

  if (providerId === "MROBOTICS") {
    const response = apiResult as {
      status: string;
      response?: string;
      errorMessage?: string;
      tnx_id?: string;
      id?: string;
    };
    const ref = `${response.tnx_id || ""} [ORDER_ID: ${response.id || ""}] [TX_ID: ${transactionId}]`;
    if (response.status === "success") {
      return {
        finalStatus: "SUCCESS",
        apiMessage: response.response || response.errorMessage || "Recharge successful",
        apiReferenceId: ref,
        shouldRefund: false,
      };
    }
    if (response.status === "failure") {
      return {
        finalStatus: "FAILED",
        apiMessage:
          response.errorMessage || response.response || "Recharge failed at provider",
        apiReferenceId: ref,
        shouldRefund: true,
      };
    }
    if (response.status === "pending") {
      return {
        finalStatus: "PENDING",
        apiMessage:
          response.errorMessage || response.response || "Recharge is pending",
        apiReferenceId: ref,
        shouldRefund: false,
      };
    }
    return {
      finalStatus: "PENDING",
      apiMessage:
        response.errorMessage || response.response || "Recharge status unknown",
      apiReferenceId: ref,
      shouldRefund: false,
    };
  }

  const response = apiResult as {
    status?: string;
    message?: string;
    opid?: string;
    transaction_id?: string;
    txid?: string;
  };
  const statusStr = response.status ? response.status.toLowerCase() : "failed";
  const opidPart = response.opid ? ` [OPID: ${response.opid}]` : "";
  const refBase =
    response.transaction_id || response.txid || `API-${Date.now()}`;
  const ref = refBase + opidPart + ` [TX_ID: ${transactionId}]`;

  if (statusStr === "success") {
    return {
      finalStatus: "SUCCESS",
      apiMessage: response.message || "Recharge successful",
      apiReferenceId: ref,
      shouldRefund: false,
    };
  }
  if (statusStr === "pending") {
    return {
      finalStatus: "PENDING",
      apiMessage: response.message || "Recharge is pending with operator",
      apiReferenceId: ref,
      shouldRefund: false,
    };
  }
  return {
    finalStatus: "PENDING",
    apiMessage:
      response.message || "Recharge status unknown at provider; marked pending",
    apiReferenceId: ref,
    shouldRefund: false,
  };
}
