// app/api/listings/create/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   NORMALIZERS / HELPERS (form-aligned)
========================================================= */
const ALLOWED_CURRENCIES = ["USD", "EUR", "GBP", "AUD", "NZD", "JPY"];

// Must match NewListingForm constants
const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTOS_AT_CREATE = 25;

const isFtOrM = (v) => {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "ft" || s === "m";
};

const isCurrency = (v) => ALLOWED_CURRENCIES.includes(String(v || "").toUpperCase());

const toStringOrNull = (v) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

const toNumberOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toIntOrNull = (v) => {
  const n = toNumberOrNull(v);
  if (n == null) return null;
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : null;
};

const normalizeStringArray = (v) => {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
};

const normalizeEquipment = (v) => {
  if (Array.isArray(v)) return normalizeStringArray(v);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeHullType = (v) => {
  const t = String(v || "").toUpperCase().trim();
  if (t === "MONOHULL" || t === "CATAMARAN" || t === "TRIMARAN") return t;
  return null;
};

const normalizeSellerRole = (v) => {
  const r = String(v || "").toUpperCase().trim();
  if (r === "OWNER" || r === "BROKER") return r;
  return null;
};

const normalizeBoatCondition = (v) => {
  const c = String(v || "").toUpperCase().trim();
  if (c === "NEW" || c === "USED") return c;
  return null;
};

const normalizeFuelType = (v) => {
  const f = String(v || "").toUpperCase().trim();
  if (f === "DIESEL" || f === "GAS") return f;
  return null;
};

const normalizeVolumeUnit = (v) => {
  const s = String(v ?? "").trim();
  if (s === "gal" || s === "L") return s;
  if (s.toLowerCase() === "gal") return "gal";
  if (s.toUpperCase() === "L") return "L";
  return null;
};

const normalizeWeightUnit = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "lb") return "lb";
  if (s === "kg") return "kg";
  return null;
};

const yesNoToBool = (v, fallback = false) => {
  if (v === true) return true;
  if (v === false) return false;

  const s = String(v ?? "").toUpperCase().trim();
  if (s === "YES" || s === "TRUE" || s === "1") return true;
  if (s === "NO" || s === "FALSE" || s === "0") return false;

  return fallback;
};

