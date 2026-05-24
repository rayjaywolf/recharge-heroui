import { NextResponse } from "next/server";
import { auth, prisma } from "@/lib/auth";
import { headers } from "next/headers";
import { performRealRoboRecharge, checkRealRoboStatus } from "@/lib/realrobo";
import { performMRoboticsRecharge, checkMRoboticsStatus } from "@/lib/mrobotics";
import { validateProviderCredentials } from "@/lib/env-validation";
import { performTestRecharge } from "@/lib/test-provider";

type RechargeProviderId = "A1TOPUP" | "REALROBO" | "MROBOTICS" | "TEST";

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
  const circleMap: { [key: string]: string } = {
    'AP': '13', 'ANDHRA PRADESH': '13',
    'AS': '24', 'ASSAM': '24',
    'BR': '17', 'BIHAR': '17',
    'CG': '27', 'CHHATTISGARH': '27',
    'GJ': '12', 'GUJARAT': '12',
    'HR': '20', 'HARYANA': '20',
    'HP': '21', 'HIMACHAL PRADESH': '21',
    'JK': '25', 'JAMMU AND KASHMIR': '25',
    'JH': '22', 'JHARKHAND': '22',
    'KA': '9', 'KARNATAKA': '9',
    'KL': '14', 'KERALA': '14',
    'MP': '16', 'MADHYA PRADESH': '16',
    'MH': '4', 'MAHARASHTRA': '4',
    'OR': '23', 'ODISHA': '23', 'ORISSA': '23',
    'PB': '1', 'PUNJAB': '1',
    'RJ': '18', 'RAJASTHAN': '18',
    'TN': '8', 'TAMIL NADU': '8',
    'UP': '11', 'UTTAR PRADESH WEST': '11',
    'UPW': '11',
    'UPE': '10', 'UTTAR PRADESH EAST': '10',
    'WB': '2', 'WEST BENGAL': '2',
    'MU': '3', 'MUMBAI': '3',
    'DL': '5', 'DELHI': '5',
    'CN': '7', 'CHENNAI': '7',
    'KO': '6', 'KOLKATA': '6',
    'NE': '26', 'NORTH EAST': '26'
  };
  
  const normalized = circleInput.toUpperCase().trim();
  return circleMap[normalized] || circleInput;
}

