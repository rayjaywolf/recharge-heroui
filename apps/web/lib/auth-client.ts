"use client";

import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

/** Same-origin in production so /api/auth hits Vercel and is proxied to Koyeb. */
function getAuthBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  plugins: [phoneNumberClient()],
});
