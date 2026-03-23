// app/api/listings/[id]/edit/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { notifyAdminListingPendingReview } from "@/lib/adminReviewNotifications";
import {
  normalizeBuilderName,
  normalizeBusinessName,
  normalizeCityName,
  normalizeListingTitle,
  normalizeModelName,
  normalizePersonName,
  normalizeStateName,
} from "@/lib/textFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTOS = 25;

function cleanString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function normalizeString(v, formatter) {
  const s = cleanString(v);
  return s ? formatter(s) : null;
}
function cleanInt(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function cleanFloat(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function cleanStringArray(v, maxItems = 999) {
  const arr = Array.isArray(v) ? v : [];
  const out = [];
  for (const x of arr) {
    const s = cleanString(x);
    if (s) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function arraysEqual(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i] || "") !== String(b[i] || "")) return false;
  }
  return true;
}

function normalizePhotoOrder(imageUrls = [], heroImageUrl = "") {
  const raw = Array.isArray(imageUrls) ? imageUrls : [];
  const clean = [];
  const seen = new Set();

  for (const x of raw) {
    const v = String(x || "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    clean.push(v);
  }

  const hero = String(heroImageUrl || "").trim();
  if (hero) {
    const idx = clean.indexOf(hero);
    if (idx > 0) {
      clean.splice(idx, 1);
      clean.unshift(hero);
    } else if (idx < 0) {
      clean.unshift(hero);
    }
  }

  return clean.slice(0, MAX_PHOTOS);
}

function valueEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return arraysEqual(Array.isArray(a) ? a : [], Array.isArray(b) ? b : []);
  return String(a ?? "") === String(b ?? "");
}

const editResponseSelect = {
  id: true,
  status: true,
  title: true,
  price: true,
  currency: true,
  year: true,
  builder: true,
  model: true,
  heroImageUrl: true,
  imageUrls: true,
  updatedAt: true,
};

function collectChangedSections(prev, next) {
  const groups = [
    {
      name: "Basics",
      fields: ["title", "year", "builder", "model", "price", "currency", "boatCondition", "type"],
    },
    {
      name: "Photos",
      fields: ["heroImageUrl", "imageUrls"],
    },
    {
      name: "Location",
      fields: ["locationCountry", "locationCity", "locationState", "locationUsRegion"],
    },
    {
      name: "Contact",
      fields: [
        "sellerRole",
        "listingContactName",
        "contactEmail",
        "contactPhone",
        "brokerageName",
        "brokerageAddress",
        "brokerHeroImageUrl",
      ],
    },
    {
      name: "Description",
      fields: ["description", "riggingRemarks", "additionalInfo"],
    },
    {
      name: "Specifications",
      fields: [
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
      ],
    },
    {
      name: "Engine",
      fields: [
        "engineFuel",
        "engineMake",
        "propeller",
        "engineHorsepower",
        "engineHours",
        "leftEngineHours",
        "rightEngineHours",
        "hasGenerator",
        "generatorFuel",
        "generatorMake",
        "generatorKw",
        "generatorHours",
      ],
    },
    {
      name: "Equipment",
      fields: ["equipment", "hasDinghy", "dinghyDetails"],
    },
  ];

  const changed = [];
  for (const group of groups) {
    const groupChanged = group.fields.some((field) => !valueEqual(prev?.[field], next?.[field]));
    if (groupChanged) changed.push(group.name);
  }
  return changed;
}

