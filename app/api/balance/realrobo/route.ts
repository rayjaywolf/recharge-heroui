import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getRealRoboBalance } from "@/lib/realrobo";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const balance = await getRealRoboBalance();
    
    return NextResponse.json({ 
      success: true, 
      balance: balance.data.balance,
      message: balance.msg 
    });

  } catch (error: any) {
    console.error("RealRobo balance check error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to check RealRobo balance" 
    }, { status: 500 });
  }
}
