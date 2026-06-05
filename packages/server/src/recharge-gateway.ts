import type { RechargeProviderId } from "@repo/shared/recharge-providers";
import { mapA1CircleCode, mapA1OperatorCode } from "./a1topup";
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
  apiUrl.searchParams.append("operatorcode", mapA1OperatorCode(operator));
  if (circleCode) {
    apiUrl.searchParams.append("circlecode", mapA1CircleCode(circleCode));
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
    if (response.status === "pending") {
      return {
        finalStatus: "PENDING",
        apiMessage: detail || "Recharge is pending at provider",
        apiReferenceId: ref,
        shouldRefund: false,
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
  const statusStr = response.status ? response.status.toLowerCase() : "";
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
  if (
    statusStr === "failure" ||
    statusStr === "failed" ||
    statusStr === "fail"
  ) {
    return {
      finalStatus: "FAILED",
      apiMessage: response.message || "Recharge failed at provider",
      apiReferenceId: ref,
      shouldRefund: true,
    };
  }
  return {
    finalStatus: "PENDING",
    apiMessage:
      response.message ||
      (statusStr
        ? `Recharge status unknown at provider (${response.status}); marked pending`
        : "Recharge status unknown at provider; marked pending"),
    apiReferenceId: ref,
    shouldRefund: false,
  };
}
