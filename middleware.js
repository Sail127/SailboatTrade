import { NextResponse } from "next/server";

const PUBLIC_FILE =
  /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$/i;

const IS_PROD = process.env.NODE_ENV === "production";
const FORCE_HTTPS = String(process.env.FORCE_HTTPS || "true").toLowerCase() !== "false";
const CANONICAL_HOST = String(process.env.CANONICAL_HOST || "").trim().toLowerCase();

function buildCsp() {
  const scriptSrc = [
    "'self'",
    // Next.js injects small inline bootstrap/runtime scripts needed for hydration.
    "'unsafe-inline'",
    !IS_PROD ? "'unsafe-eval'" : "",
    "https://www.paypal.com",
    "https://www.paypalobjects.com",
    "https://va.vercel-scripts.com",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "img-src 'self' data: blob: https:",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data: https:",
    "connect-src 'self' https://www.paypal.com https://*.paypal.com https://vitals.vercel-insights.com",
    "frame-src 'self' https://*.paypal.com https://www.paypal.com",
    "worker-src 'self' blob:",
    "form-action 'self'",
  ].join("; ");
}

function withSecurityHeaders(res) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("Content-Security-Policy", buildCsp());

  if (IS_PROD) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return res;
}

function unauthorized(realm) {
  const res = new NextResponse("Authentication required", { status: 401 });
  res.headers.set("WWW-Authenticate", `Basic realm="${realm}"`);
  return withSecurityHeaders(res);
}

function safeDecodeBasic(encoded) {
  try {
    return atob(encoded);
  } catch {
    return "";
  }
}

function isLocalHost(host) {
  const h = String(host || "").toLowerCase();
  return h.startsWith("localhost") || h.startsWith("127.0.0.1") || h.startsWith("[::1]");
}

function protocolFromRequest(req) {
  const xfProto = String(req.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim();
  if (xfProto) return xfProto.toLowerCase();
  return req.nextUrl.protocol.replace(":", "").toLowerCase();
}

function hostFromRequest(req) {
  return (
    String(req.headers.get("x-forwarded-host") || "").split(",")[0]?.trim() ||
    req.nextUrl.host ||
    String(req.headers.get("host") || "").trim()
  );
}

function maybeRedirectToSecureCanonical(req) {
  const host = hostFromRequest(req);
  const proto = protocolFromRequest(req);

  if (!host || isLocalHost(host)) return null;

  if (IS_PROD && CANONICAL_HOST && host.toLowerCase() !== CANONICAL_HOST) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    return withSecurityHeaders(NextResponse.redirect(url, 308));
  }

  if (IS_PROD && FORCE_HTTPS && proto !== "https") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    return withSecurityHeaders(NextResponse.redirect(url, 308));
  }

  return null;
}

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  const secureRedirect = maybeRedirectToSecureCanonical(req);
  if (secureRedirect) return secureRedirect;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  const enabled = String(process.env.SITE_PASSWORD_ENABLED || "").toLowerCase() === "true";
  if (enabled) {
    const USER = String(process.env.SITE_PASSWORD_USER || "");
    const PASS = String(process.env.SITE_PASSWORD || "");
    const REALM = String(process.env.SITE_PASSWORD_REALM || "SailboatTrade");

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

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("sbt_session")?.value;
    const hasSession = Boolean(token && token.length > 20);

    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + (search || ""));
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};
