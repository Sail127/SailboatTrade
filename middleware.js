import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$/i;

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

  // ✅ Protect dashboard only
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
