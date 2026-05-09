// app/api/checkout/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const rl = await rateLimit({
    key: makeRateLimitKey(req, "checkout_init"),
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const s = await readSession();
  if (!s?.uid) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let listingId = "";
  let photoPlus = false;
  let featuredHome = false;
  let termMonths = 1;

  try {
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => null);
      listingId = String(body?.listingId || "").trim();
      photoPlus = Boolean(body?.photoPlus);
      featuredHome = Boolean(body?.featuredHome);
      termMonths = Number(body?.termMonths || 1);
    } else {
      const fd = await req.formData();
      listingId = String(fd.get("listingId") || "").trim();
      photoPlus = String(fd.get("photoPlus") || "") === "1";
      featuredHome = String(fd.get("featuredHome") || "") === "1";
      termMonths = Number(fd.get("termMonths") || 1);
    }
  } catch {
    // ignore
  }

  if (!listingId) {
    return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true },
  });

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.ownerId !== s.uid) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const addons = [];
  if (photoPlus) addons.push("PHOTO_PLUS_25");
  if (featuredHome) addons.push("FEATURED_HOME");

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      billingAddons: addons,
      photoPlan: photoPlus ? "PHOTO_PLUS_25" : "FREE_3",
      featuredHome: false, // only enable after successful payment
      billingTermMonths: Number.isFinite(termMonths) ? termMonths : 1,
    },
  });

  return NextResponse.redirect(`/checkout/${encodeURIComponent(listing.id)}`, { status: 303 });
}
