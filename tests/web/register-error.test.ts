import { describe, expect, it } from "vitest";

import { getRegisterErrorMessage } from "@/app/register/register-error";

describe("getRegisterErrorMessage", () => {
  it("surfaces API conflict message for existing phone", () => {
    expect(
      getRegisterErrorMessage({
        error: "An account with this phone number already exists. Sign in instead.",
      }),
    ).toBe("An account with this phone number already exists. Sign in instead.");
  });

  it("surfaces API conflict message for existing email", () => {
    expect(
      getRegisterErrorMessage({
        error: "An application with this email is already pending review.",
      }),
    ).toBe("An application with this email is already pending review.");
  });

  it("falls back to generic message when payload is missing error", () => {
    expect(getRegisterErrorMessage({ message: "nope" })).toBe(
      "Registration failed.",
    );
    expect(getRegisterErrorMessage(null)).toBe("Registration failed.");
  });
});
