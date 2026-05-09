// app/api/listings/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  normalizeCityName,
  normalizePersonName,
  normalizeStateName,
  normalizeListingTitle,
} from "@/lib/textFormat";
import { normalizeHeroImageFrame } from "@/lib/heroImageFrame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "NZD",
  "JPY",
  "CAD",
]);

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function toStr(v, maxLen = 500) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeText(v, maxLen, formatter) {
  const s = toStr(v, maxLen);
  return s ? formatter(s) : null;
}

function toInt(v, { min = 0, max = 2_000_000_000 } = {}) {
  if (v === "" || v == null) return null;
  const raw = String(v).replace(/[^\d-]/g, "");
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(req, { params }) {
  let s;
  try {
    try {
      try {
        try {
          s = await requireUser();
        } catch {
          return NextResponse.json(
            { ok: false, error: "Authentication required" },
            { status: 401 },
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Authentication required" },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
  } catch {
    return Response.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
  });

  if (!listing)
    return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  return Response.json({ ok: true, listing });
}

export async function PUT(req, { params }) {
  let s;
  try {
    try {
      try {
        try {
          try {
            try {
              try {
                try {
                  s = await requireUser();
                } catch {
                  return NextResponse.json(
                    { ok: false, error: "Authentication required" },
                    { status: 401 },
                  );
                }
              } catch {
                return NextResponse.json(
                  { ok: false, error: "Authentication required" },
                  { status: 401 },
                );
              }
            } catch {
              return NextResponse.json(
                { ok: false, error: "Authentication required" },
                { status: 401 },
              );
            }
          } catch {
            return NextResponse.json(
              { ok: false, error: "Authentication required" },
              { status: 401 },
            );
          }
        } catch {
          return NextResponse.json(
            { ok: false, error: "Authentication required" },
            { status: 401 },
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Authentication required" },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
  } catch {
    return Response.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
  });

  if (!listing)
    return Response.json({ ok: false, error: "Not found." }, { status: 404 });

  if (String(listing.status).toUpperCase() === "REMOVED") {
    return Response.json(
      { ok: false, error: "This listing was removed." },
      { status: 403 },
    );
  }

  const status = String(listing.status || "").toUpperCase();
  const canEdit = ["DRAFT", "REJECTED"].includes(status);
  if (!canEdit) {
    return Response.json(
      { ok: false, error: "Editing is disabled while this listing is under review or published." },
      { status: 409 },
    );
  }

  // --------- Read incoming fields safely (partial update friendly) ----------
  const nextTitle = has(body, "title")
    ? normalizeText(body.title, 120, normalizeListingTitle)
    : (listing.title ?? null);
  const nextDescription = has(body, "description")
    ? toStr(body.description, 12_000) || null
    : (listing.description ?? null);

  const nextPrice = has(body, "price")
    ? toInt(body.price, { min: 0, max: 2_000_000_000 })
    : listing.price;

  const nextCurrency = (() => {
    if (!has(body, "currency")) return listing.currency || "USD";
    const c = toStr(body.currency, 8).toUpperCase();
    return (ALLOWED_CURRENCIES.has(c) ? c : "") || listing.currency || "USD";
  })();

  const nextLocationCountry = has(body, "locationCountry")
    ? toStr(body.locationCountry, 60) || null
    : (listing.locationCountry ?? null);
  const nextLocationCity = has(body, "locationCity")
    ? normalizeText(body.locationCity, 60, normalizeCityName)
    : (listing.locationCity ?? null);
  const nextLocationState = has(body, "locationState")
    ? normalizeText(body.locationState, 60, normalizeStateName)
    : (listing.locationState ?? null);
  const nextLocationUsRegion = has(body, "locationUsRegion")
    ? toStr(body.locationUsRegion, 60) || null
    : (listing.locationUsRegion ?? null);

  const nextListingContactName = has(body, "listingContactName")
    ? normalizeText(body.listingContactName, 80, normalizePersonName)
    : (listing.listingContactName ?? null);

  const nextContactEmail = has(body, "contactEmail")
    ? toStr(body.contactEmail, 120) || null
    : (listing.contactEmail ?? null);
  const nextContactPhone = has(body, "contactPhone")
    ? toStr(body.contactPhone, 40) || null
    : (listing.contactPhone ?? null);

  if (!isValidEmail(nextContactEmail)) {
    return Response.json(
      { ok: false, error: "Please enter a valid contact email." },
      { status: 400 },
    );
  }

  // Images are optional; only considered changed if provided
  const nextHeroImageUrl = has(body, "heroImageUrl")
    ? toStr(body.heroImageUrl, 500) || null
    : undefined;

  const nextImageUrls =
    has(body, "imageUrls") && Array.isArray(body.imageUrls)
      ? body.imageUrls
          .filter(Boolean)
          .map((x) => String(x).trim())
          .filter((x) => x.length > 0)
          .slice(0, 30)
      : undefined;
  const nextHeroImageFrame = has(body, "heroImageFrame")
    ? normalizeHeroImageFrame(body.heroImageFrame)
    : undefined;

  // --------- MINOR updates: apply immediately even if published ----------
  const minorData = {
    price: nextPrice,
    currency: nextCurrency,

    locationCountry: nextLocationCountry,
    locationCity: nextLocationCity,
    locationState: nextLocationState,
    locationUsRegion: nextLocationUsRegion,

    listingContactName: nextListingContactName,
    contactEmail: nextContactEmail,
    contactPhone: nextContactPhone,
  };

  const data = { ...minorData };

  if (has(body, "title")) data.title = nextTitle;
  if (has(body, "description")) data.description = nextDescription;

  if (nextHeroImageUrl !== undefined) data.heroImageUrl = nextHeroImageUrl;
  if (nextImageUrls !== undefined) data.imageUrls = nextImageUrls;
  if (nextHeroImageFrame !== undefined) data.heroImageFrame = nextHeroImageFrame;

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data,
  });

  return Response.json({ ok: true, listing: updated });
}
