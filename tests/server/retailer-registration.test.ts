import { describe, expect, it } from "vitest";

import {
  buildRegistrationConflictMessage,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@repo/server/retailer-registration";
import { phoneToPlaceholderEmail } from "@repo/shared/phone";

describe("parseRetailerRegistrationInput", () => {
  const baseBody = {
    name: "Test Retailer",
    phoneNumber: "9876543210",
    password: "secret123",
  };

  it("uses placeholder email when email is omitted", () => {
    const { accountEmail, input } = parseRetailerRegistrationInput(baseBody);
    expect(accountEmail).toBe(phoneToPlaceholderEmail("9876543210"));
    expect(input.email).toBeUndefined();
  });

  it("uses real email when provided", () => {
    const { accountEmail, input } = parseRetailerRegistrationInput({
      ...baseBody,
      email: "  Retailer@Example.COM ",
    });
    expect(accountEmail).toBe("retailer@example.com");
    expect(input.email).toBe("retailer@example.com");
  });

  it("rejects invalid email", () => {
    expect(() =>
      parseRetailerRegistrationInput({ ...baseBody, email: "not-an-email" }),
    ).toThrow(RegistrationConflictError);
  });

  it("rejects placeholder-domain email", () => {
    expect(() =>
      parseRetailerRegistrationInput({
        ...baseBody,
        email: phoneToPlaceholderEmail("9876543210"),
      }),
    ).toThrow(RegistrationConflictError);
  });
});

describe("buildRegistrationConflictMessage", () => {
  const base = {
    phoneNumber: "9876543210",
    whatsappNumber: "9876543210",
  };

  it("returns pending-phone message when phone matches", () => {
    const message = buildRegistrationConflictMessage(
      { ...base, accountStatus: "PENDING" },
      "9876543210",
    );
    expect(message).toBe(
      "An application with this phone number is already pending review.",
    );
  });

  it("returns pending-email message when phone does not match", () => {
    const message = buildRegistrationConflictMessage(
      { ...base, accountStatus: "PENDING" },
      "9998887776",
    );
    expect(message).toBe(
      "An application with this email is already pending review.",
    );
  });

  it("returns existing-phone message when approved account shares phone", () => {
    const message = buildRegistrationConflictMessage(
      { ...base, accountStatus: "APPROVED" },
      "9876543210",
    );
    expect(message).toBe(
      "An account with this phone number already exists. Sign in instead.",
    );
  });

  it("returns existing-email message when approved account matches by email", () => {
    const message = buildRegistrationConflictMessage(
      { ...base, accountStatus: "APPROVED" },
      "9998887776",
    );
    expect(message).toBe(
      "An account with this email already exists. Sign in instead.",
    );
  });
});
