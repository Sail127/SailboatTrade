import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseExpiration(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T23:59:59.999Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function PATCH(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const expiresAt = parseExpiration(body?.expiresAt);

  if (body?.expiresAt && !expiresAt) {
    return NextResponse.json({ ok: false, error: "Invalid expiration date." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, ownerId: true, title: true, status: true, expiresAt: true },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      expiresAt,
      renewalReminderLastSentAt: null,
      expiredEmailSentAt: null,
    },
    select: {
      id: true,
      expiresAt: true,
      updatedAt: true,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_EXPIRATION_UPDATED",
    entityType: "Listing",
    entityId: listing.id,
    reason: null,
    meta: {
      ownerId: listing.ownerId,
      title: listing.title,
      status: listing.status,
      previousExpiresAt: listing.expiresAt,
      nextExpiresAt: updated.expiresAt,
    },
  });

  return NextResponse.json({ ok: true, listing: updated });
}
