// app/api/listings/[id]/submit/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifyAdminListingPendingReview } from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 3;
const MAX_LIMIT = 25;

function isActivePaidPlan(listing) {
  const photoPlan = String(listing?.photoPlan || "FREE_3").toUpperCase();
  const billingStatus = String(listing?.billingStatus || "FREE").toUpperCase();

  if (photoPlan !== "PHOTO_PLUS_25") return false;

  // ACTIVE = good. (PAST_DUE: you can choose to block; here we block.)
  if (billingStatus === "ACTIVE") return true;

  // If you want to allow grace period / cancel-at-period-end logic, do it here.
  return false;
}

export async function POST(req, { params }) {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || "FREE").toUpperCase();

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        status: true,

        imageUrls: true,

        photoPlan: true,
        featuredHome: true,

        billingStatus: true,
        billingProvider: true,
        billingAddons: true,
        billingMonthlyCents: true,

        // review fields
        contentReviewStatus: true,
        contentSubmittedAt: true,
        contentReviewedAt: true,
        contentReviewedById: true,
        contentRejectionReason: true,

        rejectionReason: true,
        reviewedAt: true,
        reviewedById: true,
      },
    });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    const status = String(listing.status || "").toUpperCase();

    // ✅ Only allow submit from DRAFT or REJECTED
    if (!["DRAFT", "REJECTED"].includes(status)) {
      if (status === "PENDING_REVIEW") {
        return NextResponse.json(
          { ok: false, error: "This listing is already pending review." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: `Cannot submit listing in status: ${status}.` },
        { status: 409 }
      );
    }

    const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;
    if (photoCount > MAX_LIMIT) {
      return NextResponse.json({ ok: false, error: `Max ${MAX_LIMIT} photos.` }, { status: 400 });
    }

    // -------------------------
    // FREE submit
    // -------------------------
    if (mode === "FREE") {
      if (photoCount > FREE_LIMIT) {
        return NextResponse.json(
          { ok: false, error: `Free listings allow up to ${FREE_LIMIT} photos. Remove photos or upgrade.` },
          { status: 400 }
        );
      }

      // FREE submit sets plan back to FREE and clears subscription data
      await prisma.listing.update({
        where: { id },
        data: {
          photoPlan: "FREE_3",
          featuredHome: false,
          billingStatus: "FREE",
          billingProvider: null,
          billingAddons: [],
          billingMonthlyCents: null,
          billingTermMonths: null,
          billingCurrentPeriodStart: null,
          billingCurrentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          lastPaidAt: null,

          status: "PENDING_REVIEW",
          contentReviewStatus: "PENDING",
          contentSubmittedAt: new Date(),

          // clear prior rejections (optional but helpful)
          rejectionReason: null,
          reviewedAt: null,
          reviewedById: null,
          contentReviewedAt: null,
          contentReviewedById: null,
          contentRejectionReason: null,
          expiresAt: null,
          archivedAt: null,
          archivedImagesPrunedAt: null,
        },
      });
      try {
        await prisma.adminAuditLog.create({
          data: {
            actorId: s.uid,
            action: "LISTING_NEW_REVIEW_SUBMIT",
            entityType: "Listing",
            entityId: id,
            meta: {
              reviewType: "NEW_LISTING_REVIEW",
              changedSections: [],
            },
          },
        });
      } catch {}
      await notifyAdminListingPendingReview({
        req,
        listingId: id,
        source: "api/listings/[id]/submit FREE",
      });

      return NextResponse.json({ ok: true, redirect: `/listings/${id}` });
    }

    // -------------------------
    // PAID submit (no checkout) if already subscribed/active
    // -------------------------
    if (mode === "PAID") {
      const okPaid = isActivePaidPlan(listing);
      if (!okPaid) {
        return NextResponse.json(
          { ok: false, error: "No active billing found for Photo Plus." },
          { status: 400 }
        );
      }

      // paid plan allows up to 25 (already enforced above)
      await prisma.listing.update({
        where: { id },
        data: {
          // keep billing fields intact
          photoPlan: "PHOTO_PLUS_25",

          status: "PENDING_REVIEW",
          contentReviewStatus: "PENDING",
          contentSubmittedAt: new Date(),

          // clear prior rejections (optional)
          rejectionReason: null,
          reviewedAt: null,
          reviewedById: null,
          contentReviewedAt: null,
          contentReviewedById: null,
          contentRejectionReason: null,
          expiresAt: null,
          archivedAt: null,
          archivedImagesPrunedAt: null,
        },
      });
      try {
        await prisma.adminAuditLog.create({
          data: {
            actorId: s.uid,
            action: "LISTING_NEW_REVIEW_SUBMIT",
            entityType: "Listing",
            entityId: id,
            meta: {
              reviewType: "NEW_LISTING_REVIEW",
              changedSections: [],
            },
          },
        });
      } catch {}
      await notifyAdminListingPendingReview({
        req,
        listingId: id,
        source: "api/listings/[id]/submit PAID",
      });

      return NextResponse.json({ ok: true, redirect: `/listings/${id}` });
    }

    return NextResponse.json({ ok: false, error: "Invalid mode." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Could not submit." }, { status: 500 });
  }
}
