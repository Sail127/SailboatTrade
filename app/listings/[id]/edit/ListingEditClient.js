// app/listings/[id]/edit/ListingEditClient.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";
const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";

// schema-aligned constants you already use
const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTOS = 25;

/* -----------------------------
   UI primitives (match preview)
------------------------------ */
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.08)] overflow-hidden">
      <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
        <h2 className="text-[15px] sm:text-[18px] font-extrabold tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-xs sm:text-sm text-white/80">{subtitle}</p> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const map = {
    slate: "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    navy: "border-[#0a2230] bg-[#0a2230] text-white",
    gold: "border-[#c8a44d] bg-[#c8a44d] text-[#0a2230]",
    red: "border-red-200 bg-red-50 text-red-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${
        map[tone] || map.slate
      }`}
    >
      {children}
    </span>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12px] font-semibold text-[#0a2230]">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-slate-500">{hint}</div> : null}
    </label>
  );
}

function inputBase() {
  return (
    "w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
  );
}

function textareaBase() {
  return (
    "w-full min-h-[120px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
  );
}

function isYes(v) {
  if (v === true) return true;
  const s = String(v ?? "").toUpperCase().trim();
  return s === "YES" || s === "TRUE" || s === "1";
}
function yesNoEncode(valBool, originalVal) {
  const origType = typeof originalVal;
  if (origType === "string") return valBool ? "YES" : "NO";
  return Boolean(valBool);
}
function numOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function strOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/* -----------------------------
   Upload key -> image URL
------------------------------ */
function imageUrlFromKey(key, token) {
  if (!key) return "";
  const k = String(key).trim();
  if (!k) return "";

  if (k.startsWith("data:")) return k;
  if (/^https?:\/\//i.test(k)) return k;
  if (k.startsWith("/")) return k;

  const r2 = String(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (r2) return `${r2}/${encodeURIComponent(k)}`;

  const base = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || "/api/uploads?key=";

  let url = base.endsWith("/") ? `${base}${encodeURIComponent(k)}` : `${base}${encodeURIComponent(k)}`;
  if (token && !/([?&])token=/.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  }
  return url;
}

/* -----------------------------
   Gallery (same look, used in editor)
------------------------------ */
function Gallery({ keys = [], token = "", title = "Listing photos" }) {
  const images = useMemo(() => (keys || []).filter(Boolean).map((k) => imageUrlFromKey(k, token)), [keys, token]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx((v) => Math.max(0, Math.min(v, Math.max(0, images.length - 1))));
  }, [images.length]);

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-[13px] text-slate-600">
        No photos uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[idx]}
          alt={`${title} ${idx + 1}`}
          className="w-full aspect-[16/10] object-contain bg-slate-100"
          loading="eager"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setIdx((v) => (v - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 h-10 w-10 grid place-items-center hover:bg-white"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIdx((v) => (v + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 h-10 w-10 grid place-items-center hover:bg-white"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        ) : null}

        <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[12px] font-semibold text-white">
          {idx + 1} / {images.length}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIdx(i)}
            className={`relative h-16 w-24 flex-none overflow-hidden rounded-xl border ${
              i === idx ? "border-[#c8a44d]" : "border-slate-200"
            } bg-white`}
            aria-label={`View photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-contain bg-slate-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* -----------------------------
   Upload helper (works with common patterns)
------------------------------ */
async function uploadOneFile(file) {
  // Pattern A: POST multipart -> { ok:true, key } or { key } or { url }
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }

  if (res.ok) {
    if (data?.key) return data.key;
    if (Array.isArray(data?.keys) && data.keys[0]) return data.keys[0];
    if (data?.url) return data.url;

    // Pattern B: server returns presigned URL -> { uploadUrl, key }
    if (data?.uploadUrl && data?.key) {
      const put = await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!put.ok) throw new Error("Upload PUT failed.");
      return data.key;
    }
  }

  const err = data?.error || (text && text.length < 180 ? text : null) || "Upload failed.";
  throw new Error(err);
}

