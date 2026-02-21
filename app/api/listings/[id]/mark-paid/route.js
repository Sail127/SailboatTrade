// app/api/listings/[id]/mark-paid/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing listing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const planRaw = String(body?.plan || "").toUpperCase().trim();
  const desiredPlan = planRaw === "STANDARD" ? "STANDARD" : "FEATURED_HOME";

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, ownerId: true, paymentStatus: true, status: true, previewToken: true },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });

  // idempotent
  if (listing.paymentStatus === "PAID") {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
    });
  }

  const now = new Date();
  const previewToken = listing.previewToken || crypto.randomUUID();

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      plan: desiredPlan,
      paymentProvider: "TEST",
      paymentStatus: "PAID",
      paymentSessionId: `test_${Date.now()}`,
      paidAt: now,

      status: "PENDING_REVIEW",
      submittedForReviewAt: now,

      previewToken,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_MARK_PAID_TEST",
    entityType: "Listing",
    entityId: listing.id,
    reason: null,
    meta: { plan: desiredPlan, ownerId: listing.ownerId },
  });

  return NextResponse.json({
    ok: true,
    redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
  });
}
