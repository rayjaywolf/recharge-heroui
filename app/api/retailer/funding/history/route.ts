import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth, prisma } from "@/lib/auth";

const WALLET_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_RECEIVED",
  "FUNDS_SENT",
] as const;

function labelForOperator(operator: string): string {
  switch (operator) {
    case "MANUAL_CREDIT":
      return "Admin wallet credit";
    case "MANUAL_DEBIT":
      return "Admin wallet debit";
    case "FUNDS_RECEIVED":
      return "Received from distributor";
    case "FUNDS_SENT":
      return "Sent to retailer";
    default:
      return operator;
  }
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [transactions, requests] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          operator: { in: [...WALLET_OPERATORS] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          amount: true,
          operator: true,
          status: true,
          apiMessage: true,
          createdAt: true,
        },
      }),
      prisma.fundRequest.findMany({
        where: { retailerId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          amount: true,
          remarks: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const txItems = transactions.map((tx) => ({
      kind: "transaction" as const,
      id: tx.id,
      amount: tx.amount,
      status: tx.status,
      title: labelForOperator(tx.operator),
      subtitle: tx.apiMessage || tx.operator,
      createdAt: tx.createdAt.toISOString(),
      direction: tx.operator === "MANUAL_DEBIT" ? "debit" : "credit",
    }));

    const requestItems = requests.map((req) => ({
      kind: "request" as const,
      id: req.id,
      amount: req.amount,
      status: req.status,
      title: "Fund request to distributor",
      subtitle: req.remarks || "Awaiting distributor approval",
      createdAt: req.createdAt.toISOString(),
      direction: "credit" as const,
    }));

    const items = [...txItems, ...requestItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Funding history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
