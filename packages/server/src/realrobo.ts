// RealRobo API integration functions
import { validateProviderCredentials } from './env-validation';
import {
  REALROBO_AIRTEL_MONEY_OPERATOR_ID,
  REALROBO_AMAZON_OPERATOR_ID,
  REALROBO_WALLET_OPERATOR_IDS,
  REALROBO_WALLET_ROUTE_MOBILE_OPERATOR_IDS,
  REALROBO_WALLET_SUB_OPERATORS,
  type RealRoboWalletOperatorId,
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
  
  // DTH Operators (checked first: names like "Videocon" contain "vi")
  const isAirtelDth =
    normalized.includes('airtel') &&
    (normalized.includes('dth') || normalized.includes('digital tv') || normalized.includes('xstream'));
  if (isAirtelDth) return 5;
  if (normalized.includes('dish') || normalized.includes('dishtv')) return 6;
  if (normalized.includes('sun') && normalized.includes('direct')) return 7;
  if (normalized.includes('tata') || normalized.includes('tatasky') || normalized.includes('tata play')) return 8;
  if (normalized.includes('videocon') || normalized.includes('d2h')) return 9;

  // Mobile Operators
  if (normalized.includes('airtel') && !normalized.includes('money') && !normalized.includes('thanks') && !normalized.includes('mitra')) return 1;
  if (normalized.includes('bsnl') && !normalized.includes('stv') && !normalized.includes('bill')) return 2;
  if (normalized.includes('jio') || normalized.includes('reliance')) return 3;
  if (normalized.includes('vodafone') || /\bvi\b/.test(normalized) || normalized.includes('idea')) return 4;
  if (normalized.includes('aerovoyce')) return 10;

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

/** Airtel Money (11) is the default wallet route; set REALROBO_WALLET_OPERATOR_ID=17 for Amazon. */
export const REALROBO_DEFAULT_WALLET_OPERATOR_ID: RealRoboWalletOperatorId =
  REALROBO_AIRTEL_MONEY_OPERATOR_ID;

/** Default Amazon lapu (lapu no. 9993785234); override with REALROBO_AMAZON_LAPU_ID. */
export const REALROBO_DEFAULT_AMAZON_LAPU_ID = "632505";

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
/**
 * Primary wallet lapu used for sub-operator routing: 11 = Airtel Money (default), 17 = Amazon.
 * Set REALROBO_WALLET_OPERATOR_ID to switch.
 */
export function getRealRoboWalletOperatorId(): RealRoboWalletOperatorId {
  const raw = process.env.REALROBO_WALLET_OPERATOR_ID?.trim();
  if (!raw) return REALROBO_DEFAULT_WALLET_OPERATOR_ID;
  const parsed = Number(raw);
  if (
    !REALROBO_WALLET_OPERATOR_IDS.includes(parsed as RealRoboWalletOperatorId)
  ) {
    throw new Error(
      `Invalid REALROBO_WALLET_OPERATOR_ID "${raw}". Supported values: ${REALROBO_WALLET_OPERATOR_IDS.join(", ")}`,
    );
  }
  return parsed as RealRoboWalletOperatorId;
}

/** Lapu for the selected wallet: Amazon uses REALROBO_AMAZON_LAPU_ID, Airtel Money uses REALROBO_LAPU_ID. */
export function getRealRoboLapuId(
  walletOperatorId: RealRoboWalletOperatorId = getRealRoboWalletOperatorId(),
): string | undefined {
  if (walletOperatorId === REALROBO_AMAZON_OPERATOR_ID) {
    return (
      process.env.REALROBO_AMAZON_LAPU_ID?.trim() || REALROBO_DEFAULT_AMAZON_LAPU_ID
    );
  }
  return process.env.REALROBO_LAPU_ID?.trim() || undefined;
}

function getPostpaidSubOperatorId(
  normalized: string,
  walletOperatorId: RealRoboWalletOperatorId,
): string | null | undefined {
  if (!normalized.includes("postpaid")) return undefined;
  const postpaid = REALROBO_WALLET_SUB_OPERATORS[walletOperatorId].postpaid;

  if (normalized.includes("airtel")) {
    if (normalized.includes("fetch") && postpaid.airtelFetchAndPay) {
      return postpaid.airtelFetchAndPay;
    }
    if (normalized.includes("airtel postpaid") || !postpaid.airtelDefault) {
      return postpaid.airtel;
    }
    return postpaid.airtelDefault;
  }

  // Non-Airtel postpaid: only wallets that publish these billers handle them.
  // Airtel Money keeps its previous behaviour (falls through to the prepaid map).
  if (walletOperatorId === REALROBO_AIRTEL_MONEY_OPERATOR_ID) return undefined;
  if (normalized.includes("bsnl")) return postpaid.bsnl ?? null;
  if (normalized.includes("jio") || normalized.includes("reliance")) {
    return postpaid.jio ?? null;
  }
  if (
    normalized.includes("vodafone") ||
    normalized.includes("idea") ||
    /\bvi\b/.test(normalized)
  ) {
    return postpaid.vi ?? null;
  }
  return null;
}

export function getRealRoboWalletSubOperatorId(
  operatorName: string,
  walletOperatorId: RealRoboWalletOperatorId = getRealRoboWalletOperatorId(),
): string | null {
  if (walletOperatorId === REALROBO_AIRTEL_MONEY_OPERATOR_ID) {
    const fromEnv = process.env.REALROBO_AIRTEL_MONEY_SUB_OPERATOR_ID?.trim();
    if (fromEnv) return fromEnv;
  }

  const normalized = operatorName.toLowerCase();
  const postpaid = getPostpaidSubOperatorId(normalized, walletOperatorId);
  if (postpaid !== undefined) return postpaid;

  try {
    const operatorId = getRealRoboOperatorId(operatorName);
    return (
      REALROBO_WALLET_SUB_OPERATORS[walletOperatorId].byOperatorId[operatorId] ??
      null
    );
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

export function generateNumericRequestId(): string {
  return `${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}


// ---------------------------------------------------------------------------
// Lapu balance guard: when the primary wallet's lapu runs low, fall back to the
// other wallet (Airtel Money 11 → Amazon 17 by default).
// ---------------------------------------------------------------------------

export const REALROBO_DEFAULT_MIN_LAPU_BALANCE = 200;

export function getRealRoboMinLapuBalance(): number {
  const text = (
    process.env.REALROBO_MIN_LAPU_BALANCE ??
    process.env.REALROBO_AMAZON_MIN_LAPU_BALANCE
  )?.trim();
  const raw = text ? Number(text) : NaN;
  return Number.isFinite(raw) && raw >= 0
    ? raw
    : REALROBO_DEFAULT_MIN_LAPU_BALANCE;
}

/** The wallet used when the primary wallet's lapu is low. */
export function getRealRoboFallbackWalletOperatorId(
  primary: RealRoboWalletOperatorId = getRealRoboWalletOperatorId(),
): RealRoboWalletOperatorId {
  return primary === REALROBO_AIRTEL_MONEY_OPERATOR_ID
    ? REALROBO_AMAZON_OPERATOR_ID
    : REALROBO_AIRTEL_MONEY_OPERATOR_ID;
}

/** Last known lapu balance per wallet (missing/null = not checked yet / check failed). */
const lapuBalances = new Map<RealRoboWalletOperatorId, number | null>();
const lapuBalanceInFlight = new Map<RealRoboWalletOperatorId, Promise<number | null>>();

/** GET https://realrobo.in/api/lapu_balance?lapu_id=… → data.balance */
export async function fetchRealRoboLapuBalance(
  lapuId: string,
): Promise<number | null> {
  const apiToken = process.env.REALROBO_API_TOKEN?.trim();
  if (!apiToken || !lapuId) return null;
  const url = new URL("https://realrobo.in/api/lapu_balance");
  url.searchParams.append("api_token", apiToken);
  url.searchParams.append("lapu_id", lapuId);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      status?: boolean;
      data?: { balance?: number | string };
    };
    const balance = Number(body?.data?.balance);
    return body?.status && Number.isFinite(balance) ? balance : null;
  } catch {
    return null;
  }
}

/** Re-reads a wallet's lapu balance and caches it. Never throws. */
export function refreshRealRoboLapuBalance(
  wallet: RealRoboWalletOperatorId,
): Promise<number | null> {
  const existing = lapuBalanceInFlight.get(wallet);
  if (existing) return existing;
  const lapuId = getRealRoboLapuId(wallet);
  const fallback = getRealRoboFallbackWalletOperatorId(wallet);
  const promise = (async () => {
    const balance = lapuId ? await fetchRealRoboLapuBalance(lapuId) : null;
    if (balance !== null) {
      const min = getRealRoboMinLapuBalance();
      const previous = lapuBalances.get(wallet) ?? null;
      const wasLow = previous !== null && previous < min;
      const isLow = balance < min;
      if (isLow !== wasLow || previous === null) {
        console.log(
          `[RealRobo] Wallet ${wallet} lapu ${lapuId} balance ₹${balance} (min ₹${min}) → ${
            isLow ? `falling back to wallet ${fallback}` : `using wallet ${wallet}`
          }`,
        );
      }
      lapuBalances.set(wallet, balance);
    }
    return balance;
  })().finally(() => {
    lapuBalanceInFlight.delete(wallet);
  });
  lapuBalanceInFlight.set(wallet, promise);
  return promise;
}

/** Test hook. */
export function setRealRoboLapuBalanceForTests(
  wallet: RealRoboWalletOperatorId,
  value: number | null,
) {
  lapuBalances.set(wallet, value);
}

/** Test hook. */
export function resetRealRoboLapuBalancesForTests() {
  lapuBalances.clear();
  lapuBalanceInFlight.clear();
}

/**
 * Wallet to use for this recharge: the primary wallet (Airtel Money by default),
 * unless its lapu balance is under the minimum or below this recharge amount, in
 * which case use the other wallet. Balance unknown → check once before deciding;
 * still unknown (or no lapu_id configured) → keep the primary.
 */
export async function resolveRealRoboWalletOperatorId(
  amount: number,
): Promise<RealRoboWalletOperatorId> {
  const primary = getRealRoboWalletOperatorId();
  const balance =
    lapuBalances.get(primary) ?? (await refreshRealRoboLapuBalance(primary));
  if (balance === null) return primary; // can't tell → keep primary

  const min = getRealRoboMinLapuBalance();
  return balance < min || balance < amount
    ? getRealRoboFallbackWalletOperatorId(primary)
    : primary;
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
    transactionId && /^\d+$/.test(transactionId)
      ? transactionId
      : generateNumericRequestId();


  const walletOperatorId = await resolveRealRoboWalletOperatorId(amount);
  const lapuId = getRealRoboLapuId(walletOperatorId);

  const requestParams = {
    apiToken,
    phoneNumber,
    amount,
    stateId,
    lapuId,
  };
  const subOperatorId = getRealRoboWalletSubOperatorId(
    operatorName,
    walletOperatorId,
  );

  if (subOperatorId) {
    return withLapuBalanceRefresh(
      callRealRoboRechargeApi({
        ...requestParams,
        operatorId: walletOperatorId,
        requestId: baseRequestId,
        subOperatorId,
      }),
    );
  }

  if (isMobileWalletRouteOperator(operatorName)) {
    throw new Error(
      `RealRobo recharge for ${operatorName} requires operator_id ${walletOperatorId} with a sub_operator_id biller code`,
    );
  }

  const operatorId = getRealRoboOperatorId(operatorName);
  return withLapuBalanceRefresh(
    callRealRoboRechargeApi({
      ...requestParams,
      operatorId,
      requestId: baseRequestId,
    }),
  );
}

/** After every RealRobo recharge (success or not), re-check the primary wallet's lapu in the background. */
function withLapuBalanceRefresh<T>(call: Promise<T>): Promise<T> {
  return call.finally(() => {
    void refreshRealRoboLapuBalance(getRealRoboWalletOperatorId());
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
