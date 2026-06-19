import { describe, expect, it } from "vitest";

import {
  buildRegistrationConflictMessage,
  parseRetailerRegistrationInput,
  RegistrationConflictError,
} from "@repo/server/retailer-registration";

describe("parseRetailerRegistrationInput", () => {
  const baseBody = {
    name: "Test Retailer",
    storeName: "Test Store",
    phoneNumber: "9876543210",
    password: "secret123",
    email: "retailer@example.com",
  };

  it("requires store name", () => {
    expect(() =>
      parseRetailerRegistrationInput({
        ...baseBody,
        storeName: "  ",
      }),
    ).toThrow(RegistrationConflictError);
  });

  it("requires email", () => {
    expect(() =>
      parseRetailerRegistrationInput({
        name: baseBody.name,
        phoneNumber: baseBody.phoneNumber,
        password: baseBody.password,
      }),
    ).toThrow(RegistrationConflictError);
  });

  it("uses normalized email when provided", () => {
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
        email: "9876543210@phone.rechargepro.local",
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
