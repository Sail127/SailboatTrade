// middleware.js
import { NextResponse } from "next/server";

const PUBLIC_FILE =
  /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$/i;

function unauthorized(realm) {
  const res = new NextResponse("Authentication required", { status: 401 });
  // IMPORTANT: realm change forces browsers to re-prompt (credentials cache is per host+realm)
  res.headers.set("WWW-Authenticate", `Basic realm="${realm}"`);
  return res;
}

function safeDecodeBasic(encoded) {
  // Edge runtime-safe Base64 decode (encoded is base64("user:pass"))
  try {
    return atob(encoded);
  } catch {
    return "";
  }
}

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // ✅ Always allow Next internals, API routes, and public/static files
  // NOTE: We still apply basic auth to *pages* and everything else.
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
     Env vars expected:
       SITE_PASSWORD_ENABLED = "true"
       SITE_PASSWORD_USER    = "youruser"
       SITE_PASSWORD         = "yourpass"
       SITE_PASSWORD_REALM   = "SailboatTrade-v2" (optional)
  ============================================ */
  const enabled = String(process.env.SITE_PASSWORD_ENABLED || "").toLowerCase() === "true";
  if (enabled) {
    const USER = String(process.env.SITE_PASSWORD_USER || "");
    const PASS = String(process.env.SITE_PASSWORD || "");
    const REALM = String(process.env.SITE_PASSWORD_REALM || "SailboatTrade");

    // Fail CLOSED if enabled but missing creds
    if (!USER || !PASS) return unauthorized(REALM);

    const auth = req.headers.get("authorization") || "";
    const [scheme, encoded] = auth.split(" ");

    if (scheme !== "Basic" || !encoded) return unauthorized(REALM);

    const decoded = safeDecodeBasic(encoded);
    const idx = decoded.indexOf(":");
    const u = idx >= 0 ? decoded.slice(0, idx) : "";
    const p = idx >= 0 ? decoded.slice(idx + 1) : "";

    if (u !== USER || p !== PASS) return unauthorized(REALM);
  }

  /* ============================================
     2) DASHBOARD SESSION PROTECTION
  ============================================ */
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("sbt_session")?.value;
    const hasSession = Boolean(token && token.length > 20); // basic sanity check

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
