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
import { notifyAdminsRetailerPendingApproval } from "./notifications";
import { assignUserAvatar } from "./user-avatar";
import "./startup-validation";

export { db } from "@repo/db";

/** Web dashboard (may proxy `/api/*` through Next). */
const webOrigin = process.env.WEB_ORIGIN?.replace(/\/$/, "");
/** Public API URL — used by the retailer mobile app and direct API clients. */
const apiOrigin = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");

const extraTrustedOrigins =
  process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ??
  [];

const authFallbackUrl =
  apiOrigin ?? webOrigin ?? "http://localhost:3001";

/** Dev: accept requests from LAN IPs / emulators (physical device USB debugging). */
const devAllowedHosts = [
  "localhost:*",
  "127.0.0.1:*",
  "10.0.2.2:*",
  "192.168.*.*:*",
  "10.*.*.*:*",
  "172.*.*.*:*",
] as const;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Pin the cookie security flag instead of inferring it from each instance's
 * baseURL. The Koyeb API (sets the cookie) and the Vercel web app (reads it via
 * `auth.api.getSession`) run separate Better Auth instances; if they disagree on
 * `useSecureCookies`, they look for different cookie names (`__Secure-…` vs `…`)
 * and the web app bounces freshly signed-in users back to /login.
 */
const useSecureCookies =
  process.env.BETTER_AUTH_SECURE_COOKIES === "true" ||
  (process.env.BETTER_AUTH_SECURE_COOKIES !== "false" &&
    process.env.NODE_ENV === "production");

export const auth = betterAuth({
  // Prefer API URL so mobile + Koyeb sessions match the host clients call.
  // In dev, resolve per-request host so `http://192.168.x.x:3001` works on device.
  baseURL: isProduction
    ? authFallbackUrl
    : {
        allowedHosts: [...devAllowedHosts],
        protocol: "auto",
        fallback: authFallbackUrl,
      },
  advanced: {
    useSecureCookies,
  },
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
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://10.0.2.2:3001",
    "http://localhost:*",
    "http://127.0.0.1:*",
    "http://10.0.2.2:*",
    "http://192.168.*.*:*",
    "http://10.*.*.*:*",
    apiOrigin,
    webOrigin,
    ...extraTrustedOrigins,
    "flutter://",
    "exp://",
    "capacitor://localhost",
  ].filter((origin): origin is string => Boolean(origin)),
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "RETAILER",
        input: false,
      },
      balance: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      accountStatus: {
        type: "string",
        defaultValue: "PENDING",
        input: false,
      },
      storeName: { type: "string", required: false },
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

          if (role === "RETAILER") {
            const accountStatus =
              (createdUser as { accountStatus?: string }).accountStatus ??
              "PENDING";
            if (accountStatus === "PENDING") {
              await notifyAdminsRetailerPendingApproval({
                retailerId: createdUser.id,
                retailerName: createdUser.name,
              });
            }
          }

          if (!createdUser.image?.trim()) {
            const displayName =
              createdUser.name?.trim() ||
              createdUser.email ||
              createdUser.id;
            await assignUserAvatar(createdUser.id, displayName);
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
