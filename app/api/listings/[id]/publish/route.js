// app/api/listings/[id]/publish/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_EXPIRE_DAYS = 30;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function requiresPaidUpgrade(listing) {
  const addons = Array.isArray(listing?.billingAddons) ? listing.billingAddons : [];
  const hasPhotoPlus = listing?.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");
  const hasFeatured = !!listing?.featuredHome || addons.includes("FEATURED_HOME");
  return hasPhotoPlus || hasFeatured;
}

export async function POST(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      status: true,
      photoPlan: true,
      featuredHome: true,
      billingAddons: true,
      billingTermMonths: true,
    },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const termMonths = Number(listing.billingTermMonths || 1);
  const expiresAt = requiresPaidUpgrade(listing) ? addMonths(now, termMonths) : addDays(now, FREE_EXPIRE_DAYS);

  const updated = await prisma.listing.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      expiresAt,
      renewalReminderLastSentAt: null,
      expiredEmailSentAt: null,
      archivedAt: null,
      archivedImagesPrunedAt: null,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_PUBLISH",
    entityType: "Listing",
    entityId: id,
    reason: null,
    meta: { ownerId: listing.ownerId },
  });

  return NextResponse.json({ ok: true, listing: updated });
}
