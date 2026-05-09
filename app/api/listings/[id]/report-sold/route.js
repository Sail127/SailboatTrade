import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  notifyAdminListingSoldReport,
  notifyOwnerListingSoldConfirmation,
} from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSoldOnPlatform(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "yes" || normalized === "true") return true;
    if (normalized === "no" || normalized === "false") return false;
  }
  return null;
}

export async function POST(req, { params }) {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const soldOnSailboatTrade = parseSoldOnPlatform(body?.soldOnSailboatTrade);
  const feedback = String(body?.feedback || "").trim();

  if (soldOnSailboatTrade == null) {
    return NextResponse.json(
      { ok: false, error: "Please tell us whether the boat sold on SailboatTrade.com." },
      { status: 400 },
    );
  }

  if (feedback.length > 2000) {
    return NextResponse.json(
      { ok: false, error: "Feedback must be 2000 characters or fewer." },
      { status: 400 },
    );
  }

  const listing = await prisma.listing.findFirst({
    where: { id, ownerId: s.uid },
    select: {
      id: true,
      ownerId: true,
      status: true,
      saleReport: {
        select: { id: true },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }

  const status = String(listing.status || "").toUpperCase();
  if (status === "REMOVED") {
    return NextResponse.json({ ok: false, error: "Removed listings cannot be updated." }, { status: 403 });
  }

  if (listing.saleReport?.id) {
    return NextResponse.json({ ok: false, error: "This listing has already been marked as sold." }, { status: 409 });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.listingSaleReport.create({
      data: {
        listingId: listing.id,
        ownerId: listing.ownerId,
        soldOnSailboatTrade,
        feedback: feedback || null,
      },
    }),
    prisma.listing.update({
      where: { id: listing.id },
      data: {
        status: "SOLD",
        featuredHome: false,
        archivedAt: now,
      },
    }),
  ]);

  const emailResult = await notifyAdminListingSoldReport({
    req,
    listingId: listing.id,
    soldOnSailboatTrade,
    feedback,
    source: "api/listings/report-sold",
  });

  const ownerEmailResult = await notifyOwnerListingSoldConfirmation({
    req,
    listingId: listing.id,
    soldOnSailboatTrade,
    source: "api/listings/report-sold",
  });

  return NextResponse.json({
    ok: true,
    sold: true,
    emailNotified: Boolean(emailResult?.ok),
    ownerEmailNotified: Boolean(ownerEmailResult?.ok),
    note: "Thanks for letting us know. Your listing has been moved to sold listings.",
  });
}
