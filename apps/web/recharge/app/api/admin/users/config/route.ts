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

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role, distributorId } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "User ID and Role are required." }, { status: 400 });
    }

    if (role !== "RETAILER" && role !== "DISTRIBUTOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    // If making a user a DISTRIBUTOR or ADMIN, they shouldn't have a distributorId
    const updatedDistributorId = (role === "DISTRIBUTOR" || role === "ADMIN") ? null : (distributorId || null);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        distributorId: updatedDistributorId
      }
    });

    return NextResponse.json({
      success: true,
      message: "User configuration updated successfully.",
      user: updatedUser
    });

  } catch (error: any) {
    console.error("User Config Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