/* =========================================================
   Page
========================================================= */
export default function ListingEditClient({ initialListing, previewToken = "" }) {
  const router = useRouter();

  // snapshot originals for type-safe save (YES/NO strings vs booleans)
  const originals = useRef(initialListing);

  const [form, setForm] = useState(() => {
    const l = initialListing || {};
    return {
      id: l.id,

      // basics
      status: l.status ?? "DRAFT",
      title: l.title ?? "",
      year: l.year ?? "",
      builder: l.builder ?? "",
      model: l.model ?? "",
      price: l.price ?? "",
      currency: l.currency ?? "USD",
      boatCondition: l.boatCondition ?? "USED",
      type: l.type ?? "MONOHULL",

      // location
      locationCountry: l.locationCountry ?? "",
      locationUsRegion: l.locationUsRegion ?? "",
      locationCity: l.locationCity ?? "",
      locationState: l.locationState ?? "",

      // contact / seller
      sellerRole: l.sellerRole ?? "OWNER",
      listingContactName: l.listingContactName ?? "",
      brokerageName: l.brokerageName ?? "",
      brokerageAddress: l.brokerageAddress ?? "",
      contactPhone: l.contactPhone ?? "",
      contactEmail: l.contactEmail ?? "",
      brokerHeroImageUrl: l.brokerHeroImageUrl ?? "",

      // photos
      imageUrls: Array.isArray(l.imageUrls) ? l.imageUrls.filter(Boolean) : [],
      heroImageUrl: l.heroImageUrl ?? "",

      // specs
      cabins: l.cabins ?? "",
      heads: l.heads ?? "",
      loa: l.loa ?? "",
      loaUnit: l.loaUnit ?? "ft",
      draft: l.draft ?? "",
      draftUnit: l.draftUnit ?? "ft",
      airDraft: l.airDraft ?? "",
      airDraftUnit: l.airDraftUnit ?? "ft",
      displacement: l.displacement ?? "",
      displacementUnit: l.displacementUnit ?? "lb",

      tankUnit: l.tankUnit ?? "gal",
      tankFuel: l.tankFuel ?? "",
      tankWater: l.tankWater ?? "",

      // engine
      engineFuel: l.engineFuel ?? "DIESEL",
      engineMake: l.engineMake ?? "",
      engineHorsepower: l.engineHorsepower ?? "",
      propeller: l.propeller ?? "",
      engineHours: l.engineHours ?? "",
      leftEngineHours: l.leftEngineHours ?? "",
      rightEngineHours: l.rightEngineHours ?? "",

      // equipment
      equipment: Array.isArray(l.equipment) ? l.equipment.filter(Boolean) : [],

      // generator / dinghy
      hasGenerator: isYes(l.hasGenerator),
      generatorFuel: l.generatorFuel ?? "DIESEL",
      generatorMake: l.generatorMake ?? "",
      generatorKw: l.generatorKw ?? "",
      generatorHours: l.generatorHours ?? "",

      hasDinghy: isYes(l.hasDinghy),
      dinghyDetails: l.dinghyDetails ?? "",

      // text sections
      description: l.description ?? "",
      riggingRemarks: l.riggingRemarks ?? "",
      additionalInfo: l.additionalInfo ?? "",
    };
  });

  const id = String(form?.id || "").trim();
  const token = String(previewToken || "").trim();

  const previewHref = useMemo(() => {
    if (!id) return "/dashboard";
    const t = token ? `?token=${encodeURIComponent(token)}` : "";
    return `/listings/${encodeURIComponent(id)}${t}`;
  }, [id, token]);

  const editTitle = useMemo(() => {
    const year = form.year != null && String(form.year).trim() ? String(form.year).trim() : "";
    const builder = String(form.builder || "").trim();
    const model = String(form.model || "").trim();
    return [year, builder, model].filter(Boolean).join(" ") || String(form.title || "Listing");
  }, [form.year, form.builder, form.model, form.title]);

  const photoCount = form.imageUrls.length;
  const requiresUpgrade = photoCount > FREE_PHOTO_LIMIT;
  const overMax = photoCount > MAX_PHOTOS;

  // equipment editor
  const [equipInput, setEquipInput] = useState("");

  // photo editor
  const fileRef = useRef(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");

  // save state
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function movePhoto(from, to) {
    setForm((p) => {
      const arr = p.imageUrls.slice();
      if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return p;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...p, imageUrls: arr };
    });
  }

  function removePhoto(idx) {
    setForm((p) => ({ ...p, imageUrls: p.imageUrls.filter((_, i) => i !== idx) }));
  }

  function makeCover(idx) {
    if (idx <= 0) return;
    movePhoto(idx, 0);
  }

  async function addPhotosFromFiles(files) {
    setPhotoErr("");
    if (!files?.length) return;

    const current = form.imageUrls.length;
    if (current >= MAX_PHOTOS) {
      setPhotoErr(`Max ${MAX_PHOTOS} photos.`);
      return;
    }

    const slice = Array.from(files).slice(0, Math.max(0, MAX_PHOTOS - current));

    setPhotoBusy(true);
    try {
      const keys = [];
      for (const f of slice) {
        // eslint-disable-next-line no-await-in-loop
        const k = await uploadOneFile(f);
        if (k) keys.push(k);
      }
      if (keys.length) {
        setForm((p) => ({ ...p, imageUrls: [...p.imageUrls, ...keys].slice(0, MAX_PHOTOS) }));
      }
    } catch (e) {
      setPhotoErr(e?.message || "Upload failed.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addPhotoByUrl() {
    setPhotoErr("");
    const u = String(photoUrlInput || "").trim();
    if (!u) return;

    if (form.imageUrls.length >= MAX_PHOTOS) {
      setPhotoErr(`Max ${MAX_PHOTOS} photos.`);
      return;
    }

    setForm((p) => ({ ...p, imageUrls: [...p.imageUrls, u].slice(0, MAX_PHOTOS) }));
    setPhotoUrlInput("");
  }

  function addEquipment() {
    const v = String(equipInput || "").trim();
    if (!v) return;

    setForm((p) => {
      const next = Array.from(new Set([...(p.equipment || []), v]));
      next.sort((a, b) => String(a).localeCompare(String(b)));
      return { ...p, equipment: next };
    });
    setEquipInput("");
  }

  function removeEquipment(name) {
    setForm((p) => ({ ...p, equipment: (p.equipment || []).filter((x) => x !== name) }));
  }

  async function save({ returnToPreview = false } = {}) {
    setSaveErr("");
    setSaveOk("");

    if (!id) {
      setSaveErr("Missing listing id.");
      return;
    }

    if (overMax) {
      setSaveErr(`You have ${photoCount} photos. Max is ${MAX_PHOTOS}. Remove photos first.`);
      return;
    }

    setSaving(true);
    try {
      const orig = originals.current || {};

      // Build payload with proper types
      const payload = {
        title: strOrNull(form.title),
        year: numOrNull(form.year),
        builder: strOrNull(form.builder),
        model: strOrNull(form.model),
        price: numOrNull(form.price),
        currency: strOrNull(form.currency),

        boatCondition: strOrNull(form.boatCondition),
        type: strOrNull(form.type),

        locationCountry: strOrNull(form.locationCountry),
        locationUsRegion: strOrNull(form.locationUsRegion),
        locationCity: strOrNull(form.locationCity),
        locationState: strOrNull(form.locationState),

        sellerRole: strOrNull(form.sellerRole),
        listingContactName: strOrNull(form.listingContactName),
        brokerageName: strOrNull(form.brokerageName),
        brokerageAddress: strOrNull(form.brokerageAddress),
        contactPhone: strOrNull(form.contactPhone),
        contactEmail: strOrNull(form.contactEmail),
        brokerHeroImageUrl: strOrNull(form.brokerHeroImageUrl),

        imageUrls: (form.imageUrls || []).filter(Boolean).slice(0, MAX_PHOTOS),
        heroImageUrl: strOrNull(form.heroImageUrl),

        cabins: numOrNull(form.cabins),
        heads: numOrNull(form.heads),

        loa: numOrNull(form.loa),
        loaUnit: strOrNull(form.loaUnit),
        draft: numOrNull(form.draft),
        draftUnit: strOrNull(form.draftUnit),
        airDraft: numOrNull(form.airDraft),
        airDraftUnit: strOrNull(form.airDraftUnit),
        displacement: numOrNull(form.displacement),
        displacementUnit: strOrNull(form.displacementUnit),

        tankUnit: strOrNull(form.tankUnit),
        tankFuel: numOrNull(form.tankFuel),
        tankWater: numOrNull(form.tankWater),

        engineFuel: strOrNull(form.engineFuel),
        engineMake: strOrNull(form.engineMake),
        engineHorsepower: numOrNull(form.engineHorsepower),
        propeller: strOrNull(form.propeller),
        engineHours: numOrNull(form.engineHours),
        leftEngineHours: numOrNull(form.leftEngineHours),
        rightEngineHours: numOrNull(form.rightEngineHours),

        equipment: (form.equipment || []).filter(Boolean),

        hasGenerator: yesNoEncode(Boolean(form.hasGenerator), orig.hasGenerator),
        generatorFuel: strOrNull(form.generatorFuel),
        generatorMake: strOrNull(form.generatorMake),
        generatorKw: numOrNull(form.generatorKw),
        generatorHours: numOrNull(form.generatorHours),

        hasDinghy: yesNoEncode(Boolean(form.hasDinghy), orig.hasDinghy),
        dinghyDetails: strOrNull(form.dinghyDetails),

        description: strOrNull(form.description),
        riggingRemarks: strOrNull(form.riggingRemarks),
        additionalInfo: strOrNull(form.additionalInfo),
      };

      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Save failed.");

      setSaveOk("Saved.");
      if (returnToPreview) {
        router.push(previewHref);
        return;
      }

      setTimeout(() => setSaveOk(""), 2000);
    } catch (e) {
      setSaveErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // Nice UX: if user typed “title” but uses year/builder/model, show it anyway
  useEffect(() => {
    // no-op; keeps parity with preview’s computed title concept
  }, []);

  return (
    <div className="py-8">
      <div className={CONTAINER}>
        {/* Top actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="navy">Edit Draft</Badge>
            <Badge tone={overMax ? "red" : requiresUpgrade ? "gold" : "emerald"}>
              Photos: {photoCount} / {requiresUpgrade ? MAX_PHOTOS : FREE_PHOTO_LIMIT}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={previewHref}
              className="inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            >
              Return to preview
            </a>

            <button
              type="button"
              onClick={() => save({ returnToPreview: false })}
              disabled={saving}
              className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold text-white ${
                saving ? "bg-slate-300 cursor-not-allowed" : "bg-[#0a2230] hover:bg-[#0f2a3b]"
              }`}
            >
              {saving ? "Saving…" : "Save"}
            </button>

            <button
              type="button"
              onClick={() => save({ returnToPreview: true })}
              disabled={saving}
              className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold border border-[#c8a44d] bg-[#c8a44d] text-[#0a2230] hover:brightness-95 ${
                saving ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              Save &amp; Return
            </button>
          </div>
        </div>

        {saveOk ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] text-emerald-800">
            {saveOk}
          </div>
        ) : null}

        {saveErr ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">
            {saveErr}
          </div>
        ) : null}

        {/* Top layout mirrors preview */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Title + gallery */}
          <div className="lg:col-span-8 space-y-3">
            <div className="text-[22px] sm:text-[30px] font-extrabold tracking-tight leading-tight text-[#0a2230]">
              {editTitle}
            </div>

            <Gallery keys={form.imageUrls.length ? form.imageUrls : form.heroImageUrl ? [form.heroImageUrl] : []} token={token} title={editTitle} />

            {/* Photo editor */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-extrabold text-[#0a2230]">Edit photos</div>
                <div className="text-[11px] text-slate-600">
                  Max {MAX_PHOTOS}. Free preview limit is {FREE_PHOTO_LIMIT}.
                </div>
              </div>

              {photoErr ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {photoErr}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotosFromFiles(e.target.files)}
                />
                <button
                  type="button"
                  disabled={photoBusy || form.imageUrls.length >= MAX_PHOTOS}
                  onClick={() => fileRef.current?.click()}
                  className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold text-white ${
                    photoBusy || form.imageUrls.length >= MAX_PHOTOS
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-[#0a2230] hover:bg-[#0f2a3b]"
                  }`}
                >
                  {photoBusy ? "Uploading…" : "Upload photos"}
                </button>

                <div className="flex-1 min-w-[220px] flex items-center gap-2">
                  <input
                    className={inputBase()}
                    placeholder="Paste image URL or existing upload key…"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addPhotoByUrl}
                    disabled={!photoUrlInput.trim() || form.imageUrls.length >= MAX_PHOTOS}
                    className="inline-flex h-10 items-center justify-center rounded-full px-4 text-[12px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>
              </div>

              {form.imageUrls.length ? (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {form.imageUrls.map((k, i) => (
                    <div key={k + i} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrlFromKey(k, token)}
                          alt={`Photo ${i + 1}`}
                          className="w-full aspect-[4/3] object-contain bg-slate-100"
                          loading="lazy"
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => makeCover(i)}
                          disabled={i === 0}
                          className="inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 disabled:opacity-50"
                        >
                          Make cover
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(i, i - 1)}
                          disabled={i === 0}
                          className="inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 disabled:opacity-50"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(i, i + 1)}
                          disabled={i === form.imageUrls.length - 1}
                          className="inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 disabled:opacity-50"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-600 break-all">
                        {i === 0 ? <span className="font-semibold text-[#0a2230]">Cover • </span> : null}
                        {k}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-[12px] text-slate-600">No photos yet. Upload or paste a URL/key above.</div>
              )}
            </div>
          </div>

          {/* Right: editable contact card mirrors preview */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <div className="text-[14px] font-extrabold tracking-wide text-slate-600">Listing basics</div>

                <div className="mt-3 space-y-3">
                  <Field label="Price">
                    <input className={inputBase()} value={form.price ?? ""} onChange={(e) => setField("price", e.target.value)} />
                  </Field>

                  <Field label="Currency">
                    <select className={inputBase()} value={form.currency || "USD"} onChange={(e) => setField("currency", e.target.value)}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </Field>

                  <Field label="Condition">
                    <select className={inputBase()} value={form.boatCondition || "USED"} onChange={(e) => setField("boatCondition", e.target.value)}>
                      <option value="NEW">New</option>
                      <option value="USED">Used</option>
                    </select>
                  </Field>

                  <Field label="Hull type">
                    <select className={inputBase()} value={form.type || "MONOHULL"} onChange={(e) => setField("type", e.target.value)}>
                      <option value="MONOHULL">Monohull</option>
                      <option value="CATAMARAN">Catamaran</option>
                      <option value="TRIMARAN">Trimaran</option>
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Year">
                      <input className={inputBase()} value={form.year ?? ""} onChange={(e) => setField("year", e.target.value)} />
                    </Field>
                    <Field label="Builder">
                      <input className={inputBase()} value={form.builder ?? ""} onChange={(e) => setField("builder", e.target.value)} />
                    </Field>
                    <Field label="Model">
                      <input className={inputBase()} value={form.model ?? ""} onChange={(e) => setField("model", e.target.value)} />
                    </Field>
                  </div>

                  <Field label="Custom title (optional)" hint="If you leave this blank, your preview title uses Year + Builder + Model.">
                    <input className={inputBase()} value={form.title ?? ""} onChange={(e) => setField("title", e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="text-[14px] font-extrabold tracking-wide text-slate-600">Location</div>

                <Field label="Country">
                  <input className={inputBase()} value={form.locationCountry ?? ""} onChange={(e) => setField("locationCountry", e.target.value)} />
                </Field>

                <Field label="US Region (if US)">
                  <input className={inputBase()} value={form.locationUsRegion ?? ""} onChange={(e) => setField("locationUsRegion", e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="City">
                    <input className={inputBase()} value={form.locationCity ?? ""} onChange={(e) => setField("locationCity", e.target.value)} />
                  </Field>
                  <Field label="State/Province">
                    <input className={inputBase()} value={form.locationState ?? ""} onChange={(e) => setField("locationState", e.target.value)} />
                  </Field>
                </div>

                <div className="mt-4 text-[14px] font-extrabold tracking-wide text-slate-600">Contact</div>

                <Field label="Seller role">
                  <select className={inputBase()} value={form.sellerRole || "OWNER"} onChange={(e) => setField("sellerRole", e.target.value)}>
                    <option value="OWNER">Owner</option>
                    <option value="BROKER">Broker</option>
                  </select>
                </Field>

                <Field label="Contact name">
                  <input
                    className={inputBase()}
                    value={form.listingContactName ?? ""}
                    onChange={(e) => setField("listingContactName", e.target.value)}
                  />
                </Field>

                {String(form.sellerRole || "").toUpperCase() === "BROKER" ? (
                  <>
                    <Field label="Brokerage name">
                      <input className={inputBase()} value={form.brokerageName ?? ""} onChange={(e) => setField("brokerageName", e.target.value)} />
                    </Field>

                    <Field label="Brokerage address (multi-line allowed)">
                      <textarea className={textareaBase()} value={form.brokerageAddress ?? ""} onChange={(e) => setField("brokerageAddress", e.target.value)} />
                    </Field>

                    <Field label="Broker hero image key/URL (optional)">
                      <input
                        className={inputBase()}
                        value={form.brokerHeroImageUrl ?? ""}
                        onChange={(e) => setField("brokerHeroImageUrl", e.target.value)}
                        placeholder="Paste key or URL…"
                      />
                    </Field>
                  </>
                ) : null}

                <Field label="Phone">
                  <div className="rounded-xl border border-slate-300 px-3 py-2 focus-within:ring-2 focus-within:ring-[#c8a44d]/40 bg-white">
                    <PhoneInput
                      defaultCountry="us"
                      value={form.contactPhone ?? ""}
                      onChange={(v) => setField("contactPhone", v)}
                      inputClassName="w-full !border-0 !shadow-none !outline-none !text-sm !p-0"
                      countrySelectorStyleProps={{ buttonClassName: "!border-0 !shadow-none" }}
                    />
                  </div>
                </Field>

                <Field label="Email">
                  <input className={inputBase()} value={form.contactEmail ?? ""} onChange={(e) => setField("contactEmail", e.target.value)} inputMode="email" />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Sections mirror preview, but editable */}
        <div className="mt-6 space-y-6">
          <SectionCard title="Description">
            <textarea className={textareaBase()} value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)} />
          </SectionCard>

          <SectionCard title="Specifications">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Cabins">
                <input className={inputBase()} value={form.cabins ?? ""} onChange={(e) => setField("cabins", e.target.value)} />
              </Field>
              <Field label="Heads">
                <input className={inputBase()} value={form.heads ?? ""} onChange={(e) => setField("heads", e.target.value)} />
              </Field>

              <Field label="LOA">
                <input className={inputBase()} value={form.loa ?? ""} onChange={(e) => setField("loa", e.target.value)} />
              </Field>
              <Field label="LOA Unit">
                <input className={inputBase()} value={form.loaUnit ?? ""} onChange={(e) => setField("loaUnit", e.target.value)} />
              </Field>

              <Field label="Draft">
                <input className={inputBase()} value={form.draft ?? ""} onChange={(e) => setField("draft", e.target.value)} />
              </Field>
              <Field label="Draft Unit">
                <input className={inputBase()} value={form.draftUnit ?? ""} onChange={(e) => setField("draftUnit", e.target.value)} />
              </Field>

              <Field label="Air Draft">
                <input className={inputBase()} value={form.airDraft ?? ""} onChange={(e) => setField("airDraft", e.target.value)} />
              </Field>
              <Field label="Air Draft Unit">
                <input className={inputBase()} value={form.airDraftUnit ?? ""} onChange={(e) => setField("airDraftUnit", e.target.value)} />
              </Field>

              <Field label="Displacement">
                <input className={inputBase()} value={form.displacement ?? ""} onChange={(e) => setField("displacement", e.target.value)} />
              </Field>
              <Field label="Displacement Unit">
                <input className={inputBase()} value={form.displacementUnit ?? ""} onChange={(e) => setField("displacementUnit", e.target.value)} />
              </Field>

              <Field label="Tank Unit">
                <input className={inputBase()} value={form.tankUnit ?? ""} onChange={(e) => setField("tankUnit", e.target.value)} />
              </Field>
              <Field label="Fuel Capacity">
                <input className={inputBase()} value={form.tankFuel ?? ""} onChange={(e) => setField("tankFuel", e.target.value)} />
              </Field>
              <Field label="Water Capacity">
                <input className={inputBase()} value={form.tankWater ?? ""} onChange={(e) => setField("tankWater", e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Engine">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Fuel">
                <select className={inputBase()} value={form.engineFuel || "DIESEL"} onChange={(e) => setField("engineFuel", e.target.value)}>
                  <option value="DIESEL">Diesel</option>
                  <option value="GAS">Gas</option>
                </select>
              </Field>
              <Field label="Make">
                <input className={inputBase()} value={form.engineMake ?? ""} onChange={(e) => setField("engineMake", e.target.value)} />
              </Field>
              <Field label="Horsepower">
                <input className={inputBase()} value={form.engineHorsepower ?? ""} onChange={(e) => setField("engineHorsepower", e.target.value)} />
              </Field>
              <Field label="Propeller">
                <input className={inputBase()} value={form.propeller ?? ""} onChange={(e) => setField("propeller", e.target.value)} />
              </Field>

              <Field label="Hours (single)">
                <input className={inputBase()} value={form.engineHours ?? ""} onChange={(e) => setField("engineHours", e.target.value)} />
              </Field>
              <Field label="Left engine hours">
                <input className={inputBase()} value={form.leftEngineHours ?? ""} onChange={(e) => setField("leftEngineHours", e.target.value)} />
              </Field>
              <Field label="Right engine hours">
                <input className={inputBase()} value={form.rightEngineHours ?? ""} onChange={(e) => setField("rightEngineHours", e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Equipment" subtitle="Add / remove equipment items (saved as an array).">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {(form.equipment || []).length ? (
                  form.equipment.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => removeEquipment(name)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-[#0a2230] hover:bg-slate-50"
                      title="Click to remove"
                    >
                      {name} <span className="text-slate-400">×</span>
                    </button>
                  ))
                ) : (
                  <div className="text-[12px] text-slate-600">No equipment listed.</div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  className={inputBase()}
                  placeholder="Add equipment item (e.g., Autopilot)…"
                  value={equipInput}
                  onChange={(e) => setEquipInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEquipment();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addEquipment}
                  disabled={!equipInput.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-full px-4 text-[12px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 disabled:opacity-60"
                >
                  Add
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Generator included?">
                  <select
                    className={inputBase()}
                    value={form.hasGenerator ? "YES" : "NO"}
                    onChange={(e) => setField("hasGenerator", e.target.value === "YES")}
                  >
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </Field>

                {form.hasGenerator ? (
                  <>
                    <Field label="Generator fuel">
                      <select className={inputBase()} value={form.generatorFuel || "DIESEL"} onChange={(e) => setField("generatorFuel", e.target.value)}>
                        <option value="DIESEL">Diesel</option>
                        <option value="GAS">Gas</option>
                      </select>
                    </Field>
                    <Field label="Generator make">
                      <input className={inputBase()} value={form.generatorMake ?? ""} onChange={(e) => setField("generatorMake", e.target.value)} />
                    </Field>
                    <Field label="Generator kW">
                      <input className={inputBase()} value={form.generatorKw ?? ""} onChange={(e) => setField("generatorKw", e.target.value)} />
                    </Field>
                    <Field label="Generator hours">
                      <input className={inputBase()} value={form.generatorHours ?? ""} onChange={(e) => setField("generatorHours", e.target.value)} />
                    </Field>
                  </>
                ) : null}

                <Field label="Dinghy included?">
                  <select
                    className={inputBase()}
                    value={form.hasDinghy ? "YES" : "NO"}
                    onChange={(e) => setField("hasDinghy", e.target.value === "YES")}
                  >
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </Field>

                {form.hasDinghy ? (
                  <Field label="Dinghy details">
                    <textarea className={textareaBase()} value={form.dinghyDetails ?? ""} onChange={(e) => setField("dinghyDetails", e.target.value)} />
                  </Field>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4">
                <Field label="Rigging / sail inventory remarks">
                  <textarea className={textareaBase()} value={form.riggingRemarks ?? ""} onChange={(e) => setField("riggingRemarks", e.target.value)} />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Additional Information">
            <textarea className={textareaBase()} value={form.additionalInfo ?? ""} onChange={(e) => setField("additionalInfo", e.target.value)} />
          </SectionCard>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}