import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*", "/retailer/:path*", "/distributor/:path*"],
};