function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian mobile number
  // Indian mobile numbers are 10 digits (without country code)
  // or 12 digits with country code (91)
  if (cleanPhone.length === 10) {
    // Check if it starts with valid mobile prefix (6,7,8,9)
    return /^[6-9]\d{9}$/.test(cleanPhone);
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    // Check if the last 10 digits start with valid mobile prefix
    return /^[6-9]\d{9}$/.test(cleanPhone.substring(2));
  }
  
  return false;
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // If it's 12 digits starting with 91, remove the country code
  if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    return cleanPhone.substring(2);
  }
  
  // Return the 10-digit number
  return cleanPhone;
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phone, operator, amount, circleCode, idempotencyKey, provider = "TEST" } = body;

    const providerId = provider as RechargeProviderId;
    const allowedProviders: RechargeProviderId[] = [
      "TEST",
      "REALROBO",
      "MROBOTICS",
      "A1TOPUP",
    ];

    if (!allowedProviders.includes(providerId)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (!phone || !operator || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    
    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      return NextResponse.json({ 
        error: "Invalid phone number. Please enter a valid 10-digit Indian mobile number." 
      }, { status: 400 });
    }
    
    // Normalize phone number to 10 digits
    const normalizedPhone = normalizePhoneNumber(phone);

    if (idempotencyKey) {
      const existing = await prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (existing) {
         return NextResponse.json({ error: "Duplicate action detected. Request is already processing." }, { status: 409 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (!user) {
        throw new Error("User not found");
      }

      if (user.isSuspended) {
        throw new Error("ACCOUNT_SUSPENDED");
      }

      if (user.balance < amount) {
        throw new Error("Insufficient balance");
      }

      await tx.user.update({
        where: { id: user.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } }
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          targetPhone: normalizedPhone,
          operator: operator,
          amount: amount,
          circleCode: circleCode || null,
          provider: providerId,
          status: "PENDING",
          idempotencyKey: idempotencyKey || undefined
        }
      });

      return { transaction, distributorId: user.distributorId };
    });

    // Get commission rules first
    const rule = await prisma.commissionRule.findUnique({ where: { operator } });
    const rMargin = rule ? rule.retailerMargin : 0;
    const dMargin = rule ? rule.distributorMargin : 0;
    const aMargin = rule ? rule.adminMargin : 0;

    const rCommission = (amount * rMargin) / 100;
    const dCommission = (amount * dMargin) / 100;
    const aCommission = (amount * aMargin) / 100;

    // If retailer has no distributor, distributor commission goes to admin
    const hasDistributor = !!result.distributorId;
    const adminCommission = aCommission + (hasDistributor ? 0 : dCommission);
    const distributorCommission = hasDistributor ? dCommission : 0;

    // Validate provider credentials before making API calls
    validateProviderCredentials(providerId);
    
    // Call provider API
    let apiResult;
    try {
      console.log("=== RECHARGE INITIATED ===");
      console.log("Provider:", providerId);
      console.log("Phone:", normalizedPhone);
      console.log("Operator:", operator);
      console.log("Amount:", amount);
      console.log("Circle Code:", circleCode);
      console.log("Transaction ID:", result.transaction.id);
      console.log("========================");
      
      if (providerId === "TEST") {
        apiResult = await performTestRecharge(
          normalizedPhone,
          operator,
          amount,
          result.transaction.id,
          circleCode
        );
        console.log("=== TEST PROVIDER RESPONSE ===");
        console.log(JSON.stringify(apiResult, null, 2));
        console.log("==============================");
      } else if (providerId === "REALROBO") {
        apiResult = await performRealRoboRecharge(
          normalizedPhone,
          operator,
          amount,
          circleCode,
          result.transaction.id
        );
        console.log("=== REALROBO API RESPONSE ===");
        console.log(JSON.stringify(apiResult, null, 2));
        console.log("==============================");
      } else if (providerId === "MROBOTICS") {
        apiResult = await performMRoboticsRecharge(
          normalizedPhone,
          operator,
          amount,
          circleCode,
          result.transaction.id
        );
        console.log("=== MROBOTICS API RESPONSE ===");
        console.log(JSON.stringify(apiResult, null, 2));
        console.log("===============================");
      } else {
        // A1TopUp API call
        const apiUrl = new URL("https://business.a1topup.com/recharge/api");
        apiUrl.searchParams.append("username", process.env.A1TOPUP_USERNAME || "");
        apiUrl.searchParams.append("pwd", process.env.A1TOPUP_PASSWORD || "");
        apiUrl.searchParams.append("number", normalizedPhone);
        apiUrl.searchParams.append("operatorcode", getOperatorCode(operator));
        if (circleCode) {
          const numericCircleCode = getCircleCode(circleCode);
          apiUrl.searchParams.append("circlecode", numericCircleCode);
        }
        apiUrl.searchParams.append("amount", amount.toString());
        apiUrl.searchParams.append("orderid", result.transaction.id);
        apiUrl.searchParams.append("format", "json");

        const response = await fetch(apiUrl.toString(), { 
          method: "GET",
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        const textResponse = await response.text();
        
        let apiResponse;
        try {
          apiResponse = JSON.parse(textResponse);
        } catch (e) {
          apiResponse = { status: "error", message: textResponse };
        }
        
        apiResult = apiResponse;
        
        console.log("=== A1TOPUP API RESPONSE ===");
        console.log("Request URL:", apiUrl.toString());
        console.log("Response:", JSON.stringify(apiResponse, null, 2));
        console.log("=============================");
      }
    } catch (apiError) {
      // API call failed completely - treat as failure and refund
      const updatedTransaction = await prisma.$transaction(async (tx) => {
        const t = await tx.transaction.update({
          where: { id: result.transaction.id },
          data: {
            status: "REFUNDED",
            apiMessage: "Provider API error. Please try again.",
            apiReferenceId: null
          }
        });
        await tx.user.update({
           where: { id: session.user.id },
           data: { balance: { increment: amount } }
        });
        return t;
      });
      
      return NextResponse.json({ 
        error: "Provider API error. Please try again.",
        transaction: updatedTransaction 
      }, { status: 400 });
    }

    // Process API response in a single transaction
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      let finalStatus: "SUCCESS" | "FAILED" | "PENDING";
      let apiMessage: string;
      let apiReferenceId: string | null = null;
      let shouldRefund = false;

      if (providerId === "TEST") {
        const response = apiResult as {
          status: string;
          message: string;
          referenceId: string;
        };
        if (response.status === "success") {
          finalStatus = "SUCCESS";
          apiMessage = response.message;
          apiReferenceId = response.referenceId;
        } else if (response.status === "failure") {
          finalStatus = "FAILED";
          apiMessage = response.message;
          apiReferenceId = response.referenceId;
          shouldRefund = true;
        } else {
          finalStatus = "PENDING";
          apiMessage = response.message;
          apiReferenceId = response.referenceId;
        }
      } else if (providerId === "REALROBO") {
        const response = apiResult as any;
        if (response.status === "success") {
          finalStatus = "SUCCESS";
          apiMessage = response.remark || response.message || "Recharge successful";
          apiReferenceId = `${response.txid} [REQ_ID: ${response.req_id}]`;
        } else if (response.status === "failure") {
          finalStatus = "FAILED";
          apiMessage = response.remark || response.message || "Recharge failed at provider";
          apiReferenceId = `${response.txid} [REQ_ID: ${response.req_id}]`;
          shouldRefund = true;
        } else {
          finalStatus = "PENDING";
          apiMessage = response.remark || response.message || "Recharge status unknown";
          apiReferenceId = `${response.txid} [REQ_ID: ${response.req_id}]`;
        }
      } else if (providerId === "MROBOTICS") {
        const response = apiResult as any;
        if (response.status === "success") {
          finalStatus = "SUCCESS";
          apiMessage = response.response || response.errorMessage || "Recharge successful";
          apiReferenceId = `${response.tnx_id || ''} [ORDER_ID: ${response.id || ''}] [TX_ID: ${result.transaction.id}]`;
        } else if (response.status === "failure") {
          finalStatus = "FAILED";
          apiMessage = response.errorMessage || response.response || "Recharge failed at provider";
          apiReferenceId = `${response.tnx_id || ''} [ORDER_ID: ${response.id || ''}] [TX_ID: ${result.transaction.id}]`;
          shouldRefund = true;
        } else if (response.status === "pending") {
          finalStatus = "PENDING";
          apiMessage = response.errorMessage || response.response || "Recharge is pending";
          apiReferenceId = `${response.tnx_id || ''} [ORDER_ID: ${response.id || ''}] [TX_ID: ${result.transaction.id}]`;
        } else {
          finalStatus = "PENDING";
          apiMessage = response.errorMessage || response.response || "Recharge status unknown";
          apiReferenceId = `${response.tnx_id || ''} [ORDER_ID: ${response.id || ''}] [TX_ID: ${result.transaction.id}]`;
        }
      } else {
        // A1TopUp response
        const response = apiResult as any;
        const statusStr = response.status ? response.status.toLowerCase() : "failed";
        
        if (statusStr === "success") {
          finalStatus = "SUCCESS";
          apiMessage = response.message || "Recharge successful";
          const opidPart = response.opid ? ` [OPID: ${response.opid}]` : "";
          apiReferenceId = (response.transaction_id || response.txid || `API-${Date.now()}`) + opidPart + ` [TX_ID: ${result.transaction.id}]`;
        } else if (statusStr === "pending") {
          finalStatus = "PENDING";
          apiMessage = response.message || "Recharge is pending with operator";
          const opidPart = response.opid ? ` [OPID: ${response.opid}]` : "";
          apiReferenceId = (response.transaction_id || response.txid || "") + opidPart + ` [TX_ID: ${result.transaction.id}]`;
        } else {
          finalStatus = "FAILED";
          apiMessage = response.message || "Recharge failed at provider";
          apiReferenceId = (response.transaction_id || response.txid || "") + ` [TX_ID: ${result.transaction.id}]`;
          shouldRefund = true;
        }
      }

      // Update transaction
      const t = await tx.transaction.update({
        where: { id: result.transaction.id },
        data: {
          status: finalStatus,
          apiMessage: apiMessage,
          apiReferenceId: apiReferenceId,
          ...(finalStatus === "SUCCESS" ? {
            retailerCommission: rCommission,
            distributorCommission: distributorCommission,
            adminCommission: adminCommission
          } : {})
        }
      });

      // Handle refund if failed
      if (shouldRefund) {
        await tx.user.update({
           where: { id: session.user.id },
           data: { balance: { increment: amount } }
        });
      }

      // Update earnings if successful
      if (finalStatus === "SUCCESS") {
        if (rCommission > 0) {
          await tx.user.update({
            where: { id: session.user.id },
            data: { earnings: { increment: rCommission } }
          });
        }

        if (distributorCommission > 0 && result.distributorId) {
          await tx.user.update({
            where: { id: result.distributorId },
            data: { earnings: { increment: distributorCommission } }
          });
        }

        if (adminCommission > 0) {
          const adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
          if (adminUser) {
            await tx.user.update({
              where: { id: adminUser.id },
              data: { earnings: { increment: adminCommission } }
            });
          }
        }
      }

      return { transaction: t, status: finalStatus, message: apiMessage };
    });

    // Handle different response types based on status
    if (updatedTransaction.status === "PENDING") {
      return NextResponse.json({ 
        success: true, 
        message: "Recharge submitted and is currently pending",
        transaction: updatedTransaction.transaction 
      });
    }
    
    if (updatedTransaction.status === "FAILED") {
      return NextResponse.json({ 
        error: updatedTransaction.message,
        transaction: updatedTransaction.transaction 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Recharge completed successfully",
      transaction: updatedTransaction.transaction 
    });

  } catch (error: any) {
    if (error.message === "ACCOUNT_SUSPENDED") {
      return NextResponse.json({ error: "Your account has been suspended by the administrator." }, { status: 403 });
    }
    if (error.message === "Insufficient balance") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    
    console.error("Recharge processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
