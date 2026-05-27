import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import {
  account,
  db,
  session,
  user,
  verification,
} from "@repo/db";
import {
  normalizePhoneNumber,
  validatePhoneNumber,
} from "@repo/shared/phone";

import { assignRandomMpin } from "./mpin";
import "./startup-validation";

export { db } from "@repo/db";

const publicAppUrl =
  process.env.WEB_ORIGIN?.replace(/\/$/, "") ??
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export const auth = betterAuth({
  baseURL: publicAppUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  trustedOrigins: [
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL,
    process.env.WEB_ORIGIN,
    "flutter://",
    "exp://",
  ].filter((origin): origin is string => Boolean(origin)),
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "RETAILER",
      },
      balance: {
        type: "number",
        defaultValue: 0,
      },
      isSuspended: {
        type: "boolean",
        defaultValue: false,
      },
      isApproved: {
        type: "boolean",
        defaultValue: false,
      },
      isRejected: {
        type: "boolean",
        defaultValue: false,
      },
      whatsappNumber: { type: "string", required: false },
      address: { type: "string", required: false },
      pincode: { type: "string", required: false },
      state: { type: "string", required: false },
      aadharNumber: { type: "string", required: false },
      panNumber: { type: "string", required: false },
      gstNumber: { type: "string", required: false },
      businessType: { type: "string", required: false },
      distributorId: {
        type: "string",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const role = (createdUser as { role?: string }).role ?? "RETAILER";

          if (role !== "ADMIN") {
            await assignRandomMpin(createdUser.id, true);
          }

          const whatsapp = (createdUser as { whatsappNumber?: string | null })
            .whatsappNumber;
          const existingPhone = (createdUser as { phoneNumber?: string | null })
            .phoneNumber;

          if (existingPhone || !whatsapp) return;

          const normalized = normalizePhoneNumber(whatsapp);
          if (!validatePhoneNumber(normalized)) return;

          await db
            .update(user)
            .set({
              phoneNumber: normalized,
              phoneNumberVerified: true,
            })
            .where(eq(user.id, createdUser.id));
        },
      },
    },
  },
  plugins: [
    phoneNumber({
      phoneNumberValidator: async (value) => validatePhoneNumber(value),
      sendOTP: ({ phoneNumber: phone, code }) => {
        if (process.env.NODE_ENV === "production") {
          console.warn(
            `[auth] OTP for ${phone}: configure SMS provider (code not logged in production)`,
          );
        } else {
          console.info(`[auth] OTP for ${phone}: ${code}`);
        }
      },
    }),
  ],
});
