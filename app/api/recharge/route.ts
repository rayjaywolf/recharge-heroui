import { NextResponse } from "next/server";
import { auth, prisma } from "@/lib/auth";
import { headers } from "next/headers";
import { validateProviderCredentials } from "@/lib/env-validation";
import {
  buildProviderAttemptChain,
  resolveProvidersForOperator,
  type RechargeProviderId,
} from "@/lib/operator-provider";
import {
  callRechargeProvider,
  parseRechargeProviderResponse,
  type ParsedRechargeResponse,
} from "@/lib/recharge-gateway";
import { PROVIDER_LABELS } from "@/lib/recharge-config";

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
    const { phone, operator, amount, circleCode, idempotencyKey } = body;

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

    const routing = await resolveProvidersForOperator(operator);
    const providerChain = buildProviderAttemptChain(routing);
    const primaryProvider = routing.primary;

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
          provider: primaryProvider,
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

    let usedProvider: RechargeProviderId = primaryProvider;
    let parsed: ParsedRechargeResponse = {
      finalStatus: "FAILED",
      apiMessage: "No provider available.",
      apiReferenceId: null,
      shouldRefund: true,
    };
    let usedBackup = false;
    let primaryFailedMessage: string | null = null;

    for (let i = 0; i < providerChain.length; i++) {
      const providerId = providerChain[i];
      if (i > 0) usedBackup = true;

      try {
        validateProviderCredentials(providerId);
        console.log("=== RECHARGE INITIATED ===");
        console.log("Provider:", providerId, i > 0 ? "(backup)" : "(primary)");
        console.log("Phone:", normalizedPhone);
        console.log("Operator:", operator);
        console.log("Amount:", amount);
        console.log("Circle Code:", circleCode);
        console.log("Transaction ID:", result.transaction.id);
        console.log("========================");

        const apiResult = await callRechargeProvider({
          providerId,
          phone: normalizedPhone,
          operator,
          amount,
          circleCode,
          transactionId: result.transaction.id,
        });

        console.log(`=== ${providerId} API RESPONSE ===`);
        console.log(JSON.stringify(apiResult, null, 2));
        console.log("===============================");

        parsed = parseRechargeProviderResponse(
          providerId,
          apiResult,
          result.transaction.id
        );
        usedProvider = providerId;

        if (parsed.finalStatus === "FAILED" && i === 0) {
          primaryFailedMessage = parsed.apiMessage;
        }

        if (parsed.finalStatus !== "FAILED") break;
        if (i < providerChain.length - 1) continue;
      } catch (apiError) {
        console.error(`Provider ${providerId} API error:`, apiError);
        parsed = {
          finalStatus: "FAILED",
          apiMessage: "Provider API error. Please try again.",
          apiReferenceId: null,
          shouldRefund: true,
        };
        usedProvider = providerId;
        if (i === 0) primaryFailedMessage = parsed.apiMessage;
        if (i < providerChain.length - 1) continue;
      }
    }

    let apiMessage = parsed.apiMessage;
    if (usedBackup) {
      const backupLabel =
        PROVIDER_LABELS[usedProvider as keyof typeof PROVIDER_LABELS] ??
        usedProvider;
      if (parsed.finalStatus === "FAILED") {
        apiMessage = primaryFailedMessage
          ? `[Primary failed: ${primaryFailedMessage}] [Backup ${backupLabel} failed: ${parsed.apiMessage}]`
          : `[Backup ${backupLabel} failed: ${parsed.apiMessage}]`;
      } else {
        apiMessage = `[Backup API: ${backupLabel}] ${parsed.apiMessage}`;
      }
    }

    const finalStatus = parsed.finalStatus;
    const apiReferenceId = parsed.apiReferenceId;
    const shouldRefund = parsed.shouldRefund;

    // Process API response in a single transaction
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // Update transaction
      const t = await tx.transaction.update({
        where: { id: result.transaction.id },
        data: {
          status: finalStatus,
          provider: usedProvider,
          apiMessage,
          apiReferenceId,
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
