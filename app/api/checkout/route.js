// app/api/checkout/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const s = await readSession();
  if (!s?.uid) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let listingId = "";
  let plan = "FEATURED_HOME";

  try {
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => null);
      listingId = String(body?.listingId || "").trim();
      plan = String(body?.plan || "FEATURED_HOME").trim();
    } else {
      const fd = await req.formData();
      listingId = String(fd.get("listingId") || "").trim();
      plan = String(fd.get("plan") || "FEATURED_HOME").trim();
    }
  } catch {
    // ignore
  }

  if (!listingId) {
    return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, paymentStatus: true },
  });

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.ownerId !== s.uid) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // Don’t start checkout again if already paid
  if (listing.paymentStatus === "PAID") {
    return NextResponse.redirect(`/checkout/${encodeURIComponent(listing.id)}?success=1`, { status: 303 });
  }

  const planUpper = String(plan || "").toUpperCase();
  const desiredPlan = planUpper === "STANDARD" ? "STANDARD" : "FEATURED_HOME";

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      plan: desiredPlan,
      paymentProvider: "BRAINTREE",
      paymentStatus: "PENDING",
      paymentSessionId: null, 
      status: "READY_FOR_CHECKOUT",
    },
  });

  // Redirect into your internal checkout page
  return NextResponse.redirect(
    `/checkout/${encodeURIComponent(listing.id)}?plan=${encodeURIComponent(desiredPlan)}`,
    { status: 303 }
  );
}
