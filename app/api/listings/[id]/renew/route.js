// app/api/listings/[id]/renew/route.js
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_EXPIRE_DAYS = 30;

export async function POST(req, { params }) {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

  const listing = await prisma.listing.findFirst({
    where: { id, ownerId: s.uid },
    select: {
      id: true,
      status: true,
      billingStatus: true,
      billingAddons: true,
      photoPlan: true,
      featuredHome: true,
    },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  const status = String(listing.status || "").toUpperCase();

  const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];
  const isPaid = listing.photoPlan === "PHOTO_PLUS_25" || !!listing.featuredHome || addons.length > 0;

  // Paid renew should be via checkout, not this endpoint
  if (isPaid) {
    return NextResponse.json({ ok: false, error: "Paid listings must be renewed via checkout." }, { status: 400 });
  }

  // Free renew: set expiresAt from now, and republish if archived
  if (!["ARCHIVED", "PUBLISHED"].includes(status)) {
    return NextResponse.json({ ok: false, error: "Only published or archived listings can be renewed." }, { status: 400 });
  }
  const newExpiresAt = new Date(Date.now() + FREE_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

  const nextStatus = status === "ARCHIVED" ? "PUBLISHED" : listing.status;

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: nextStatus,
      featuredHome: false, // safe: free renew never auto-features
      expiresAt: newExpiresAt, // only used for FREE listings
      renewalReminderLastSentAt: null,
      expiredEmailSentAt: null,
      archivedAt: null,
      archivedImagesPrunedAt: null,
    },
  });

  return NextResponse.json({ ok: true, status: nextStatus, expiresAt: newExpiresAt.toISOString() });
}
