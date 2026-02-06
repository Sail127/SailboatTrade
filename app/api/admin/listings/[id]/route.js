import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const gate = await requireAdminApi("MODERATOR");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { me } = gate;
  const id = params.id;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ---- Content-change actions for PUBLISHED listings ----
  if (action === "APPROVE_CONTENT_CHANGES") {
    if (String(listing.status).toUpperCase() !== "PUBLISHED") {
      return NextResponse.json({ error: "Content-change approval only applies to published listings." }, { status: 400 });
    }
    if (String(listing.contentReviewStatus).toUpperCase() !== "PENDING") {
      return NextResponse.json({ error: "No pending content changes." }, { status: 400 });
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        title: listing.pendingTitle ?? listing.title,
        description: listing.pendingDescription ?? listing.description,
        heroImageUrl: listing.pendingHeroImageUrl ?? listing.heroImageUrl,
        imageUrls:
          Array.isArray(listing.pendingImageUrls) && listing.pendingImageUrls.length > 0
            ? listing.pendingImageUrls
            : listing.imageUrls,

        pendingTitle: null,
        pendingDescription: null,
        pendingHeroImageUrl: null,
        pendingImageUrls: [],

        contentReviewStatus: "NONE",
        contentReviewedAt: new Date(),
        contentReviewedById: me.id,
        contentRejectionReason: null,
      },
    });

    await audit({
      actorId: me.id,
      action,
      entityType: "Listing",
      entityId: id,
      reason: reason || null,
      meta: { type: "content" },
    });

    return NextResponse.json({ ok: true, listing: updated });
  }

  if (action === "REJECT_CONTENT_CHANGES") {
    if (String(listing.status).toUpperCase() !== "PUBLISHED") {
      return NextResponse.json({ error: "Content-change rejection only applies to published listings." }, { status: 400 });
    }
    if (String(listing.contentReviewStatus).toUpperCase() !== "PENDING") {
      return NextResponse.json({ error: "No pending content changes." }, { status: 400 });
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        contentReviewStatus: "REJECTED",
        contentReviewedAt: new Date(),
        contentReviewedById: me.id,
        contentRejectionReason: reason || "Content changes rejected.",
      },
    });

    await audit({
      actorId: me.id,
      action,
      entityType: "Listing",
      entityId: id,
      reason: reason || null,
      meta: { type: "content" },
    });

    return NextResponse.json({ ok: true, listing: updated });
  }

  // ---- Existing listing moderation actions ----
  let data = null;

  if (action === "APPROVE_PUBLISH") {
    if (listing.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "Cannot publish: payment not PAID." }, { status: 400 });
    }
    data = {
      status: "PUBLISHED",
      publishedAt: listing.publishedAt ?? new Date(),
      reviewedAt: new Date(),
      reviewedById: me.id,
      rejectionReason: null,
    };
  } else if (action === "REJECT") {
    data = {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: me.id,
      rejectionReason: reason || "Rejected by admin.",
    };
  } else if (action === "UNPUBLISH") {
    data = {
      status: "ARCHIVED",
      reviewedAt: new Date(),
      reviewedById: me.id,
    };
  } else if (action === "REMOVE") {
    data = {
      status: "REMOVED",
      removedAt: new Date(),
      removedById: me.id,
      removedReason: reason || "Removed by admin.",
    };
  } else if (action === "RESTORE") {
    data = {
      status: listing.paymentStatus === "PAID" ? "PENDING_REVIEW" : "DRAFT",
      removedAt: null,
      removedById: null,
      removedReason: null,
    };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.listing.update({ where: { id }, data });

  await audit({
    actorId: me.id,
    action,
    entityType: "Listing",
    entityId: id,
    reason: reason || null,
    meta: { from: listing.status, to: updated.status },
  });

  return NextResponse.json({ ok: true, listing: updated });
}
