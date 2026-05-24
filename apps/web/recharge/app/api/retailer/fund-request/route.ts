import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth, prisma } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, remarks } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid amount greater than zero." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        { error: "Amount must be a whole number." },
        { status: 400 }
      );
    }

    const retailer = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!retailer || retailer.role !== "RETAILER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!retailer.distributorId) {
      return NextResponse.json(
        {
          error:
            "No distributor is assigned to your account. Contact the administrator to add wallet balance.",
        },
        { status: 400 }
      );
    }

    const existingPending = await prisma.fundRequest.findFirst({
      where: {
        retailerId: retailer.id,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "You already have a pending fund request. Wait for your distributor to respond.",
        },
        { status: 409 }
      );
    }

    const request = await prisma.fundRequest.create({
      data: {
        retailerId: retailer.id,
        distributorId: retailer.distributorId,
        amount,
        remarks: remarks?.trim() || null,
      },
      include: {
        distributor: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Fund request of ₹${amount} sent to ${request.distributor.name}.`,
      request: {
        id: request.id,
        amount: request.amount,
        remarks: request.remarks,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Fund request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
