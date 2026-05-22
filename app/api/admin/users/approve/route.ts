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

    const admin = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (admin?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isApproved: true }
    });

    return NextResponse.json({ success: true, message: `User ${updatedUser.name} approved successfully.` });
  } catch (error) {
    console.error("Admin approval error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
