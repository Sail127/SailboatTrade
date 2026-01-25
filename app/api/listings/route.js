// app/api/listings/create/route.js
import prisma from "../../../../lib/prisma.js";

export const runtime = "nodejs";

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const toFloat = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const enumOr = (v, allowed, fallback = null) => {
  if (!v) return fallback;
  const up = String(v).toUpperCase();
  return allowed.includes(up) ? up : fallback;
};

export async function POST(req) {
  try {
    const body = await req.json();

    // ---- required ----
    const title = body?.title?.trim();
    if (!title) {
      return Response.json({ error: "Title is required." }, { status: 400 });
    }

    // Optional but commonly required — keep as optional if you want
    const contactEmail = body?.contactEmail?.trim() || null;

    // Enum normalize (Prisma expects enum values exactly)
    const type = enumOr(body?.type, ["MONOHULL", "CATAMARAN"], null);

    // Normalize currency
    const currency = (body?.currency || "USD").toString().trim().toUpperCase();

    // Units are strings in your schema, so keep lowercase defaults consistent with schema
    const lengthUnit = (body?.lengthUnit || "ft").toString().trim().toLowerCase();

    // ---- build data (schema-safe) ----
    const data = {
      // Do NOT allow client to set arbitrary status unless you intend it
      status: enumOr(body?.status, ["DRAFT", "PUBLISHED", "ARCHIVED"], "PUBLISHED"),

      title,

      description: body?.description?.trim() || null,
      equipment: Array.isArray(body?.equipment) ? body.equipment : body?.equipment ?? null,

      make: body?.make?.trim() || null,
      model: body?.model?.trim() || null,
      year: toInt(body?.year),

      type,

      price: toInt(body?.price),
      currency,

      length: toFloat(body?.length),
      lengthUnit,

      locationCity: body?.locationCity?.trim() || null,
      locationRegion: body?.locationRegion?.trim() || null,
      locationCountry: body?.locationCountry?.trim() || null,

      contactEmail,
      heroImageUrl: body?.heroImageUrl?.trim() || null,
      imageUrls: Array.isArray(body?.imageUrls) ? body.imageUrls : body?.imageUrls ?? null,
    };

    const created = await prisma.listing.create({
      data,
      select: { id: true },
    });

    return Response.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/listings/create error:", e);
    return Response.json(
      { error: e?.message || "Failed to create listing." },
      { status: 500 }
    );
  }
}
