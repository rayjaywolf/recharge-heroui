// RealRobo API integration functions
import { validateProviderCredentials } from './env-validation';
import {
  REALROBO_AIRTEL_POSTPAID_SUB_OPERATOR_IDS,
  REALROBO_WALLET_ROUTE_MOBILE_OPERATOR_IDS,
  REALROBO_WALLET_SUB_OPERATOR_BY_OPERATOR_ID,
} from './realrobo-sub-operators';

export interface RealRoboRechargeResponse {
  status: 'success' | 'failure';
  txid: string;
  message: string;
  remark: string;
  req_id: string;
  req_time: string;
  number: string;
  amount: number;
  offer: number;
  lapu: {
    lapu_id: number;
    lapu_no: string;
    balance: number;
  };
  recharge_id: number;
  operator_id: number;
  operator_name: string;
  state_id: number;
}

export interface RealRoboBalanceResponse {
  status: boolean;
  msg: string;
  data: {
    balance: number;
  };
}

export interface RealRoboStatusResponse {
  status: 'success' | 'failure';
  txid: string;
  message: string;
  remark: string;
  req_id: string;
  req_time: string;
  number: string;
  amount: number;
  offer: number;
  lapu: {
    lapu_id: number;
    lapu_no: string;
    balance: number;
  };
  recharge_id: number;
  operator_id: number;
  operator_name: string;
  state_id: number;
}

// Map operator names to RealRobo operator IDs
export function getRealRoboOperatorId(operatorName: string): number {
  const normalized = operatorName.toLowerCase();
  
  // Mobile Operators
  if (normalized.includes('airtel') && !normalized.includes('dth') && !normalized.includes('money') && !normalized.includes('thanks')) return 1;
  if (normalized.includes('bsnl') && !normalized.includes('stv') && !normalized.includes('bill')) return 2;
  if (normalized.includes('jio') || normalized.includes('reliance')) return 3;
  if (normalized.includes('vodafone') || normalized.includes('vi') || normalized.includes('idea')) return 4;
  if (normalized.includes('aerovoyce')) return 10;
  
  // DTH Operators
  if (normalized.includes('airtel') && normalized.includes('dth')) return 5;
  if (normalized.includes('dish') || normalized.includes('dishtv')) return 6;
  if (normalized.includes('sun') && normalized.includes('direct')) return 7;
  if (normalized.includes('tata') || normalized.includes('tatasky') || normalized.includes('tata play')) return 8;
  if (normalized.includes('videocon') || normalized.includes('d2h')) return 9;
  if (normalized.includes('airtel') && normalized.includes('mitra')) return 14;
  if (normalized.includes('nxt') || normalized.includes('digital')) return 19;
  
  // Digital Wallet & Payment Services
  if (normalized.includes('airtel') && normalized.includes('money')) return 11;
  if (normalized.includes('airtel') && normalized.includes('thanks')) return 12;
  if (normalized.includes('jio') && normalized.includes('pos') && normalized.includes('lite')) return 13;
  if (normalized.includes('mobikwik') && !normalized.includes('business')) return 15;
  if (normalized.includes('paytm')) return 16;
  if (normalized.includes('amazon')) return 17;
  if (normalized.includes('freecharge')) return 18;
  if (normalized.includes('myjio')) return 20;
  if (normalized.includes('mobikwik') && normalized.includes('business')) return 21;
  
  // Other Services
  if (normalized.includes('du') || normalized.includes('uae')) return 22;
  if (normalized.includes('bsnl') && normalized.includes('bill')) return 23;
  if (normalized.includes('sun') && normalized.includes('web')) return 24;
  
  throw new Error(`Unsupported operator: ${operatorName}`);
}

