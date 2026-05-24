import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth, prisma } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        operator: {
          notIn: ["MANUAL_CREDIT", "MANUAL_DEBIT", "FUNDS_SENT", "FUNDS_RECEIVED"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        targetPhone: true,
        operator: true,
        amount: true,
        createdAt: true,
      },
    });

    const seen = new Set<string>();
    const recent = [];

    for (const tx of transactions) {
      if (seen.has(tx.targetPhone)) continue;
      seen.add(tx.targetPhone);
      recent.push({
        phone: tx.targetPhone,
        operator: tx.operator,
        lastAmount: tx.amount,
        lastRechargedAt: tx.createdAt,
      });
      if (recent.length >= 8) break;
    }

    return NextResponse.json({ recent });
  } catch (error) {
    console.error("Recent recharges error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
