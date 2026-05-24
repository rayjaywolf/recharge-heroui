import { validateProviderCredentials } from './env-validation';

export interface MRoboticsRechargeResponse {
  balance?: number;
  roffer?: number;
  status: 'success' | 'failure' | 'pending';
  recharge_date?: string;
  id?: number;
  response?: string;
  error?: boolean;
  errorMessage?: string;
  lapu_id?: number;
  mobile_no?: string;
  amount?: number;
  tnx_id?: string;
}

export interface MRoboticsBalanceResponse {
  error: boolean;
  data: {
    [key: string]: number;
  };
}

export interface MRoboticsStatusResponse {
  balance: number;
  roffer: number;
  status: 'success' | 'failure' | 'pending';
  recharge_date: string;
  id: number;
  response: string;
  lapu_id: number;
  mobile_no: string;
  amount: number;
  tnx_id: string;
}


export function getMRoboticsCompanyId(operatorName: string): number {
  const normalized = operatorName.toLowerCase();
  

  if (normalized.includes('airtel') && !normalized.includes('dth') && !normalized.includes('money')) return 1;
  if (normalized.includes('bsnl') && !normalized.includes('stv') && !normalized.includes('bill')) return 2;
  if (normalized.includes('jio') || normalized.includes('reliance')) return 3;
  if (normalized.includes('vodafone') || normalized.includes('vi') || normalized.includes('idea')) return 4;
  
  if (normalized.includes('airtel') && normalized.includes('dth')) return 5;
  if (normalized.includes('dish') || normalized.includes('dishtv')) return 6;
  if (normalized.includes('sun') && normalized.includes('direct')) return 7;
  if (normalized.includes('tata') || normalized.includes('tatasky') || normalized.includes('tata play')) return 8;
  if (normalized.includes('videocon') || normalized.includes('d2h')) return 9;
  

  if (normalized.includes('airtel') && normalized.includes('money')) return 10;
  if (normalized.includes('paytm')) return 11;
  if (normalized.includes('mobikwik')) return 12;
  if (normalized.includes('amazon') && normalized.includes('pay')) return 13;
  if (normalized.includes('freecharge')) return 14;
  
  throw new Error(`Unsupported operator: ${operatorName}`);
}

export function getMRoboticsStateCode(circleCode: string): string {
  const normalized = circleCode.toUpperCase().trim();
  
  const stateMap: { [key: string]: string } = {
    'AP': 'AP', 'ANDHRA PRADESH': 'AP', 'TELANGANA': 'AP',
    'AS': 'AS', 'ASSAM': 'AS',
    'BR': 'BR', 'BIHAR': 'BR', 'JH': 'BR', 'JHARKHAND': 'BR',
    'DL': 'DL', 'DELHI': 'DL', 'NCR': 'DL',
    'GJ': 'GJ', 'GUJARAT': 'GJ',
    'HP': 'HP', 'HIMACHAL PRADESH': 'HP',
    'HR': 'HR', 'HARYANA': 'HR',
    'JK': 'JK', 'JAMMU AND KASHMIR': 'JK',
    'KA': 'KA', 'KARNATAKA': 'KA',
    'KL': 'KL', 'KERALA': 'KL', 'LAKSHADWEEP': 'KL',
    'KO': 'KO', 'KOLKATA': 'KO',
    'MH': 'MH', 'MAHARASHTRA': 'MH', 'GOA': 'MH',
    'MP': 'MP', 'MADHYA PRADESH': 'MP', 'CG': 'MP', 'CHHATTISGARH': 'MP',
    'MU': 'MU', 'MUMBAI': 'MU',
    'NE': 'NE', 'NORTH EAST': 'NE',
    'OR': 'OR', 'ODISHA': 'OR', 'ORISSA': 'OR',
    'PB': 'PB', 'PUNJAB': 'PB',
    'RJ': 'RJ', 'RAJASTHAN': 'RJ',
    'TN': 'TN', 'TAMIL NADU': 'TN',
    'UPE': 'UE', 'UP': 'UE', 'UTTAR PRADESH EAST': 'UE',
    'UPW': 'UW', 'UTTAR PRADESH WEST': 'UW', 'UTTARAKHAND': 'UW',
    'WB': 'WB', 'WEST BENGAL': 'WB',
    'GB': 'GB', 'GHAZIABAD': 'GB', 'NOIDA': 'GB',
    'CI': 'CI', 'CHENNAI': 'CI',
  };
  
  return stateMap[normalized] || 'AP'; 
}

export async function performMRoboticsRecharge(
  phoneNumber: string,
  operatorName: string,
  amount: number,
  circleCode?: string,
  transactionId?: string
): Promise<MRoboticsRechargeResponse> {
  validateProviderCredentials('MROBOTICS');
  const apiToken = process.env.MROBOTICS_API_TOKEN!;

  const baseUrl = 'https://mrobotics.in/api/recharge';
  const companyId = getMRoboticsCompanyId(operatorName);
  const stateCode = circleCode ? getMRoboticsStateCode(circleCode) : undefined;
  const orderId = transactionId || `TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const formData = new URLSearchParams();
  formData.append('api_token', apiToken);
  formData.append('mobile_no', phoneNumber);
  formData.append('amount', amount.toString());
  formData.append('company_id', companyId.toString());
  formData.append('order_id', orderId);
  formData.append('is_stv', 'false');
  
  if (stateCode) {
    formData.append('state_code', stateCode);
  }
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  
  if (!response.ok) {
    throw new Error(`MRobotics API error: ${response.status} ${response.statusText}`);
  }
  
  const textResponse = await response.text();
  
  try {
    const jsonResponse = JSON.parse(textResponse) as MRoboticsRechargeResponse;
    return jsonResponse;
  } catch (error) {
    throw new Error(`Invalid JSON response from MRobotics: ${textResponse}`);
  }
}

export async function checkMRoboticsStatus(orderId: string): Promise<MRoboticsStatusResponse> {
  validateProviderCredentials('MROBOTICS');
  const apiToken = process.env.MROBOTICS_API_TOKEN!;

  const baseUrl = 'https://mrobotics.in/api/order_id_status';
  const url = new URL(baseUrl);
  
  url.searchParams.append('api_token', apiToken);
  url.searchParams.append('order_id', orderId);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  
  if (!response.ok) {
    throw new Error(`MRobotics Status API error: ${response.status} ${response.statusText}`);
  }
  
  const textResponse = await response.text();
  
  try {
    const jsonResponse = JSON.parse(textResponse) as MRoboticsStatusResponse;
    return jsonResponse;
  } catch (error) {
    throw new Error(`Invalid JSON response from MRobotics status: ${textResponse}`);
  }
}

export async function getMRoboticsBalance(): Promise<MRoboticsBalanceResponse> {
  validateProviderCredentials('MROBOTICS');
  const apiToken = process.env.MROBOTICS_API_TOKEN!;

  const baseUrl = 'https://mrobotics.in/api/operator_balance';
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
    throw new Error(`MRobotics Balance API error: ${response.status} ${response.statusText}`);
  }
  
  const textResponse = await response.text();
  
  try {
    const jsonResponse = JSON.parse(textResponse) as MRoboticsBalanceResponse;
    return jsonResponse;
  } catch (error) {
    throw new Error(`Invalid JSON response from MRobotics balance: ${textResponse}`);
  }
}
