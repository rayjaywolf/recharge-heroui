import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

import type { AuthGetSessionResponse } from "@/lib/auth-session";
import { getDashboardPath } from "@/lib/dashboard-path";

function proxyApiToBackend(request: NextRequest) {
  const apiBase = process.env.API_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return NextResponse.json(
      { error: "API_URL is not configured on the web app." },
      { status: 503 },
    );
  }

  const target = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    apiBase,
  );

  const headers = new Headers(request.headers);
  const host = request.headers.get("host");
  if (host) {
    headers.set("x-forwarded-host", host);
  }
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  return NextResponse.rewrite(target, { request: { headers } });
}

async function fetchAuthSession(
  request: NextRequest,
): Promise<AuthGetSessionResponse> {
  const { data } = await betterFetch<AuthGetSessionResponse>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  );

  return data ?? null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return proxyApiToBackend(request);
  }

  const authSession = await fetchAuthSession(request);

  if (pathname === "/") {
    const role = authSession?.user?.role;
    if (role) {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url),
      );
    }
    return NextResponse.next();
  }

  const isDashboardRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/retailer") ||
    pathname.startsWith("/distributor");

  if (!isDashboardRoute) {
    return NextResponse.next();
  }

  if (!authSession?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = authSession.user.role as string | undefined;

  if (!role) {
    return NextResponse.next();
  }

  if (role === "RETAILER") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/distributor")) {
      return NextResponse.redirect(new URL("/retailer", request.url));
    }
  }

  if (role === "DISTRIBUTOR") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/retailer")) {
      return NextResponse.redirect(new URL("/distributor", request.url));
    }
  }

  if (role === "ADMIN") {
    if (
      pathname.startsWith("/retailer") ||
      pathname.startsWith("/distributor")
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/api/:path*",
    "/admin/:path*",
    "/retailer/:path*",
    "/distributor/:path*",
  ],
};
