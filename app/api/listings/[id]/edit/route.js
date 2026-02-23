// app/api/listings/[id]/edit/route.js
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOwnerId(listing) {
  return (
    listing?.userId ??
    listing?.ownerId ??
    listing?.sellerId ??
    listing?.createdById ??
    listing?.accountId ??
    null
  );
}

function cleanString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function cleanNumber(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function cleanStringArray(v, maxLen = 200, maxItems = 999) {
  const arr = Array.isArray(v) ? v : [];
  const out = [];
  for (const x of arr) {
    const s = cleanString(x);
    if (s && s.length <= maxLen) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export async function PATCH(req, { params }) {
  const s = await readSession();
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const ownerId = getOwnerId(listing);
  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { id: true, role: true },
  });

  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";
  const isOwner = ownerId && String(ownerId) === String(s.uid);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  // Only update fields that BOTH:
  // (1) exist on this listing record (prevents schema mismatch crashes)
  // (2) exist in request payload
  const allowed = [
    "title",
    "year",
    "builder",
    "model",
    "price",
    "currency",
    "boatCondition",
    "type",

    "locationCountry",
    "locationUsRegion",
    "locationCity",
    "locationState",

    "sellerRole",
    "listingContactName",
    "brokerageName",
    "brokerageAddress",
    "contactPhone",
    "contactEmail",
    "brokerHeroImageUrl",

    "imageUrls",
    "heroImageUrl",

    "cabins",
    "heads",
    "loa",
    "loaUnit",
    "draft",
    "draftUnit",
    "airDraft",
    "airDraftUnit",
    "displacement",
    "displacementUnit",

    "tankUnit",
    "tankFuel",
    "tankWater",

    "engineFuel",
    "engineMake",
    "engineHorsepower",
    "propeller",
    "engineHours",
    "leftEngineHours",
    "rightEngineHours",

    "equipment",

    "hasGenerator",
    "generatorFuel",
    "generatorMake",
    "generatorKw",
    "generatorHours",

    "hasDinghy",
    "dinghyDetails",

    "description",
    "riggingRemarks",
    "additionalInfo",
  ];

  const data = {};

  for (const k of allowed) {
    if (!(k in listing)) continue; // schema safe
    if (!(k in body)) continue;

    const v = body[k];

    if (k === "imageUrls") {
      const arr = cleanStringArray(v, 500, MAX_PHOTOS_SAFE());
      data[k] = arr.slice(0, 25);
      continue;
    }

    if (k === "equipment") {
      data[k] = cleanStringArray(v, 120, 500);
      continue;
    }

    // numeric-ish fields
    if (
      [
        "year",
        "price",
        "cabins",
        "heads",
        "loa",
        "draft",
        "airDraft",
        "displacement",
        "tankFuel",
        "tankWater",
        "engineHorsepower",
        "engineHours",
        "leftEngineHours",
        "rightEngineHours",
        "generatorKw",
        "generatorHours",
      ].includes(k)
    ) {
      data[k] = cleanNumber(v);
      continue;
    }

    // booleans / YES-NO strings — let Prisma validate actual column type
    if (["hasGenerator", "hasDinghy"].includes(k)) {
      data[k] = v;
      continue;
    }

    // default string
    data[k] = cleanString(v);
  }

  try {
    const updated = await prisma.listing.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ok: true,
      id: updated.id,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Update failed" }, { status: 500 });
  }
}

function MAX_PHOTOS_SAFE() {
  // Keep local constant here so this route is fully drop-in.
  return 25;
}