// Map circle codes to RealRobo state IDs
export function getRealRoboStateId(circleCode: string): number {
  const normalized = circleCode.toUpperCase().trim();
  
  const stateMap: { [key: string]: number } = {
    'AP': 1, 'ANDHRA PRADESH': 1,
    'AS': 2, 'ASSAM': 2,
    'BR': 3, 'BIHAR': 3, 'JH': 3, 'JHARKHAND': 3,
    'CN': 4, 'CHENNAI': 4,
    'DL': 5, 'DELHI': 5, 'NCR': 5,
    'GJ': 6, 'GUJARAT': 6,
    'HR': 7, 'HARYANA': 7,
    'HP': 8, 'HIMACHAL PRADESH': 8,
    'JK': 9, 'JAMMU AND KASHMIR': 9,
    'KA': 10, 'KARNATAKA': 10,
    'KL': 11, 'KERALA': 11,
    'KO': 12, 'KOLKATA': 12,
    'MH': 13, 'MAHARASHTRA': 13, 'GOA': 13,
    'MP': 14, 'MADHYA PRADESH': 14, 'CG': 14, 'CHHATTISGARH': 14,
    'MU': 15, 'MUMBAI': 15,
    'NE': 16, 'NORTH EAST': 16,
    'OR': 17, 'ODISHA': 17, 'ORISSA': 17,
    'PB': 18, 'PUNJAB': 18,
    'RJ': 19, 'RAJASTHAN': 19,
    'TN': 20, 'TAMIL NADU': 20,
    'UPE': 21, 'UP': 21, 'UTTAR PRADESH EAST': 21,
    'UPW': 22, 'UTTAR PRADESH WEST': 22, 'UTTARAKHAND': 22,
    'WB': 23, 'WEST BENGAL': 23,
    'CH': 24,
  };
  
  return stateMap[normalized] || 0;
}

/** RealRobo (especially operator 11) needs a valid `state_id`; omitting circle triggers auto-lookup failures. */
export function validateRealRoboCircle(
  circleCode: string | null | undefined,
): number {
  const trimmed = circleCode?.trim();
  if (!trimmed) {
    throw new Error(
      "Circle is required. Select the mobile number's telecom circle (e.g. RJ, DL, MH).",
    );
  }

  const stateId = getRealRoboStateId(trimmed);
  if (stateId === 0) {
    throw new Error(
      `Unknown circle code "${trimmed}". Choose a circle from the list (e.g. RJ, DL, MH).`,
    );
  }

  return stateId;
}

export const REALROBO_DEFAULT_WALLET_OPERATOR_ID = 11;

function isMobileWalletRouteOperator(operatorName: string): boolean {
  try {
    const operatorId = getRealRoboOperatorId(operatorName);
    return REALROBO_WALLET_ROUTE_MOBILE_OPERATOR_IDS.includes(
      operatorId as (typeof REALROBO_WALLET_ROUTE_MOBILE_OPERATOR_IDS)[number],
    );
  } catch {
    return false;
  }
}

/**
 * RealRobo biller code for wallet-lapu route (operator 11 + sub_operator_id).
 * Env `REALROBO_AIRTEL_MONEY_SUB_OPERATOR_ID` overrides when set.
 */
export function getRealRoboWalletSubOperatorId(
  operatorName: string,
): string | null {
  const fromEnv = process.env.REALROBO_AIRTEL_MONEY_SUB_OPERATOR_ID?.trim();
  if (fromEnv) return fromEnv;

  const normalized = operatorName.toLowerCase();
  if (normalized.includes("postpaid") && normalized.includes("airtel")) {
    if (normalized.includes("fetch")) {
      return REALROBO_AIRTEL_POSTPAID_SUB_OPERATOR_IDS.fetchAndPay;
    }
    if (normalized.includes("airtel postpaid")) {
      return REALROBO_AIRTEL_POSTPAID_SUB_OPERATOR_IDS.postpaid;
    }
    return REALROBO_AIRTEL_POSTPAID_SUB_OPERATOR_IDS.default;
  }

  try {
    const operatorId = getRealRoboOperatorId(operatorName);
    return REALROBO_WALLET_SUB_OPERATOR_BY_OPERATOR_ID[operatorId] ?? null;
  } catch {
    return null;
  }
}

