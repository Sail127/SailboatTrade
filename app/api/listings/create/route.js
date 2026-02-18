// app/api/listings/create/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isFtOrM = (v) => {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "ft" || s === "m";
};

const isCurrency = (v) =>
  ["USD", "EUR", "GBP", "AUD", "NZD", "JPY"].includes(String(v || "").toUpperCase());

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

const yesNoToBoolOrNull = (v) => {
  if (v === true) return true;
  if (v === false) return false;

  const s = String(v ?? "").toUpperCase().trim();
  if (s === "YES") return true;
  if (s === "NO") return false;
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;

  return null;
};

export async function POST(req) {
  try {
    // ✅ Require login
    const s = await requireUser().catch(() => null);
    const body = await req.json().catch(() => ({}));

    const ownerIdRaw = s?.uid ?? s?.id ?? s?.userId;
    const ownerId = ownerIdRaw ? String(ownerIdRaw) : "";

    if (!ownerId) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", error: "Unauthorized." },
        { status: 401 }
      );
    }

    // ✅ Phase 1: require verified email to create listings
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

    // ---------- normalize core fields ----------
    const currency = isCurrency(body.currency) ? String(body.currency).toUpperCase() : "USD";
    const plan =
      body.plan === "FEATURED_HOME" || body.plan === "STANDARD" ? body.plan : "STANDARD";

    const loaUnit = isFtOrM(body.loaUnit) ? String(body.loaUnit).toLowerCase() : "ft";
    const draftUnit = isFtOrM(body.draftUnit) ? String(body.draftUnit).toLowerCase() : null;
    const airDraftUnit = isFtOrM(body.airDraftUnit) ? String(body.airDraftUnit).toLowerCase() : null;

    const imageUrls = normalizeStringArray(body.imageUrls);
    const equipment = normalizeEquipment(body.equipment);

    const sellerRole = normalizeSellerRole(body.sellerRole);

    // ✅ booleans can arrive as YES/NO strings from your form
    const hasGenerator = yesNoToBoolOrNull(body.hasGenerator) ?? false;
    const hasDinghy = yesNoToBoolOrNull(body.hasDinghy) ?? false;

    // ✅ Dinghy text: your form uses dinghyNotes; support a few fallbacks
    const dinghyDetails =
      hasDinghy
        ? toStringOrNull(body.dinghyDetails ?? body.dinghyNotes ?? body.dinghyModel)
        : null;

    const listing = await prisma.listing.create({
      data: {
        ownerId,

        title: toStringOrNull(body.title),
        description: toStringOrNull(body.description),

        locationCity: toStringOrNull(body.locationCity),
        locationState: toStringOrNull(body.locationState),
        locationUsRegion: toStringOrNull(body.locationUsRegion),
        locationCountry: toStringOrNull(body.locationCountry),

        price: toIntOrNull(body.price),
        currency,

        year: toIntOrNull(body.year),
        builder: toStringOrNull(body.builder),
        model: toStringOrNull(body.model),

        boatCondition: normalizeBoatCondition(body.boatCondition),

        cabins: toIntOrNull(body.cabins),
        heads: toIntOrNull(body.heads),

        loa: toNumberOrNull(body.loa),
        loaUnit,

        draft: toNumberOrNull(body.draft),
        draftUnit,

        airDraft: toNumberOrNull(body.airDraft),
        airDraftUnit,

        type: normalizeHullType(body.type),

        engineFuel: normalizeFuelType(body.engineFuel),
        engineMake: toStringOrNull(body.engineMake),
        engineModel: toStringOrNull(body.engineModel),
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
        tankHolding: toNumberOrNull(body.tankHolding),

        // ✅ Dinghy (new form supports: hasDinghy + dinghyDetails free-text)
        hasDinghy,
        dinghyDetails,

        // ✅ Legacy fields (kept in schema; ensure clean data)
        dinghyModel: null,
        dinghyLength: null,
        dinghyLengthUnit: null,
        dinghyMotor: null,

        equipment,
        heroImageUrl: toStringOrNull(body.heroImageUrl),
        imageUrls,

        sellerRole,
        listingContactName: toStringOrNull(body.listingContactName),
        contactEmail: toStringOrNull(body.contactEmail),
        contactPhone: toStringOrNull(body.contactPhone),

        brokerageName: sellerRole === "BROKER" ? toStringOrNull(body.brokerageName) : null,
        brokerageAddress: sellerRole === "BROKER" ? toStringOrNull(body.brokerageAddress) : null,
        brokerLogoUrl: toStringOrNull(body.brokerLogoUrl),

        status: "DRAFT",
        plan,
        paymentStatus: "NONE",
      },
      select: { id: true, previewToken: true },
    });

    // ✅ Use existing detail route + token query for draft preview + image access
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

    // ✅ Friendlier Prisma unknown-field errors (e.g. schema mismatch)
    const msg = String(err?.message || "");
    if (msg.includes("Unknown argument")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Schema mismatch: Prisma does not recognize a field being sent. Run your migration and regenerate Prisma client.",
          detail: msg,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create listing." },
      { status: 500 }
    );
  }
}
