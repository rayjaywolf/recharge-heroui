import { headers } from "next/headers";

function inferOriginFromHeaders(h: Headers): string {
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = h.get("host");
  if (host) {
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function serverApiFetch(path: string): Promise<Response> {
  const h = await headers();
  const origin = inferOriginFromHeaders(h);

  return fetch(`${origin}${path}`, {
    cache: "no-store",
    headers: {
      cookie: h.get("cookie") ?? "",
    },
  });
}
