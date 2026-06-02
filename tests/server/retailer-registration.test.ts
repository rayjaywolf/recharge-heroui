import { describe, expect, it } from "vitest";

import {
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