/* =========================================================
   POST
========================================================= */
export async function POST(req) {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) {
      return NextResponse.json({ ok: false, code: "UNAUTHORIZED", error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ownerId = String(s.uid);

    const u = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { emailVerifiedAt: true, deletedAt: true, isDisabled: true },
    });

    if (!u || u.deletedAt || u.isDisabled) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    if (!u.emailVerifiedAt) {
      return NextResponse.json(
        { ok: false, code: "EMAIL_NOT_VERIFIED", error: "Please verify your email before creating listings." },
        { status: 403 }
      );
    }

    // Units + enums
    const currency = isCurrency(body.currency) ? String(body.currency).toUpperCase() : "USD";
    const loaUnit = isFtOrM(body.loaUnit) ? String(body.loaUnit).toLowerCase() : "ft";
    const draftUnit = isFtOrM(body.draftUnit) ? String(body.draftUnit).toLowerCase() : loaUnit;
    const airDraftUnit = isFtOrM(body.airDraftUnit) ? String(body.airDraftUnit).toLowerCase() : loaUnit;

    const equipment = normalizeEquipment(body.equipment);
    const sellerRole = normalizeSellerRole(body.sellerRole);

    const hasGenerator = yesNoToBool(body.hasGenerator, false);
    const hasDinghy = yesNoToBool(body.hasDinghy, false);

    // Dinghy details: form sends dinghyDetails, accept legacy keys too
    const dinghyTextRaw = body.dinghyDetails ?? body.dinghyNotes ?? body.dinghyModel ?? null;
    const dinghyDetails = hasDinghy ? toStringOrNull(dinghyTextRaw) : null;

    // Required field (matches form validation)
    const draftVal = toNumberOrNull(body.draft);
    if (draftVal == null) {
      return NextResponse.json({ ok: false, error: "Draft is required." }, { status: 400 });
    }

    // Photos (form truth: hard cap 25)
    const imageUrlsRaw = normalizeStringArray(body.imageUrls);
    if (imageUrlsRaw.length > MAX_PHOTOS_AT_CREATE) {
      return NextResponse.json(
        { ok: false, code: "MAX_PHOTO_LIMIT", error: `This listing is limited to ${MAX_PHOTOS_AT_CREATE} photos.` },
        { status: 400 }
      );
    }

    const imageUrls = imageUrlsRaw.slice(0, MAX_PHOTOS_AT_CREATE);
    const heroImageUrl = toStringOrNull(body.heroImageUrl) || imageUrls[0] || null;

    const brokerHeroImageUrl = sellerRole === "BROKER" ? toStringOrNull(body.brokerHeroImageUrl) : null;

    // ✅ Plan alignment with NewListingForm + schema
    // If user adds >3 photos, this listing is considered PHOTO_PLUS_25 (requires checkout before publish).
    const photoPlan = imageUrls.length > FREE_PHOTO_LIMIT ? "PHOTO_PLUS_25" : "FREE_3";

    // ✅ Track requested paid features (used by dashboard + checkout gating)
    const billingAddons = [];
    if (photoPlan === "PHOTO_PLUS_25") billingAddons.push("PHOTO_PLUS_25");

    // NOTE: NewListingForm does not send featuredHome today.
    // If you add a toggle later, treat it as "requested" (addon) and only activate featuredHome after billing is ACTIVE.
    const wantsFeatured = yesNoToBool(body.featuredHome, false);
    if (wantsFeatured) billingAddons.push("FEATURED_HOME");

    const listing = await prisma.listing.create({
      data: {
        ownerId,

        title: toStringOrNull(body.title),
        description: toStringOrNull(body.description),

        locationCountry: toStringOrNull(body.locationCountry),
        locationCity: toStringOrNull(body.locationCity),
        locationState: toStringOrNull(body.locationState),
        locationUsRegion: toStringOrNull(body.locationUsRegion),

        price: toIntOrNull(body.price),
        currency,

        year: toIntOrNull(body.year),
        builder: toStringOrNull(body.builder),
        model: toStringOrNull(body.model),
        boatCondition: normalizeBoatCondition(body.boatCondition),

        cabins: toIntOrNull(body.cabins),
        heads: toIntOrNull(body.heads),

        type: normalizeHullType(body.type),

        loa: toNumberOrNull(body.loa),
        loaUnit,
        draft: draftVal,
        draftUnit,
        airDraft: toNumberOrNull(body.airDraft),
        airDraftUnit,

        displacement: toNumberOrNull(body.displacement),
        displacementUnit: normalizeWeightUnit(body.displacementUnit),

        engineFuel: normalizeFuelType(body.engineFuel),
        engineMake: toStringOrNull(body.engineMake),
        propeller: toStringOrNull(body.propeller),
        engineHorsepower: toIntOrNull(body.engineHorsepower),

        engineHours: toIntOrNull(body.engineHours),
        leftEngineHours: toIntOrNull(body.leftEngineHours),
        rightEngineHours: toIntOrNull(body.rightEngineHours),

        hasGenerator,
        generatorFuel: hasGenerator ? normalizeFuelType(body.generatorFuel) : null,
        generatorMake: hasGenerator ? toStringOrNull(body.generatorMake) : null,
        generatorKw: hasGenerator ? toNumberOrNull(body.generatorKw) : null,
        generatorHours: hasGenerator ? toIntOrNull(body.generatorHours) : null,

        tankUnit: normalizeVolumeUnit(body.tankUnit),
        tankFuel: toNumberOrNull(body.tankFuel),
        tankWater: toNumberOrNull(body.tankWater),

        hasDinghy,
        dinghyDetails,

        equipment,
        heroImageUrl,
        imageUrls,

        riggingRemarks: toStringOrNull(body.riggingRemarks),
        additionalInfo: toStringOrNull(body.additionalInfo),

        sellerRole,
        listingContactName: toStringOrNull(body.listingContactName),
        contactEmail: toStringOrNull(body.contactEmail),
        contactPhone: toStringOrNull(body.contactPhone),

        brokerageName: sellerRole === "BROKER" ? toStringOrNull(body.brokerageName) : null,
        brokerageAddress: sellerRole === "BROKER" ? toStringOrNull(body.brokerageAddress) : null,
        brokerHeroImageUrl,

        // ✅ Schema-aligned billing/plan fields
        photoPlan,                 // FREE_3 or PHOTO_PLUS_25
        featuredHome: false,       // only flip true after billing ACTIVE for FEATURED_HOME
        billingStatus: "FREE",     // no subscription yet at creation
        billingProvider: null,
        billingAddons,             // requested addons; used for checkout gating
        billingMonthlyCents: null,

        status: "DRAFT",
      },
      select: { id: true, previewToken: true },
    });

    const previewPath = `/listings/${listing.id}?token=${encodeURIComponent(listing.previewToken)}`;

    return NextResponse.json({
      ok: true,
      listingId: listing.id,
      previewToken: listing.previewToken,
      previewPath,
      previewUrl: previewPath,
    });
  } catch (err) {
    console.error("POST /api/listings/create error:", err);

    const msg = String(err?.message || "");
    if (msg.includes("Unknown argument")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Schema mismatch: Prisma Client/DB are not synced with schema.prisma. Run migration + regenerate Prisma Client.",
          detail: msg,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: false, error: err?.message || "Failed to create listing." }, { status: 500 });
  }
}