// app/api/listings/[id]/submit-for-review/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const s = await readSession();
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (listing.ownerId !== s.uid) return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });

  if (listing.paymentStatus !== "PAID") {
    return NextResponse.json(
      { ok: false, error: "Payment required before submitting for review." },
      { status: 400 }
    );
  }

  const now = new Date();

  await prisma.listing.update({
    where: { id },
    data: {
      status: "PENDING_REVIEW",
      submittedForReviewAt: now,

      // clear old rejection info on resubmit
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
  });

  return NextResponse.json({ ok: true });
}
