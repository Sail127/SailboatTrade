// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const user = process.env.SITE_USER;
  const pass = process.env.SITE_PASS;

  // If not configured, don't block anything
  if (!user || !pass) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow Next.js internals + public static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  // OPTIONAL: allow external webhooks (uncomment if needed)
  // if (pathname.startsWith("/api/resend/webhook")) return NextResponse.next();

  const auth = req.headers.get("authorization") || "";
  const [scheme, encoded] = auth.split(" ");

  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const [u, p] = decoded.split(":");
    if (u === user && p === pass) return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SailboatTrade (staging)"',
    },
  });
}

// Match all routes except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
