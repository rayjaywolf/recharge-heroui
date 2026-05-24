import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth, prisma } from "@/lib/auth";
import { resolveDateRange } from "@/lib/date-range";

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

    const baseWhere = {
      userId: session.user.id,
      retailerCommission: { gt: 0 },
      createdAt: { gte: start, lte: end },
    };

    const [entries, periodAggregate, lifetimeAggregate] = await Promise.all([
      prisma.transaction.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: scope === "last90" ? 500 : scope === "last30" ? 300 : 200,
        select: {
          id: true,
          targetPhone: true,
          operator: true,
          amount: true,
          status: true,
          retailerCommission: true,
          createdAt: true,
        },
      }),
      prisma.transaction.aggregate({
        where: baseWhere,
        _sum: { retailerCommission: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          retailerCommission: { gt: 0 },
        },
        _sum: { retailerCommission: true },
      }),
    ]);

    return NextResponse.json({
      periodTotal: periodAggregate._sum.retailerCommission ?? 0,
      lifetimeTotal: lifetimeAggregate._sum.retailerCommission ?? 0,
      entries: entries.map((tx) => ({
        ...tx,
        createdAt: tx.createdAt.toISOString(),
      })),
      meta: {
        scope,
        from: start.toISOString(),
        to: end.toISOString(),
        count: periodAggregate._count,
      },
    });
  } catch (error) {
    console.error("Retailer earnings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