async function callRealRoboRechargeApi(params: {
  apiToken: string;
  phoneNumber: string;
  amount: number;
  operatorId: number;
  requestId: string;
  stateId: number;
  subOperatorId?: string;
  lapuId?: string;
}): Promise<RealRoboRechargeResponse> {
  const url = new URL("https://realrobo.in/api/recharge");

  url.searchParams.append("api_token", params.apiToken);
  url.searchParams.append("number", params.phoneNumber);
  url.searchParams.append("amount", params.amount.toString());
  url.searchParams.append("operator_id", params.operatorId.toString());
  url.searchParams.append("req_id", params.requestId);

  url.searchParams.append("state_id", params.stateId.toString());

  if (params.subOperatorId) {
    url.searchParams.append("sub_operator_id", params.subOperatorId);
  }

  if (params.lapuId) {
    url.searchParams.append("lapu_id", params.lapuId);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`RealRobo API error: ${response.status} ${response.statusText}`);
  }

  const textResponse = await response.text();

  try {
    return JSON.parse(textResponse) as RealRoboRechargeResponse;
  } catch {
    throw new Error(`Invalid JSON response from RealRobo: ${textResponse}`);
  }
}

export async function performRealRoboRecharge(
  phoneNumber: string,
  operatorName: string,
  amount: number,
  circleCode?: string,
  transactionId?: string
): Promise<RealRoboRechargeResponse> {
  validateProviderCredentials('REALROBO');
  const apiToken = process.env.REALROBO_API_TOKEN!;

  const stateId = validateRealRoboCircle(circleCode);
  const baseRequestId =
    transactionId || `TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const lapuId = process.env.REALROBO_LAPU_ID?.trim() || undefined;

  const requestParams = {
    apiToken,
    phoneNumber,
    amount,
    stateId,
    lapuId,
  };

  const subOperatorId = getRealRoboWalletSubOperatorId(operatorName);

  if (subOperatorId) {
    return callRealRoboRechargeApi({
      ...requestParams,
      operatorId: REALROBO_DEFAULT_WALLET_OPERATOR_ID,
      requestId: baseRequestId,
      subOperatorId,
    });
  }

  if (isMobileWalletRouteOperator(operatorName)) {
    throw new Error(
      `RealRobo recharge for ${operatorName} requires operator_id ${REALROBO_DEFAULT_WALLET_OPERATOR_ID} with a sub_operator_id biller code`,
    );
  }

  const operatorId = getRealRoboOperatorId(operatorName);
  return callRealRoboRechargeApi({
    ...requestParams,
    operatorId,
    requestId: baseRequestId,
  });
}

export async function checkRealRoboStatus(reqId: string): Promise<RealRoboStatusResponse> {
  validateProviderCredentials('REALROBO');
  const apiToken = process.env.REALROBO_API_TOKEN!;

  const baseUrl = 'https://realrobo.in/api/status_check';
  const url = new URL(baseUrl);
  
  url.searchParams.append('api_token', apiToken);
  url.searchParams.append('req_id', reqId);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  
  if (!response.ok) {
    throw new Error(`RealRobo Status API error: ${response.status} ${response.statusText}`);
  }
  
  const textResponse = await response.text();
  
  try {
    const jsonResponse = JSON.parse(textResponse) as RealRoboStatusResponse;
    return jsonResponse;
  } catch (error) {
    throw new Error(`Invalid JSON response from RealRobo status: ${textResponse}`);
  }
}

export async function getRealRoboBalance(): Promise<RealRoboBalanceResponse> {
  validateProviderCredentials('REALROBO');
  const apiToken = process.env.REALROBO_API_TOKEN!;

  const baseUrl = 'https://realrobo.in/api/balance';
  const url = new URL(baseUrl);
  
  url.searchParams.append('api_token', apiToken);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  
  if (!response.ok) {
    throw new Error(`RealRobo Balance API error: ${response.status} ${response.statusText}`);
  }
  
  const textResponse = await response.text();
  
  try {
    const jsonResponse = JSON.parse(textResponse) as RealRoboBalanceResponse;
    return jsonResponse;
  } catch (error) {
    throw new Error(`Invalid JSON response from RealRobo balance: ${textResponse}`);
  }
}
