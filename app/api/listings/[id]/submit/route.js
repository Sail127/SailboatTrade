// app/api/listings/[id]/submit/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 3;
const MAX_LIMIT = 25;

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
        imageUrls: true,
        photoPlan: true,
        featuredHome: true,
        billingStatus: true,
        braintreeSubscriptionId: true,
      },
    });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;
    if (photoCount > MAX_LIMIT) return NextResponse.json({ ok: false, error: `Max ${MAX_LIMIT} photos.` }, { status: 400 });

    if (mode === "FREE") {
      if (photoCount > FREE_LIMIT) {
        return NextResponse.json(
          { ok: false, error: `Free listings allow up to ${FREE_LIMIT} photos. Remove photos or upgrade.` },
          { status: 400 }
        );
      }

      await prisma.listing.update({
        where: { id },
        data: {
          photoPlan: "FREE_3",
          featuredHome: false,
          billingStatus: "FREE",
          billingProvider: null,
          braintreeSubscriptionId: null,
          billingAddons: [],
          billingMonthlyCents: null,

          status: "PENDING_REVIEW",
          contentReviewStatus: "PENDING",
          contentSubmittedAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true, redirect: `/listings/${id}` });
    }

    return NextResponse.json({ ok: false, error: "Invalid mode." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Could not submit." }, { status: 500 });
  }
}