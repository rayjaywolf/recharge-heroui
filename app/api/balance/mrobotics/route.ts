import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getMRoboticsBalance } from "@/lib/mrobotics";

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

    const balance = await getMRoboticsBalance();
    
    return NextResponse.json({ 
      success: true, 
      balance: balance.data,
      message: "MRobotics balance retrieved successfully" 
    });

  } catch (error: any) {
    console.error("MRobotics balance check error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to check MRobotics balance" 
    }, { status: 500 });
  }
}
