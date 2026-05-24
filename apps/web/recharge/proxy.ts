import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/retailer")) {
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

  if (role === "RETAILER" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/retailer", request.url));
  }

  if (role === "ADMIN" && pathname.startsWith("/retailer")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/retailer/:path*"],
};
