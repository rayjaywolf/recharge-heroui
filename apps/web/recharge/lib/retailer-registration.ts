import { prisma } from "@/lib/auth";
import {
  normalizePhoneNumber,
  phoneToPlaceholderEmail,
  validatePhoneNumber,
} from "@/lib/phone";

export type RetailerRegistrationInput = {
  name: string;
  phoneNumber: string;
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

  return {
    normalizedPhone,
    accountEmail: phoneToPlaceholderEmail(normalizedPhone),
    input: {
      name: String(body.name),
      phoneNumber: normalizedPhone,
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

/** Find retailer by phone or synthetic/real email used at sign-up. */
export async function findExistingRetailerApplicant(
  normalizedPhone: string,
  accountEmail: string,
) {
  return prisma.user.findFirst({
    where: {
      role: "RETAILER",
      OR: [
        { email: accountEmail },
        { phoneNumber: normalizedPhone },
        { whatsappNumber: normalizedPhone },
      ],
    },
  });
}

/** Remove a rejected applicant so Better Auth can create a fresh credential. */
export async function clearRejectedApplicantForReapply(userId: string) {
  const [txCount, fundCount] = await Promise.all([
    prisma.transaction.count({ where: { userId } }),
    prisma.fundRequest.count({ where: { retailerId: userId } }),
  ]);

  if (txCount > 0 || fundCount > 0) {
    throw new RegistrationConflictError(
      "This account cannot be re-registered online. Please contact support.",
      409,
    );
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
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

  if (existing.isRejected) {
    await clearRejectedApplicantForReapply(existing.id);
    return;
  }

  if (!existing.isApproved) {
    throw new RegistrationConflictError(
      "An application with this phone number is already pending review.",
      409,
    );
  }

  throw new RegistrationConflictError(
    "An account with this phone number already exists. Sign in instead.",
    409,
  );
}
