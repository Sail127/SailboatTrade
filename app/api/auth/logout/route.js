// app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  clearSessionCookie();

  const accept = String(req.headers.get("accept") || "").toLowerCase();
  const wantsJson = accept.includes("application/json");

  if (!wantsJson) {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  return NextResponse.json({ ok: true, redirect: "/" });
}
