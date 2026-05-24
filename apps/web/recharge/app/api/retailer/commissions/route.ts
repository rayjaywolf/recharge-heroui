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

    const rules = await prisma.commissionRule.findMany({
      orderBy: { operator: "asc" },
      select: {
        id: true,
        operator: true,
        retailerMargin: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      rules: rules.map((rule) => ({
        ...rule,
        updatedAt: rule.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Retailer commissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
