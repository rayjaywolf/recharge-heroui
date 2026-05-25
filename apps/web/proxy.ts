import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return proxyApiToBackend(request);
  }

  const isDashboardRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/retailer") ||
    pathname.startsWith("/distributor");

  if (!isDashboardRoute) {
    return NextResponse.next();
  }

  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );

  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = session.user.role as string;

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
  matcher: ["/api/:path*", "/admin/:path*", "/retailer/:path*", "/distributor/:path*"],
};
