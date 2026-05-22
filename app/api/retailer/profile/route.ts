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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            whatsappNumber: true,
            email: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      earnings: user.earnings,
      whatsappNumber: user.whatsappNumber,
      distributor: user.distributor
        ? {
            id: user.distributor.id,
            name: user.distributor.name,
            whatsappNumber: user.distributor.whatsappNumber,
            email: user.distributor.email,
          }
        : null,
    });
  } catch (error) {
    console.error("Retailer profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
