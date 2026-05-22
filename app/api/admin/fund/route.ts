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

    // Role verification
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, amount, actionType = "credit", remarks } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount or parameters" }, { status: 400 });
    }

    if (actionType !== "credit" && actionType !== "debit") {
       return NextResponse.json({ error: "Invalid action selected" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
       return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (actionType === "debit" && targetUser.balance < amount) {
       return NextResponse.json({ error: "Debit sum forcefully exceeds user capabilities. Cannot dip into negative balances." }, { status: 400 });
    }

    // Wrap the top-up entirely in a secure Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: actionType === "credit" ? { increment: amount } : { decrement: amount } }
      });

      const messageContent = remarks ? `[${actionType.toUpperCase()}] ${remarks}` : (actionType === "credit" ? `Credited manually by Administrator (${adminUser.name})` : `Debited manually by Administrator (${adminUser.name})`);

      const transaction = await tx.transaction.create({
        data: {
          userId: userId,
          targetPhone: "WALLET",
          operator: actionType === "credit" ? "MANUAL_CREDIT" : "MANUAL_DEBIT",
          amount: amount,
          status: "SUCCESS",
          apiMessage: messageContent,
        }
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ${actionType === "credit" ? "credited" : "debited"} ₹${amount} ${actionType === "credit" ? "to" : "from"} ${targetUser.name}`,
      balance: result.updatedUser.balance
    });

  } catch (error: any) {
    console.error("Fund Wallet Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
