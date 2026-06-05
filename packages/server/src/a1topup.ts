import { validateProviderCredentials } from "./env-validation";

export type A1TopupStatusResponse = {
  status?: string;
  txid?: string;
  opid?: string;
  number?: string;
  amount?: string;
  orderid?: string;
  timestamp?: string;
  message?: string;
};

/** Map app commission-rule operator names to A1Topup operator codes. */
export function mapA1OperatorCode(operatorName: string): string {
  const normalized = operatorName.toLowerCase().trim();

  if (normalized === "airtel") return "A";
  if (normalized === "vodafone") return "V";
  if (normalized === "vi") return "V";
  if (normalized === "idea") return "I";
  if (normalized === "reliance - jio") return "RC";
  if (normalized === "jio") return "RC";
  if (normalized === "bsnl topup") return "BT";
  if (normalized === "bsnl recharge") return "BT";
  if (normalized === "bsnl - topup") return "BT";
  if (normalized === "bsnl - stv") return "BR";
  if (normalized === "bsnl stv") return "BR";

  return operatorName;
}

export function mapA1CircleCode(circleInput: string): string {
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

export async function checkA1TopupStatus(
  orderId: string,
): Promise<A1TopupStatusResponse> {
  validateProviderCredentials("A1TOPUP");

  const statusUrl = new URL("https://business.a1topup.com/recharge/status");
  statusUrl.searchParams.append("username", process.env.A1TOPUP_USERNAME || "");
  statusUrl.searchParams.append("pwd", process.env.A1TOPUP_PASSWORD || "");
  statusUrl.searchParams.append("orderid", orderId);
  statusUrl.searchParams.append("format", "json");

  const response = await fetch(statusUrl.toString(), {
    method: "GET",
    signal: AbortSignal.timeout(30000),
  });
  const textResponse = await response.text();

  try {
    return JSON.parse(textResponse) as A1TopupStatusResponse;
  } catch {
    throw new Error(`Invalid JSON response from A1TopUp status: ${textResponse}`);
  }
}