export async function PATCH(req, { params }) {
  try {
    const s = await readSession();
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    const status = String(listing.status || "").toUpperCase();
    if (!["DRAFT", "REJECTED", "PUBLISHED"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Editing is disabled while this listing is under review or archived." },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
    }

    const submitForPhotoReview = Boolean(body.submitForPhotoReview);

    const nextImageUrls = cleanStringArray(body.imageUrls, MAX_PHOTOS).slice(0, MAX_PHOTOS);
    const nextHeroImageUrl = cleanString(body.heroImageUrl);
    const orderedNextPhotos = normalizePhotoOrder(nextImageUrls, nextHeroImageUrl || nextImageUrls[0] || "");

    const existingOrderedPhotos = normalizePhotoOrder(listing.imageUrls || [], listing.heroImageUrl || "");
    const uploadedPhotosChanged = !arraysEqual(orderedNextPhotos, existingOrderedPhotos);

    const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];
    const hasPhotoPlus = String(listing.photoPlan || "").toUpperCase() === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");
    const maxAllowedPhotos = hasPhotoPlus ? MAX_PHOTOS : FREE_PHOTO_LIMIT;
    if (orderedNextPhotos.length > maxAllowedPhotos) {
      return NextResponse.json(
        { ok: false, error: `This listing allows up to ${maxAllowedPhotos} photos.` },
        { status: 400 }
      );
    }

    if (status === "PUBLISHED" && uploadedPhotosChanged && !submitForPhotoReview) {
      return NextResponse.json(
        {
          ok: false,
          error: "Photo changes require moderation. Use Submit photo changes.",
          needsPhotoReview: true,
        },
        { status: 409 }
      );
    }

    const data = {
      title: normalizeString(body.title, normalizeListingTitle),
      description: cleanString(body.description),

      locationCountry: cleanString(body.locationCountry),
      locationCity: normalizeString(body.locationCity, normalizeCityName),
      locationState: normalizeString(body.locationState, normalizeStateName),
      locationUsRegion: cleanString(body.locationUsRegion),

      price: cleanInt(body.price),
      currency: cleanString(body.currency),

      year: cleanInt(body.year),
      builder: normalizeString(body.builder, normalizeBuilderName),
      model: normalizeString(body.model, normalizeModelName),
      boatCondition: cleanString(body.boatCondition),

      cabins: cleanInt(body.cabins),
      heads: cleanInt(body.heads),

      type: cleanString(body.type),

      loa: cleanFloat(body.loa),
      loaUnit: cleanString(body.loaUnit),
      draft: cleanFloat(body.draft),
      draftUnit: cleanString(body.draftUnit),
      airDraft: cleanFloat(body.airDraft),
      airDraftUnit: cleanString(body.airDraftUnit),

      displacement: cleanFloat(body.displacement),
      displacementUnit: cleanString(body.displacementUnit),

      engineFuel: cleanString(body.engineFuel),
      engineMake: cleanString(body.engineMake),
      propeller: cleanString(body.propeller),
      engineHorsepower: cleanInt(body.engineHorsepower),

      engineHours: cleanInt(body.engineHours),
      leftEngineHours: cleanInt(body.leftEngineHours),
      rightEngineHours: cleanInt(body.rightEngineHours),

      hasGenerator: Boolean(body.hasGenerator),
      generatorFuel: cleanString(body.generatorFuel),
      generatorMake: cleanString(body.generatorMake),
      generatorKw: cleanFloat(body.generatorKw),
      generatorHours: cleanInt(body.generatorHours),

      tankUnit: cleanString(body.tankUnit),
      tankFuel: cleanFloat(body.tankFuel),
      tankWater: cleanFloat(body.tankWater),

      hasDinghy: Boolean(body.hasDinghy),
      dinghyDetails: cleanString(body.dinghyDetails),

      equipment: cleanStringArray(body.equipment, 500),

      heroImageUrl: orderedNextPhotos[0] || null,
      imageUrls: orderedNextPhotos,

      riggingRemarks: cleanString(body.riggingRemarks),
      additionalInfo: cleanString(body.additionalInfo),

      sellerRole: cleanString(body.sellerRole),
      listingContactName: normalizeString(body.listingContactName, normalizePersonName),
      contactEmail: cleanString(body.contactEmail),
      contactPhone: cleanString(body.contactPhone),

      brokerageName: normalizeString(body.brokerageName, normalizeBusinessName),
      brokerageAddress: cleanString(body.brokerageAddress),
      brokerHeroImageUrl: cleanString(body.brokerHeroImageUrl),
    };
    const changedSections = collectChangedSections(listing, data);

    if (status === "PUBLISHED" && submitForPhotoReview && uploadedPhotosChanged) {
      const now = new Date();
      data.status = "PENDING_REVIEW";
      data.contentReviewStatus = "PENDING";
      data.contentSubmittedAt = now;
      data.rejectionReason = null;
      data.reviewedAt = null;
      data.reviewedById = null;
      data.contentRejectionReason = null;
      data.contentReviewedAt = null;
      data.contentReviewedById = null;
    } else if (status === "PUBLISHED") {
      data.contentReviewStatus = "NONE";
      data.contentReviewedAt = null;
      data.contentReviewedById = null;
      data.contentRejectionReason = null;
    }

    // Remove undefined (Prisma rejects)
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });

    const updatedListing = await prisma.listing.update({
      where: { id },
      data,
      select: editResponseSelect,
    });

    if (status === "PUBLISHED" && submitForPhotoReview && uploadedPhotosChanged) {
      try {
        await prisma.adminAuditLog.create({
          data: {
            actorId: s.uid,
            action: "LISTING_CHANGE_REAPPROVAL_SUBMIT",
            entityType: "Listing",
            entityId: id,
            meta: {
              reviewType: "CHANGE_APPROVAL",
              changedSections,
            },
          },
        });
      } catch {}

      await notifyAdminListingPendingReview({
        req,
        listingId: id,
        source: "api/listings/[id]/edit PHOTO_REVIEW",
      });
      return NextResponse.json({
        ok: true,
        submittedForPhotoReview: true,
        listing: updatedListing,
      });
    }

    return NextResponse.json({
      ok: true,
      liveUpdated: status === "PUBLISHED",
      listing: updatedListing,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Update failed." }, { status: 500 });
  }
}
