import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth, prisma } from "@/lib/auth";
import { resolveDateRange } from "@/lib/date-range";

const EXCLUDED_OPERATORS = [
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "FUNDS_SENT",
  "FUNDS_RECEIVED",
];

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    let start: Date;
    let end: Date;
    let scope: string;

    try {
      ({ start, end, scope } = resolveDateRange(searchParams));
    } catch (e) {
      if ((e as Error).message === "INVALID_CUSTOM_RANGE") {
        return NextResponse.json(
          {
            error:
              "Invalid custom date range. Provide from and to (YYYY-MM-DD).",
          },
          { status: 400 }
        );
      }
      throw e;
    }

    const take =
      scope === "last90" ? 500 : scope === "last30" ? 300 : 200;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        operator: { notIn: EXCLUDED_OPERATORS },
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        targetPhone: true,
        operator: true,
        amount: true,
        status: true,
        provider: true,
        apiReferenceId: true,
        apiMessage: true,
        circleCode: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        ...tx,
        createdAt: tx.createdAt.toISOString(),
      })),
      meta: {
        scope,
        from: start.toISOString(),
        to: end.toISOString(),
        count: transactions.length,
      },
    });
  } catch (error) {
    console.error("Transactions list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
