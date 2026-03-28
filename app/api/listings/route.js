// app/api/listings/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  normalizeBuilderName,
  normalizeBusinessName,
  normalizeCityName,
  normalizeListingTitle,
  normalizeModelName,
  normalizePersonName,
  normalizeStateName,
} from "@/lib/textFormat";
import { normalizeHeroImageFrame } from "@/lib/heroImageFrame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_PHOTO_LIMIT = 3;

/**
 * GET /api/listings
 * Returns published listings only
 */
export async function GET() {
  try {
    const now = new Date();
    const listings = await prisma.listing.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(listings);
  } catch (error) {
    console.error("GET /api/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/listings
 * Creates a new listing as DRAFT (private until published).
 *
 * ✅ Requires authentication.
 * ✅ Requires verified email (matches your /api/listings/create flow)
 * ✅ Returns previewPath (/listings/preview/:token)
 */
export async function POST(req) {
  try {
    // ✅ Require login
    const s = await requireUser().catch(() => null);
    if (!s?.uid) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", error: "Unauthorized." },
        { status: 401 }
      );
    }
    const ownerId = String(s.uid);

    // ✅ Require verified email to create listings (Phase 1)
    const u = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { emailVerifiedAt: true, deletedAt: true, isDisabled: true },
    });

    if (!u || u.deletedAt || u.isDisabled) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    if (!u.emailVerifiedAt) {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_NOT_VERIFIED",
          error: "Please verify your email before creating listings.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, code: "INVALID_JSON", error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    // ---------------- helpers ----------------
    const toStr = (v) => (typeof v === "string" ? v.trim() : "");
    const isNonEmpty = (v) => toStr(v).length > 0;

    const toInt = (v) => {
      if (v === "" || v == null) return null;
      if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
      const s = toStr(v);
      if (!s) return null;
      const n = Number.parseInt(s.replace(/[^\d-]/g, ""), 10);
      return Number.isFinite(n) ? n : null;
    };

    const toFloat = (v) => {
      if (v === "" || v == null) return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const s = toStr(v);
      if (!s) return null;
      const n = Number.parseFloat(s.replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    };

    const upperOrNull = (v) => {
      const s = toStr(v);
      return s ? s.toUpperCase() : null;
    };
    const normalizeTextOrNull = (value, formatter) => {
      const s = toStr(value);
      return s ? formatter(s) : null;
    };

    const isCurrency = (v) =>
      ["USD", "EUR", "GBP", "AUD", "NZD", "JPY"].includes(String(v || "").toUpperCase());

    const isFtOrM = (v) => {
      const s = String(v ?? "").toLowerCase().trim();
      return s === "ft" || s === "m";
    };

    // ISO2 country normalization (schema expects Char(2))
    const normalizeIso2 = (raw) => {
      const s = toStr(raw);
      const u = s.toUpperCase();
      if (!u) return null;

      // common US variants
      if (
        u === "US" ||
        u === "USA" ||
        u === "U.S." ||
        u === "U.S.A." ||
        u === "UNITED STATES" ||
        u === "UNITED STATES OF AMERICA"
      ) {
        return "US";
      }

      // already ISO2
      if (/^[A-Z]{2}$/.test(u)) return u;

      return null;
    };

    const coerceYesNoToBool = (v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v === 1 ? true : v === 0 ? false : null;
      const s = toStr(v).toUpperCase();
      if (!s) return null;
      if (s === "YES" || s === "TRUE") return true;
      if (s === "NO" || s === "FALSE") return false;
      return null;
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

    // ---------------- required ----------------
    const description = toStr(body.description);

    const year = toInt(body.year);
    const builder = isNonEmpty(body.builder) ? normalizeBuilderName(toStr(body.builder)) : null;
    const model = isNonEmpty(body.model) ? normalizeModelName(toStr(body.model)) : null;

    const boatCondition = normalizeBoatCondition(body.boatCondition);
    const type = normalizeHullType(body.type);

    const loa = toFloat(body.loa);
    const loaUnit = isFtOrM(body.loaUnit) ? String(body.loaUnit).toLowerCase() : "ft";

    const price = toInt(body.price);
    const currency = isCurrency(body.currency) ? String(body.currency).toUpperCase() : "USD";

    const locationCountry = normalizeIso2(body.locationCountry);
    const locationCity = isNonEmpty(body.locationCity) ? normalizeCityName(toStr(body.locationCity)) : null;

    const isUSA = locationCountry === "US";
    const locationState = isUSA && isNonEmpty(body.locationState) ? normalizeStateName(toStr(body.locationState)) : null;
    const locationUsRegion =
      isUSA && isNonEmpty(body.locationUsRegion) ? upperOrNull(body.locationUsRegion) : null;

    const sellerRole = normalizeSellerRole(body.sellerRole);
    const listingContactName = normalizePersonName(toStr(body.listingContactName));
    const contactEmail = toStr(body.contactEmail);

    const missing = [];
    if (!sellerRole) missing.push("sellerRole");
    if (year == null) missing.push("year");
    if (!builder) missing.push("builder");
    if (!model) missing.push("model");
    if (!boatCondition) missing.push("boatCondition");
    if (!type) missing.push("type");
    if (loa == null) missing.push("loa");
    if (!description) missing.push("description");
    if (price == null || price <= 0) missing.push("price");
    if (!locationCountry) missing.push("locationCountry");
    if (!locationCity) missing.push("locationCity");
    if (isUSA && !locationUsRegion) missing.push("locationUsRegion");
    if (isUSA && !locationState) missing.push("locationState");
    if (!listingContactName) missing.push("listingContactName");
    if (!contactEmail) missing.push("contactEmail");

    if (missing.length) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          error: "Missing or invalid required fields.",
          missing,
        },
        { status: 400 }
      );
    }

    // ---------------- optional ----------------
    const title = isNonEmpty(body.title)
      ? normalizeListingTitle(toStr(body.title))
      : [year, builder, model].filter(Boolean).join(" ");

    const cabins = toInt(body.cabins);
    const heads = toInt(body.heads);

    const draft = toFloat(body.draft);
    const draftUnit = isFtOrM(body.draftUnit) ? String(body.draftUnit).toLowerCase() : null;

    const airDraft = toFloat(body.airDraft);
    const airDraftUnit = isFtOrM(body.airDraftUnit) ? String(body.airDraftUnit).toLowerCase() : null;

    const engineFuel = normalizeFuelType(body.engineFuel);
    const engineMake = isNonEmpty(body.engineMake) ? toStr(body.engineMake) : null;
    const propeller = isNonEmpty(body.propeller) ? toStr(body.propeller) : null;
    const engineHorsepower = toInt(body.engineHorsepower);

    const engineHours = toInt(body.engineHours);
    const leftEngineHours = toInt(body.leftEngineHours);
    const rightEngineHours = toInt(body.rightEngineHours);

    const hasGenerator = coerceYesNoToBool(body.hasGenerator) ?? false;
    const generatorFuel = normalizeFuelType(body.generatorFuel);
    const generatorMake = isNonEmpty(body.generatorMake) ? toStr(body.generatorMake) : null;
    const generatorKw = toFloat(body.generatorKw);
    const generatorHours = toInt(body.generatorHours);

    const tankUnit = normalizeVolumeUnit(body.tankUnit);
    const tankFuel = toFloat(body.tankFuel);
    const tankWater = toFloat(body.tankWater);

    const hasDinghy = coerceYesNoToBool(body.hasDinghy) ?? false;
    const dinghyDetailsRaw = isNonEmpty(body.dinghyDetails)
      ? toStr(body.dinghyDetails)
      : isNonEmpty(body.dinghyNotes)
      ? toStr(body.dinghyNotes)
      : null;

    const equipment = normalizeEquipment(body.equipment);
    const imageUrls = normalizeStringArray(body.imageUrls);

    const heroImageUrl = isNonEmpty(body.heroImageUrl) ? toStr(body.heroImageUrl) : null;
    const heroImageFrame = normalizeHeroImageFrame(body.heroImageFrame);

    const contactPhone = isNonEmpty(body.contactPhone) ? toStr(body.contactPhone) : null;

    const brokerageName =
      sellerRole === "BROKER" && isNonEmpty(body.brokerageName)
        ? normalizeBusinessName(toStr(body.brokerageName))
        : null;

    const brokerageAddress =
      sellerRole === "BROKER" && isNonEmpty(body.brokerageAddress) ? toStr(body.brokerageAddress) : null;

    const brokerHeroImageUrl = isNonEmpty(body.brokerHeroImageUrl || body.brokerLogoUrl)
      ? toStr(body.brokerHeroImageUrl || body.brokerLogoUrl)
      : null;

    const wantsFeatured = Boolean(body.featuredHome);
    const photoPlan = imageUrls.length > FREE_PHOTO_LIMIT ? "PHOTO_PLUS_25" : "FREE_3";
    const billingAddons = [];
    if (photoPlan === "PHOTO_PLUS_25") billingAddons.push("PHOTO_PLUS_25");
    if (wantsFeatured) billingAddons.push("FEATURED_HOME");

    // ---------------- create ----------------
    const created = await prisma.listing.create({
      data: {
        ownerId,
        status: "DRAFT",

        title,
        description,

        year,
        builder,
        model,
        boatCondition,
        cabins,
        heads,

        type,

        price,
        currency,

        locationCountry,
        locationCity,
        locationState,
        locationUsRegion,

        loa,
        loaUnit,
        draft,
        draftUnit,
        airDraft,
        airDraftUnit,

        engineFuel,
        engineMake,
        propeller,
        engineHorsepower,
        engineHours,
        leftEngineHours,
        rightEngineHours,

        hasGenerator,
        generatorFuel: hasGenerator ? generatorFuel : null,
        generatorMake: hasGenerator ? generatorMake : null,
        generatorKw: hasGenerator ? generatorKw : null,
        generatorHours: hasGenerator ? generatorHours : null,

        tankUnit,
        tankFuel,
        tankWater,

        hasDinghy,
        dinghyDetails: hasDinghy ? dinghyDetailsRaw : null,

        equipment,
        heroImageUrl,
        imageUrls,
        heroImageFrame,

        sellerRole,
        listingContactName,
        contactEmail,
        contactPhone,

        brokerageName,
        brokerageAddress,
        brokerHeroImageUrl,

        photoPlan,
        featuredHome: false,
        billingStatus: "FREE",
        billingProvider: null,
        billingAddons,
        billingMonthlyCents: null,
      },
      select: { id: true, previewToken: true },
    });

    const previewPath = `/listings/preview/${created.previewToken}`;

    return NextResponse.json(
      { ok: true, listingId: created.id, previewPath, previewUrl: previewPath },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/listings error:", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
