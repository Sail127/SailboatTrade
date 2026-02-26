// app/api/listings/[id]/edit/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTOS = 25;

function cleanString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
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

export async function PATCH(req, { params }) {
  try {
    const s = await readSession();
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const id = String(params?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    const status = String(listing.status || "").toUpperCase();
    if (!["DRAFT", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Editing is disabled while this listing is under review or published." },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
    }

    const data = {
      title: cleanString(body.title),
      description: cleanString(body.description),

      locationCountry: cleanString(body.locationCountry),
      locationCity: cleanString(body.locationCity),
      locationState: cleanString(body.locationState),
      locationUsRegion: cleanString(body.locationUsRegion),

      price: cleanInt(body.price),
      currency: cleanString(body.currency),

      year: cleanInt(body.year),
      builder: cleanString(body.builder),
      model: cleanString(body.model),
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

      heroImageUrl: cleanString(body.heroImageUrl),
      imageUrls: cleanStringArray(body.imageUrls, MAX_PHOTOS).slice(0, MAX_PHOTOS),

      riggingRemarks: cleanString(body.riggingRemarks),
      additionalInfo: cleanString(body.additionalInfo),

      sellerRole: cleanString(body.sellerRole),
      listingContactName: cleanString(body.listingContactName),
      contactEmail: cleanString(body.contactEmail),
      contactPhone: cleanString(body.contactPhone),

      brokerageName: cleanString(body.brokerageName),
      brokerageAddress: cleanString(body.brokerageAddress),
      brokerHeroImageUrl: cleanString(body.brokerHeroImageUrl),
    };

    // Remove undefined (Prisma rejects)
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });

    await prisma.listing.update({ where: { id }, data });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Update failed." }, { status: 500 });
  }
}