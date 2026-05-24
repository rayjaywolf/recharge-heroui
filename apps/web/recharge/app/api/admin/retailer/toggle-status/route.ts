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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
       return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
    }

    // Toggle the status
    const newStatus = !targetUser.isSuspended;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: newStatus }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ${newStatus ? 'suspended' : 'activated'} retailer ${updatedUser.name}`,
      isSuspended: updatedUser.isSuspended
    });

  } catch (error: any) {
    console.error("Toggle Status Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
