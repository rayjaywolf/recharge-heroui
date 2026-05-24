import { Hono } from "hono";
import { auth } from "@repo/server/auth";
import {
  assertCanRegisterRetailer,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@repo/server/retailer-registration";

export const authRoutes = new Hono();

authRoutes.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

authRoutes.post("/api/auth/register-retailer", async (c) => {
  try {
    const body = await c.req.json();
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

    return c.json({
      success: true,
      message: "Application submitted. You can sign in while awaiting approval.",
    });
  } catch (error) {
    if (error instanceof RegistrationConflictError) {
      return c.json(
        { error: error.message },
        error.status as 400 | 409,
      );
    }

    console.error("Register retailer error:", error);
    const message =
      error instanceof Error ? error.message : "Registration failed.";
    return c.json({ error: message }, 500);
  }
});
