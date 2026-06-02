import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, user } from "@repo/db";
import { auth } from "@repo/server/auth";
import { setUserMpin, verifyUserMpin } from "@repo/server/mpin";
import { validateMpin } from "@repo/shared/mpin";
import {
  assertCanRegisterRetailer,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@repo/server/retailer-registration";
import { requireSession, type AppVariables } from "../middleware";

export const authRoutes = new Hono<{ Variables: AppVariables }>();

// Must be registered before the Better Auth `/api/auth/*` catch-all.
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
        accountStatus: "PENDING",
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

authRoutes.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

authRoutes.post("/api/profile/verify-mpin", requireSession, async (c) => {
  try {
    const session = c.get("session");
    if (session.user.role === "ADMIN") {
      return c.json({ success: true });
    }

    const body = await c.req.json();
    const mpin = typeof body?.mpin === "string" ? body.mpin.trim() : "";

    if (!validateMpin(mpin)) {
      return c.json({ error: "Valid 4-digit MPIN is required." }, 400);
    }

    const mpinOk = await verifyUserMpin(session.user.id, mpin);
    if (!mpinOk) {
      return c.json({ error: "Incorrect MPIN. Please try again." }, 401);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Verify MPIN error:", error);
    return c.json({ error: "Failed to verify MPIN." }, 500);
  }
});

authRoutes.post("/api/profile/set-mpin", requireSession, async (c) => {
  try {
    const session = c.get("session");
    if (session.user.role === "ADMIN") {
      return c.json({ error: "MPIN is not required for admin accounts." }, 400);
    }

    const body = await c.req.json();
    const password = typeof body?.password === "string" ? body.password : "";
    const mpin = typeof body?.mpin === "string" ? body.mpin.trim() : "";

    if (!password) {
      return c.json({ error: "Password is required." }, 400);
    }
    if (!validateMpin(mpin)) {
      return c.json({ error: "MPIN must be exactly 4 digits." }, 400);
    }

    const verify = await auth.api.verifyPassword({
      body: { password },
      headers: c.req.raw.headers,
    });

    if (!verify?.status) {
      return c.json({ error: "Incorrect password." }, 401);
    }

    await setUserMpin(session.user.id, mpin);

    return c.json({ success: true, message: "MPIN updated successfully." });
  } catch (error) {
    console.error("Set MPIN error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update MPIN.";
    return c.json({ error: message }, 500);
  }
});

authRoutes.post("/api/profile/change-name", requireSession, async (c) => {
  try {
    const session = c.get("session");
    const body = await c.req.json();
    const rawName = typeof body?.name === "string" ? body.name : "";
    const name = rawName.trim();

    if (name.length < 2 || name.length > 80) {
      return c.json({ error: "Name must be between 2 and 80 characters." }, 400);
    }

    await db
      .update(user)
      .set({ name })
      .where(eq(user.id, session.user.id));

    return c.json({ success: true, name });
  } catch (error) {
    console.error("Change name error:", error);
    return c.json({ error: "Failed to update name." }, 500);
  }
});
