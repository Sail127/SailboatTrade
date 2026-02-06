// middleware.js
import { NextResponse } from "next/server";

const PUBLIC_FILE =
  /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$/i;

function unauthorized() {
  const res = new NextResponse("Authentication required", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="SailboatTrade"');
  return res;
}

function safeDecodeBasic(encoded) {
  // Edge runtime-safe Base64 decode
  // encoded is base64("user:pass")
  try {
    return atob(encoded);
  } catch {
    return "";
  }
}

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // ✅ Always allow Next internals, API routes, and public/static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  /* ============================================
     1) SITE-WIDE PASSWORD (BASIC AUTH)
  ============================================ */
  const enabled = String(process.env.SITE_PASSWORD_ENABLED || "").toLowerCase() === "true";

  if (enabled) {
    const USER = process.env.SITE_PASSWORD_USER || "";
    const PASS = process.env.SITE_PASSWORD || "";

    // If enabled but missing env vars, fail CLOSED
    if (!USER || !PASS) return unauthorized();

    const auth = req.headers.get("authorization") || "";
    const [scheme, encoded] = auth.split(" ");

    if (scheme !== "Basic" || !encoded) return unauthorized();

    const decoded = safeDecodeBasic(encoded);
    const idx = decoded.indexOf(":");
    const u = idx >= 0 ? decoded.slice(0, idx) : "";
    const p = idx >= 0 ? decoded.slice(idx + 1) : "";

    if (u !== USER || p !== PASS) return unauthorized();
  }

  /* ============================================
     2) DASHBOARD SESSION PROTECTION
  ============================================ */
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("sbt_session")?.value;
    const hasSession = Boolean(token && token.length > 20);

    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + (search || ""));
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
