// app/api/auth/logout/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sbt_session", "", { path: "/", maxAge: 0 });
  return res;
}
