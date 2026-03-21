import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireAdminApi } from "@/lib/admin";
import { notifyAdminListingPendingReview } from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      ownerId: true,
    },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }

  if (String(listing.status || "").toUpperCase() !== "PENDING_REVIEW") {
    return NextResponse.json(
      { ok: false, error: "Only pending-review listings can resend the admin review alert." },
      { status: 400 },
    );
  }

  const notice = await notifyAdminListingPendingReview({
    req,
    listingId: id,
    source: "api/admin/listings/[id]/resend-review-alert",
  });

  if (!notice?.ok) {
    return NextResponse.json(
      { ok: false, error: notice?.error || notice?.skipped || "Could not resend admin review alert." },
      { status: 502 },
    );
  }

  await audit({
    actorId: guard.me.id,
    action: "ADMIN_LISTING_REVIEW_ALERT_RESENT",
    entityType: "Listing",
    entityId: id,
    meta: {
      ownerId: listing.ownerId,
    },
  });

  return NextResponse.json({ ok: true });
}
