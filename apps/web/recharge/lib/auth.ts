import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePhoneNumber, validatePhoneNumber } from "./phone";
import "./startup-validation"; // This will run environment validation at startup

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins: [
        "http://localhost:3000",
        process.env.BETTER_AUTH_URL,
        // Flutter / Expo clients (flutter_better_auth)
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
            }
        }
    },
    emailAndPassword: {
        enabled: true,
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    const whatsapp = (user as { whatsappNumber?: string | null })
                        .whatsappNumber;
                    const existingPhone = (user as { phoneNumber?: string | null })
                        .phoneNumber;

                    if (existingPhone || !whatsapp) return;

                    const normalized = normalizePhoneNumber(whatsapp);
                    if (!validatePhoneNumber(normalized)) return;

                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            phoneNumber: normalized,
                            phoneNumberVerified: true,
                        },
                    });
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