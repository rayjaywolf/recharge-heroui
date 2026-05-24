import { NextResponse } from "next/server";
import { auth, prisma } from "@/lib/auth";
import { headers } from "next/headers";
import {
  assertCanRegisterRetailer,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@/lib/retailer-registration";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributorUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (distributorUser?.role !== "DISTRIBUTOR") {
      return NextResponse.json({ error: "Forbidden. Distributor access required." }, { status: 403 });
    }

    const body = await req.json();
    const { normalizedPhone, accountEmail, input } =
      parseRetailerRegistrationInput(body);

    await assertCanRegisterRetailer(normalizedPhone, accountEmail);

    await auth.api.signUpEmail({
      body: {
        email: accountEmail,
        password: input.password,
        name: input.name,
        role: "RETAILER",
        distributorId: session.user.id,
        whatsappNumber: normalizedPhone,
        address: input.address,
        pincode: input.pincode,
        state: input.state,
        aadharNumber: input.aadharNumber,
        panNumber: input.panNumber,
        gstNumber: input.gstNumber,
        businessType: input.businessType,
        isApproved: false,
        isRejected: false,
      } as never,
    });

    return NextResponse.json({
      success: true,
      message: "Retailer created and assigned successfully."
    });

  } catch (error: unknown) {
    if (error instanceof RegistrationConflictError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create Retailer Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
