import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth, prisma } from "@/lib/auth";
import { getAvailableProviders } from "@/lib/env-validation";
import { CIRCLES_BY_PROVIDER, getClientProviders } from "@/lib/recharge-config";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await prisma.commissionRule.findMany({
      select: { operator: true },
      orderBy: { operator: "asc" },
    });

    const liveProviders = getAvailableProviders();

    return NextResponse.json({
      operators: rules.map((r) => r.operator),
      providers: getClientProviders(liveProviders),
      circlesByProvider: CIRCLES_BY_PROVIDER,
    });
  } catch (error) {
    console.error("Recharge config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
