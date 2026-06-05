import { and, count, eq, or } from "drizzle-orm";
import {
  account,
  db,
  fundRequest,
  session,
  transaction,
  user,
} from "@repo/db";
import { normalizeEmail, validateEmail } from "@repo/shared/email";
import { normalizePhoneNumber, validatePhoneNumber } from "@repo/shared/phone";

export type RetailerRegistrationInput = {
  name: string;
  phoneNumber: string;
  /** Contact email (required at sign-up). */
  email: string;
  password: string;
  address?: string;
  pincode?: string;
  state?: string;
  aadharNumber?: string;
  panNumber?: string;
  gstNumber?: string;
  businessType?: string;
  distributorId?: string;
};

export class RegistrationConflictError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RegistrationConflictError";
  }
}

type ExistingRetailerMatch = {
  phoneNumber: string | null;
  whatsappNumber: string | null;
  accountStatus: string;
};

export function buildRegistrationConflictMessage(
  existing: ExistingRetailerMatch,
  normalizedPhone: string,
): string {
  const phoneMatches =
    existing.phoneNumber === normalizedPhone ||
    existing.whatsappNumber === normalizedPhone;

  if (existing.accountStatus === "PENDING") {
    return phoneMatches
      ? "An application with this phone number is already pending review."
      : "An application with this email is already pending review.";
  }

  return phoneMatches
    ? "An account with this phone number already exists. Sign in instead."
    : "An account with this email already exists. Sign in instead.";
}

export function parseRetailerRegistrationInput(
  body: Record<string, unknown>,
): { normalizedPhone: string; accountEmail: string; input: RetailerRegistrationInput } {
  const rawPhone = body.phoneNumber ?? body.whatsappNumber;
  const normalizedPhone = rawPhone
    ? normalizePhoneNumber(String(rawPhone))
    : "";

  if (!body.name || !body.password || !normalizedPhone) {
    throw new RegistrationConflictError(
      "Name, phone number, and password are required.",
      400,
    );
  }

  if (!validatePhoneNumber(normalizedPhone)) {
    throw new RegistrationConflictError(
      "Enter a valid 10-digit Indian mobile number.",
      400,
    );
  }

  const rawEmail = body.email != null ? String(body.email).trim() : "";
  if (!rawEmail) {
    throw new RegistrationConflictError("Email is required.", 400);
  }

  const accountEmail = normalizeEmail(rawEmail);
  if (!validateEmail(accountEmail)) {
    throw new RegistrationConflictError("Enter a valid email address.", 400);
  }

  return {
    normalizedPhone,
    accountEmail,
    input: {
      name: String(body.name),
      phoneNumber: normalizedPhone,
      email: accountEmail,
      password: String(body.password),
      address: body.address ? String(body.address) : undefined,
      pincode: body.pincode ? String(body.pincode) : undefined,
      state: body.state ? String(body.state) : undefined,
      aadharNumber: body.aadharNumber ? String(body.aadharNumber) : undefined,
      panNumber: body.panNumber ? String(body.panNumber) : undefined,
      gstNumber: body.gstNumber ? String(body.gstNumber) : undefined,
      businessType: body.businessType ? String(body.businessType) : undefined,
      distributorId: body.distributorId ? String(body.distributorId) : undefined,
    },
  };
}

export async function findExistingRetailerApplicant(
  normalizedPhone: string,
  accountEmail: string,
) {
  const [existing] = await db
    .select()
    .from(user)
    .where(
      and(
        eq(user.role, "RETAILER"),
        or(
          eq(user.email, accountEmail),
          eq(user.phoneNumber, normalizedPhone),
          eq(user.whatsappNumber, normalizedPhone),
        ),
      ),
    )
    .limit(1);

  return existing ?? null;
}

export async function clearRejectedApplicantForReapply(userId: string) {
  const [[txRow], [fundRow]] = await Promise.all([
    db
      .select({ count: count() })
      .from(transaction)
      .where(eq(transaction.userId, userId)),
    db
      .select({ count: count() })
      .from(fundRequest)
      .where(eq(fundRequest.retailerId, userId)),
  ]);

  if ((txRow?.count ?? 0) > 0 || (fundRow?.count ?? 0) > 0) {
    throw new RegistrationConflictError(
      "This account cannot be re-registered online. Please contact support.",
      409,
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(user).where(eq(user.id, userId));
  });
}

export async function assertCanRegisterRetailer(
  normalizedPhone: string,
  accountEmail: string,
) {
  const existing = await findExistingRetailerApplicant(
    normalizedPhone,
    accountEmail,
  );

  if (!existing) return;

  if (existing.accountStatus === "REJECTED") {
    await clearRejectedApplicantForReapply(existing.id);
    return;
  }

  throw new RegistrationConflictError(
    buildRegistrationConflictMessage(existing, normalizedPhone),
    409,
  );
}
