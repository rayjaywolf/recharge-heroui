import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assertCanRegisterRetailer,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@/lib/retailer-registration";

export async function POST(req: Request) {
  try {
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
        whatsappNumber: normalizedPhone,
        address: input.address,
        pincode: input.pincode,
        state: input.state,
        aadharNumber: input.aadharNumber,
        panNumber: input.panNumber,
        gstNumber: input.gstNumber,
        businessType: input.businessType,
        distributorId: input.distributorId,
        isApproved: false,
        isRejected: false,
      } as never,
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted. You can sign in while awaiting approval.",
    });
  } catch (error) {
    if (error instanceof RegistrationConflictError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Register retailer error:", error);
    const message =
      error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
