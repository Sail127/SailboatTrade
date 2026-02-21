// app/api/admin/listings/[id]/approve/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, status: true, paymentStatus: true, ownerId: true, plan: true },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (listing.paymentStatus !== "PAID") {
    return NextResponse.json({ ok: false, error: "Listing is not paid." }, { status: 400 });
  }

  // idempotent
  if (listing.status === "PUBLISHED") return NextResponse.json({ ok: true, alreadyPublished: true });

  const now = new Date();

  await prisma.listing.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: now,

      reviewedAt: now,
      reviewedById: guard.me.id,
      rejectionReason: null, // clear if previously rejected
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_APPROVE",
    entityType: "Listing",
    entityId: id,
    reason: null,
    meta: { plan: listing.plan, ownerId: listing.ownerId },
  });

  return NextResponse.json({ ok: true });
}
