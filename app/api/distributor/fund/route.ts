import { NextResponse } from "next/server";
import { auth, prisma } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributorUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (distributorUser?.role !== "DISTRIBUTOR") {
      return NextResponse.json({ error: "Forbidden. Distributor access required." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, amount, remarks, idempotencyKey } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount or parameters" }, { status: 400 });
    }

    if (idempotencyKey) {
      const existing = await prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (existing) {
         return NextResponse.json({ error: "Duplicate action detected. Request is already processing." }, { status: 409 });
      }
    }

    const targetRetailer = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetRetailer) {
       return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
    }

    if (targetRetailer.distributorId !== session.user.id) {
       return NextResponse.json({ error: "Retailer is not assigned to you." }, { status: 403 });
    }

    if (distributorUser.balance < amount) {
       return NextResponse.json({ error: "Insufficient wallet balance." }, { status: 400 });
    }

    // Wrap the top-up entirely in a secure Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from distributor with race-condition guard
      const updatedDistributor = await tx.user.update({
        where: { id: session.user.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } }
      });

      // Add to retailer
      const updatedRetailer = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } }
      });

      // Create ledger for distributor sending out
      const distTx = await tx.transaction.create({
        data: {
          userId: session.user.id,
          targetPhone: "DIST_FUNDS_TRANSFER",
          operator: "FUNDS_SENT",
          amount: amount,
          status: "SUCCESS",
          apiMessage: remarks ? `[FUNDS_SENT] ${remarks}` : `Transferred ${amount} to retailer ${updatedRetailer.name}`,
          idempotencyKey: idempotencyKey || undefined
        }
      });

      // Create ledger for retailer receiving
      const retTx = await tx.transaction.create({
        data: {
          userId: userId,
          targetPhone: "RECEIVED_FUNDS",
          operator: "FUNDS_RECEIVED",
          amount: amount,
          status: "SUCCESS",
          apiMessage: remarks ? `[FUNDS_RECEIVED] ${remarks}` : `Received ${amount} from distributor ${distributorUser.name}`,
        }
      });

      return { updatedDistributor, updatedRetailer, distTx, retTx };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ₹${amount} to ${targetRetailer.name}`,
      balance: result.updatedDistributor.balance
    });

  } catch (error: any) {
    console.error("Distributor Fund Wallet Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
