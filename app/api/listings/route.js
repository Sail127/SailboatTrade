// app/api/listings/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/listings
 * Returns published listings only
 */
export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "PUBLISHED" },
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
 */
export async function POST(req) {
  try {
    // ✅ Require login
    const { requireUser } = await import("@/lib/auth"); // avoids client bundling mistakes
    const s = await requireUser().catch(() => null);
    if (!s?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

    const normalizeCountry = (raw) => {
      const s = toStr(raw);
      const lower = s.toLowerCase();
      if (
        lower === "usa" ||
        lower === "us" ||
        lower === "u.s." ||
        lower === "u.s.a." ||
        lower === "united states" ||
        lower === "united states of america"
      ) {
        return "United States";
      }
      return s;
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

    const upperOrNull = (v) => {
      const s = toStr(v);
      return s ? s.toUpperCase() : null;
    };

    // ---------------- required (per your form) ----------------
    const title = toStr(body.title);
    const description = toStr(body.description);

    const year = toInt(body.year);
    const builder = isNonEmpty(body.builder) ? toStr(body.builder) : null;
    const model = isNonEmpty(body.model) ? toStr(body.model) : null;

    const boatCondition = upperOrNull(body.boatCondition); // "NEW" | "USED"
    const type = upperOrNull(body.type); // "MONOHULL" | "CATAMARAN" | "TRIMARAN"

    const price = toInt(body.price);
    const currency = upperOrNull(body.currency) || "USD";

    const locationCountry = normalizeCountry(body.locationCountry);
    const locationCity = isNonEmpty(body.locationCity) ? toStr(body.locationCity) : null;
    const locationState =
      locationCountry === "United States" && isNonEmpty(body.locationState)
        ? toStr(body.locationState)
        : null;
    const locationUsRegion =
      locationCountry === "United States" && isNonEmpty(body.locationUsRegion)
        ? upperOrNull(body.locationUsRegion)
        : null;

    const listingContactName = toStr(body.listingContactName);
    const contactEmail = toStr(body.contactEmail);
    const sellerRole = upperOrNull(body.sellerRole); // "OWNER" | "BROKER"

    const missing = [];
    if (!sellerRole) missing.push("sellerRole");
    if (year == null) missing.push("year");
    if (!builder) missing.push("builder");
    if (!model) missing.push("model");
    if (!boatCondition) missing.push("boatCondition");
    if (!type) missing.push("type");
    if (!isNonEmpty(description)) missing.push("description");
    if (price == null || price <= 0) missing.push("price");
    if (!isNonEmpty(locationCountry)) missing.push("locationCountry");
    if (locationCountry === "United States" && !locationUsRegion) missing.push("locationUsRegion");
    if (locationCountry === "United States" && !locationState) missing.push("locationState");
    if (!isNonEmpty(listingContactName)) missing.push("listingContactName");
    if (!isNonEmpty(contactEmail)) missing.push("contactEmail");

    if (missing.length) {
      return NextResponse.json(
        { error: "Missing or invalid required fields", missing },
        { status: 400 }
      );
    }

    // ---------------- optional fields (aligned to your model) ----------------
    const cabins = toInt(body.cabins);
    const heads = toInt(body.heads);

    const loa = toFloat(body.loa);
    const loaUnit = isNonEmpty(body.loaUnit) ? toStr(body.loaUnit) : "ft";

    const draft = toFloat(body.draft);
    const draftUnit = isNonEmpty(body.draftUnit) ? toStr(body.draftUnit) : "ft";

    const airDraft = toFloat(body.airDraft);
    const airDraftUnit = isNonEmpty(body.airDraftUnit) ? toStr(body.airDraftUnit) : "ft";

    const engineFuel = upperOrNull(body.engineFuel); // "DIESEL" | "GAS"
    const engineMake = isNonEmpty(body.engineMake) ? toStr(body.engineMake) : null;
    const engineModel = isNonEmpty(body.engineModel) ? toStr(body.engineModel) : null;
    const propeller = isNonEmpty(body.propeller) ? toStr(body.propeller) : null;
    const engineHorsepower = toInt(body.engineHorsepower);

    const engineHours = toInt(body.engineHours);
    const leftEngineHours = toInt(body.leftEngineHours);
    const rightEngineHours = toInt(body.rightEngineHours);

    const hasGenerator = coerceYesNoToBool(body.hasGenerator) ?? false;
    const generatorFuel = upperOrNull(body.generatorFuel);
    const generatorMake = isNonEmpty(body.generatorMake) ? toStr(body.generatorMake) : null;
    const generatorKw = toFloat(body.generatorKw);
    const generatorHours = toInt(body.generatorHours);

    const tankUnit = isNonEmpty(body.tankUnit) ? toStr(body.tankUnit) : null; // "gal" | "L"
    const tankFuel = toFloat(body.tankFuel);
    const tankWater = toFloat(body.tankWater);
    const tankHolding = toFloat(body.tankHolding);

    const hasDinghy = coerceYesNoToBool(body.hasDinghy);
    const dinghyModel = isNonEmpty(body.dinghyModel) ? toStr(body.dinghyModel) : null;
    const dinghyLength = toFloat(body.dinghyLength);
    const dinghyLengthUnit = isNonEmpty(body.dinghyLengthUnit) ? toStr(body.dinghyLengthUnit) : "ft";
    const dinghyMotor = coerceYesNoToBool(body.dinghyMotor);

    const equipment = Array.isArray(body.equipment) ? body.equipment.filter(Boolean) : undefined;

    const heroImageUrl = isNonEmpty(body.heroImageUrl) ? toStr(body.heroImageUrl) : null;
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter(Boolean) : undefined;

    const contactPhone = isNonEmpty(body.contactPhone) ? toStr(body.contactPhone) : null;

    const brokerageName =
      sellerRole === "BROKER" && isNonEmpty(body.brokerageName) ? toStr(body.brokerageName) : null;
    const brokerageAddress =
      sellerRole === "BROKER" && isNonEmpty(body.brokerageAddress)
        ? toStr(body.brokerageAddress)
        : null;
    const brokerLogoUrl = isNonEmpty(body.brokerLogoUrl) ? toStr(body.brokerLogoUrl) : null;

    // ---------------- create ----------------
    const created = await prisma.listing.create({
      data: {
        // ✅ owner of the listing
        userId: s.uid,

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
        engineModel,
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
        tankHolding,

        hasDinghy: hasDinghy ?? false,
        dinghyModel: hasDinghy ? dinghyModel : null,
        dinghyLength: hasDinghy ? dinghyLength : null,
        dinghyLengthUnit: hasDinghy ? dinghyLengthUnit : null,
        dinghyMotor: hasDinghy ? dinghyMotor : null,

        equipment,
        heroImageUrl,
        imageUrls,

        sellerRole,
        listingContactName,
        contactEmail,
        contactPhone,

        brokerageName,
        brokerageAddress,
        brokerLogoUrl,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

