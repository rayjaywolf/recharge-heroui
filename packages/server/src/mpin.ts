import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db, user } from "@repo/db";
import { generateRandomMpin, validateMpin } from "@repo/shared/mpin";

const scryptAsync = promisify(scrypt);

export async function hashMpin(mpin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(mpin, salt, 32)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyMpinHash(mpin: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const derived = (await scryptAsync(mpin, salt, 32)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}

export async function assignRandomMpin(userId: string, mustReset = true) {
  const mpinHash = await hashMpin(generateRandomMpin());
  await db
    .update(user)
    .set({ mpinHash, mpinMustReset: mustReset })
    .where(eq(user.id, userId));
  return mpinHash;
}

/** Backfill legacy users missing MPIN (non-admin only). */
export async function ensureUserMpinBackfill(
  userId: string,
  role: string,
): Promise<{ mpinMustReset: boolean }> {
  if (role === "ADMIN") {
    return { mpinMustReset: false };
  }

  const [found] = await db
    .select({ mpinHash: user.mpinHash, mpinMustReset: user.mpinMustReset })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!found) {
    return { mpinMustReset: false };
  }

  if (!found.mpinHash) {
    await assignRandomMpin(userId, true);
    return { mpinMustReset: true };
  }

  return { mpinMustReset: found.mpinMustReset };
}

export async function setUserMpin(userId: string, mpin: string) {
  if (!validateMpin(mpin)) {
    throw new Error("MPIN must be exactly 4 digits.");
  }

  const mpinHash = await hashMpin(mpin);
  await db
    .update(user)
    .set({ mpinHash, mpinMustReset: false })
    .where(eq(user.id, userId));
}
