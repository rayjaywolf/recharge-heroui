// RealRobo API integration functions
import { validateProviderCredentials } from './env-validation';

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
  
  return stateMap[normalized] || 0; // 0 for All States (Universal)
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

  const baseUrl = 'https://realrobo.in/api/recharge';
  const url = new URL(baseUrl);
  
  const operatorId = getRealRoboOperatorId(operatorName);
  const stateId = circleCode ? getRealRoboStateId(circleCode) : 0;
  const requestId = transactionId || `TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Required parameters
  url.searchParams.append('api_token', apiToken);
  url.searchParams.append('number', phoneNumber);
  url.searchParams.append('amount', amount.toString());
  url.searchParams.append('operator_id', operatorId.toString());
  url.searchParams.append('req_id', requestId);
  
  // Optional parameters
  if (stateId !== 0) {
    url.searchParams.append('state_id', stateId.toString());
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  
  if (!response.ok) {
    throw new Error(`RealRobo API error: ${response.status} ${response.statusText}`);
  }
  
  const textResponse = await response.text();
  
  try {
    const jsonResponse = JSON.parse(textResponse) as RealRoboRechargeResponse;
    return jsonResponse;
  } catch (error) {
    throw new Error(`Invalid JSON response from RealRobo: ${textResponse}`);
  }
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
