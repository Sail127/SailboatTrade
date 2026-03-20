// app/api/images/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "This endpoint has been disabled. Use /api/uploads with the appropriate public, preview, or authenticated access flow.",
    },
    { status: 410 }
  );
}
