"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCountryOptions } from "@/lib/countries";
import { getUsStateOptions } from "@/lib/us-states";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";
const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";

const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTOS = 25;
const US_REGION_OPTIONS = [
  { label: "Select…", value: "" },
  { label: "West Coast", value: "WEST_COAST" },
  { label: "East Coast", value: "EAST_COAST" },
  { label: "Gulf Coast", value: "GULF_COAST" },
  { label: "Great Lakes", value: "GREAT_LAKES" },
  { label: "Hawaii", value: "HAWAII" },
  { label: "Other Inland waters", value: "OTHER_INLAND_WATERS" },
  { label: "Other U.S. Territorial waters", value: "OTHER_US_TERRITORIAL" },
];

function normalizeCountryCode(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const up = s.toUpperCase();
  if (up === "USA" || up === "US" || up === "U.S." || up === "U.S.A.") return "US";
  if (s.toLowerCase().includes("united states")) return "US";
  if (/^[A-Z]{2}$/.test(up)) return up;
  return s;
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
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${map[tone] || map.slate}`}>
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

function numOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v) {
  const n = numOrNull(v);
  if (n == null) return null;
  return Math.trunc(n);
}
function strOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

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
  if (token && !/([?&])token=/.test(url)) url += `${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  return url;
}

function Gallery({ keys = [], token = "", title = "Listing photos" }) {
  const images = useMemo(() => (keys || []).filter(Boolean).map((k) => imageUrlFromKey(k, token)), [keys, token]);
  const [idx, setIdx] = useState(0);

  useEffect(() => setIdx((v) => Math.max(0, Math.min(v, Math.max(0, images.length - 1)))), [images.length]);

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
    </div>
  );
}

async function uploadOneFile(file) {
  // Tries common “POST FormData” pattern
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

    // Presign pattern
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

  throw new Error(data?.error || (text && text.length < 180 ? text : "Upload failed."));
}

export default function ListingEditClient({ initialListing, previewToken = "" }) {
  const router = useRouter();
  const status = String(initialListing?.status || "").toUpperCase();
  const billingStatus = String(initialListing?.billingStatus || "FREE").toUpperCase();
  const isRejected = status === "REJECTED";
  const canSubmitForReview = isRejected && billingStatus === "ACTIVE";
  const countryOptions = useMemo(() => getCountryOptions("en"), []);
  const usStateOptions = useMemo(() => getUsStateOptions(), []);

  const [form, setForm] = useState(() => {
    const l = initialListing || {};
    const orderedPhotos = normalizePhotoOrder(l.imageUrls, l.heroImageUrl);
    return {
      id: l.id,

      title: l.title ?? "",
      year: l.year ?? "",
      builder: l.builder ?? "",
      model: l.model ?? "",
      price: l.price ?? "",
      currency: l.currency ?? "USD",
      boatCondition: l.boatCondition ?? "USED",
      type: l.type ?? "MONOHULL",

      locationCountry: l.locationCountry ?? "",
      locationUsRegion: l.locationUsRegion ?? "",
      locationCity: l.locationCity ?? "",
      locationState: l.locationState ?? "",

      sellerRole: l.sellerRole ?? "OWNER",
      listingContactName: l.listingContactName ?? "",
      brokerageName: l.brokerageName ?? "",
      brokerageAddress: l.brokerageAddress ?? "",
      contactPhone: l.contactPhone ?? "",
      contactEmail: l.contactEmail ?? "",
      brokerHeroImageUrl: l.brokerHeroImageUrl ?? "",

      imageUrls: orderedPhotos,
      heroImageUrl: orderedPhotos[0] || "",

      description: l.description ?? "",
      riggingRemarks: l.riggingRemarks ?? "",
      additionalInfo: l.additionalInfo ?? "",

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

      engineFuel: l.engineFuel ?? "DIESEL",
      engineMake: l.engineMake ?? "",
      engineHorsepower: l.engineHorsepower ?? "",
      propeller: l.propeller ?? "",
      engineHours: l.engineHours ?? "",
      leftEngineHours: l.leftEngineHours ?? "",
      rightEngineHours: l.rightEngineHours ?? "",

      hasGenerator: Boolean(l.hasGenerator),
      generatorFuel: l.generatorFuel ?? "DIESEL",
      generatorMake: l.generatorMake ?? "",
      generatorKw: l.generatorKw ?? "",
      generatorHours: l.generatorHours ?? "",

      hasDinghy: Boolean(l.hasDinghy),
      dinghyDetails: l.dinghyDetails ?? "",

      equipment: Array.isArray(l.equipment) ? l.equipment.filter(Boolean) : [],
    };
  });

  const id = String(form.id || "").trim();
  const token = String(previewToken || "").trim();

  const previewHref = useMemo(() => {
    const t = token ? `?token=${encodeURIComponent(token)}` : "";
    return id ? `/listings/${encodeURIComponent(id)}${t}` : "/dashboard";
  }, [id, token]);

  const titleLine = useMemo(() => {
    const year = String(form.year ?? "").trim();
    const builder = String(form.builder ?? "").trim();
    const model = String(form.model ?? "").trim();
    return [year, builder, model].filter(Boolean).join(" ") || String(form.title || "Listing");
  }, [form.year, form.builder, form.model, form.title]);

  const photoCount = form.imageUrls.length;
  const overMax = photoCount > MAX_PHOTOS;

  const fileRef = useRef(null);
  const draggingPhotoIdxRef = useRef(-1);
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");

  const [equipInput, setEquipInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const normalizedCountry = normalizeCountryCode(form.locationCountry);
  const knownCountry = countryOptions.some((c) => c.value === normalizedCountry);
  const countrySelectValue = knownCountry ? normalizedCountry : String(form.locationCountry || "").trim() ? "Other" : "";
  const isUSA = normalizedCountry === "US";

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function movePhoto(from, to) {
    setForm((p) => {
      const arr = p.imageUrls.slice();
      if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return p;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      const ordered = normalizePhotoOrder(arr, arr[0]);
      return { ...p, imageUrls: ordered, heroImageUrl: ordered[0] || "" };
    });
  }
  function removePhoto(i) {
    setForm((p) => {
      const next = p.imageUrls.filter((_, idx) => idx !== i);
      const ordered = normalizePhotoOrder(next, next[0]);
      return { ...p, imageUrls: ordered, heroImageUrl: ordered[0] || "" };
    });
  }

  function movePhotoByIndex(i, direction) {
    const to = direction === "up" ? i - 1 : i + 1;
    movePhoto(i, to);
  }

  function onPhotoDragStart(e, idx) {
    draggingPhotoIdxRef.current = idx;
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
    } catch {}
  }

  function onPhotoDragOver(e) {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch {}
  }

  function onPhotoDrop(e, toIdx) {
    e.preventDefault();
    const fromIdx = Number.isInteger(draggingPhotoIdxRef.current) ? draggingPhotoIdxRef.current : -1;
    draggingPhotoIdxRef.current = -1;
    if (fromIdx < 0 || fromIdx === toIdx) return;
    movePhoto(fromIdx, toIdx);
  }

  function onPhotoDragEnd() {
    draggingPhotoIdxRef.current = -1;
  }

  function addPhotosFromFiles(files) {
    setPhotoErr("");
    if (!files?.length) return;

    const currentlyQueued = pendingPhotoFiles.length;
    const remaining = MAX_PHOTOS - form.imageUrls.length - currentlyQueued;
    if (remaining <= 0) {
      setPhotoErr(`Max ${MAX_PHOTOS} photos.`);
      return;
    }

    const incoming = Array.from(files);
    const accepted = incoming.slice(0, remaining);
    const rejected = incoming.length - accepted.length;
    if (accepted.length) {
      setPendingPhotoFiles((prev) => [...prev, ...accepted]);
    }
    if (rejected > 0) {
      setPhotoErr(`Only ${remaining} more ${remaining === 1 ? "photo" : "photos"} can be added.`);
    }
  }

  async function uploadQueuedPhotos() {
    setPhotoErr("");
    if (!pendingPhotoFiles.length) return;
    const remaining = MAX_PHOTOS - form.imageUrls.length;
    if (remaining <= 0) {
      setPhotoErr(`Max ${MAX_PHOTOS} photos.`);
      return;
    }
    const slice = pendingPhotoFiles.slice(0, remaining);

    setPhotoBusy(true);
    try {
      const keys = [];
      for (const f of slice) {
        // eslint-disable-next-line no-await-in-loop
        const k = await uploadOneFile(f);
        if (k) keys.push(k);
      }
      if (keys.length) {
        setForm((p) => {
          const merged = [...p.imageUrls, ...keys].slice(0, MAX_PHOTOS);
          const ordered = normalizePhotoOrder(merged, merged[0]);
          return { ...p, imageUrls: ordered, heroImageUrl: ordered[0] || "" };
        });
      }
      setPendingPhotoFiles((prev) => prev.slice(slice.length));
    } catch (e) {
      setPhotoErr(e?.message || "Upload failed.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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

  async function save(returnToPreview = false) {
    setSaveErr("");
    setSaveOk("");

    if (!id) {
      setSaveErr("Missing listing id.");
      return false;
    }
    if (overMax) {
      setSaveErr(`You have ${photoCount} photos. Max is ${MAX_PHOTOS}. Remove photos first.`);
      return false;
    }

    setSaving(true);
    try {
      const orderedPhotos = normalizePhotoOrder(form.imageUrls, form.heroImageUrl);
      const payload = {
        title: strOrNull(form.title),
        year: intOrNull(form.year),
        builder: strOrNull(form.builder),
        model: strOrNull(form.model),
        price: intOrNull(form.price),
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

        heroImageUrl: orderedPhotos[0] || null,
        imageUrls: orderedPhotos,

        description: strOrNull(form.description),
        riggingRemarks: strOrNull(form.riggingRemarks),
        additionalInfo: strOrNull(form.additionalInfo),

        cabins: intOrNull(form.cabins),
        heads: intOrNull(form.heads),

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
        engineHorsepower: intOrNull(form.engineHorsepower),
        propeller: strOrNull(form.propeller),
        engineHours: intOrNull(form.engineHours),
        leftEngineHours: intOrNull(form.leftEngineHours),
        rightEngineHours: intOrNull(form.rightEngineHours),

        hasGenerator: Boolean(form.hasGenerator),
        generatorFuel: strOrNull(form.generatorFuel),
        generatorMake: strOrNull(form.generatorMake),
        generatorKw: numOrNull(form.generatorKw),
        generatorHours: intOrNull(form.generatorHours),

        hasDinghy: Boolean(form.hasDinghy),
        dinghyDetails: strOrNull(form.dinghyDetails),

        equipment: (form.equipment || []).filter(Boolean),
      };

      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Save failed.");

      setSaveOk("Saved.");
      setReviewMsg("");
      if (returnToPreview) {
        router.push(previewHref);
        return true;
      }
      setTimeout(() => setSaveOk(""), 2000);
      return true;
    } catch (e) {
      setSaveErr(e?.message || "Save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (!id) return false;
    setReviewBusy(true);
    setReviewMsg("");
    setSaveErr("");
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/submit-for-review`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Resubmit failed.");
      setReviewMsg("Resubmitted for admin review.");
      router.refresh();
      return true;
    } catch (e) {
      setSaveErr(e?.message || "Resubmit failed.");
      return false;
    } finally {
      setReviewBusy(false);
    }
  }

  async function saveAndResubmit() {
    if (!canSubmitForReview) return;
    const saved = await save(false);
    if (!saved) return;
    await submitForReview();
  }

  return (
    <div className="py-8">
      <div className={CONTAINER}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="navy">Edit Draft</Badge>
            <Badge tone={overMax ? "red" : photoCount > FREE_PHOTO_LIMIT ? "gold" : "emerald"}>
              Photos: {photoCount} / {photoCount > FREE_PHOTO_LIMIT ? MAX_PHOTOS : FREE_PHOTO_LIMIT}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <a href={previewHref} className="inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50">
              Return to preview
            </a>

            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold text-white ${
                saving ? "bg-slate-300 cursor-not-allowed" : "bg-[#0a2230] hover:bg-[#0f2a3b]"
              }`}
            >
              Save &amp; Return
            </button>

            {canSubmitForReview ? (
              <button
                type="button"
                onClick={saveAndResubmit}
                disabled={saving || reviewBusy || overMax}
                className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold text-white ${
                  saving || reviewBusy || overMax ? "bg-emerald-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {reviewBusy ? "Submitting…" : saving ? "Saving…" : "Save & Resubmit"}
              </button>
            ) : null}
          </div>
        </div>

        {saveOk ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] text-emerald-800">
            {saveOk}
          </div>
        ) : null}
        {reviewMsg ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] text-emerald-800">
            {reviewMsg}
          </div>
        ) : null}
        {saveErr ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">
            {saveErr}
          </div>
        ) : null}

        {isRejected ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            <div className="font-semibold">Admin comment</div>
            <div className="mt-1">{initialListing?.rejectionReason || "Changes required before publishing."}</div>
            {canSubmitForReview ? (
              <div className="mt-2 text-[11px]">Use the green Save &amp; Resubmit button above after making your edits.</div>
            ) : (
              <div className="mt-2 text-[11px]">
                Complete checkout first to resubmit for admin review.
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-3">
            <div className="text-[22px] sm:text-[30px] font-extrabold tracking-tight leading-tight text-[#0a2230]">
              {titleLine}
            </div>

            <Gallery keys={form.imageUrls.length ? form.imageUrls : form.heroImageUrl ? [form.heroImageUrl] : []} token={token} title={titleLine} />

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-extrabold text-[#0a2230]">Photos</div>
                <div className="text-[11px] text-slate-600">Max {MAX_PHOTOS}. First photo is the hero image.</div>
              </div>

              {photoErr ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {photoErr}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotosFromFiles(e.target.files)} />
                <button
                  type="button"
                  disabled={photoBusy || form.imageUrls.length >= MAX_PHOTOS}
                  onClick={() => fileRef.current?.click()}
                  className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold border border-slate-300 bg-white text-[#0a2230] ${
                    photoBusy || form.imageUrls.length >= MAX_PHOTOS ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"
                  }`}
                >
                  Add photos
                </button>

                <button
                  type="button"
                  disabled={photoBusy || pendingPhotoFiles.length === 0}
                  onClick={uploadQueuedPhotos}
                  className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold text-white ${
                    photoBusy || pendingPhotoFiles.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-[#0a2230] hover:bg-[#0f2a3b]"
                  }`}
                >
                  {photoBusy ? "Uploading…" : "Upload"}
                </button>
              </div>

              {pendingPhotoFiles.length ? (
                <div className="mt-2 text-[12px] text-slate-600">
                  {pendingPhotoFiles.length} selected. Press Upload.
                </div>
              ) : null}

              {form.imageUrls.length > 1 ? (
                <div className="mt-2 text-[12px] text-slate-600">
                  Drag photos to reorder on desktop. On mobile, use the arrows on each photo.
                </div>
              ) : null}

              {form.imageUrls.length ? (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {form.imageUrls.map((k, i) => (
                    <div
                      key={k + i}
                      draggable={!photoBusy}
                      onDragStart={(e) => onPhotoDragStart(e, i)}
                      onDragOver={onPhotoDragOver}
                      onDrop={(e) => onPhotoDrop(e, i)}
                      onDragEnd={onPhotoDragEnd}
                      className="relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm cursor-move"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrlFromKey(k, token)} alt={`Photo ${i + 1}`} className="w-full h-36 object-contain bg-slate-100" loading="lazy" />

                      {i === 0 ? (
                        <div className="absolute left-2 top-2 rounded-full bg-[#0a2230] text-white text-[11px] font-semibold px-2 py-1">
                          Hero
                        </div>
                      ) : null}

                      <div className="absolute right-2 top-2 rounded-full bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1">
                        ✓
                      </div>

                      <div className="p-2 flex items-center justify-between gap-2">
                        <div className="text-[12px] text-slate-600">{i === 0 ? "Hero" : `Photo ${i + 1}`}</div>
                        <div className="flex items-center gap-1">
                          <div className="sm:hidden flex items-center gap-1">
                            <button
                              type="button"
                              disabled={i === 0}
                              aria-label="Move photo up"
                              onClick={() => movePhotoByIndex(i, "up")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-[#0a2230] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={i === form.imageUrls.length - 1}
                              aria-label="Move photo down"
                              onClick={() => movePhotoByIndex(i, "down")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-[#0a2230] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              ↓
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-[12px] text-slate-600">No photos yet.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 space-y-3">
                <div className="text-[14px] font-extrabold tracking-wide text-slate-600">Basics</div>

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

                <Field label="Hull Type">
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

              </div>

              <div className="p-5 space-y-4">
                <div className="text-[14px] font-extrabold tracking-wide text-slate-600">Boat Location</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Country">
                    <select
                      className={inputBase()}
                      value={countrySelectValue}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === "Other") {
                          setField("locationCountry", "");
                          setField("locationUsRegion", "");
                          setField("locationState", "");
                          return;
                        }
                        const normalized = normalizeCountryCode(next);
                        setField("locationCountry", normalized);
                        if (normalized !== "US") {
                          setField("locationUsRegion", "");
                          setField("locationState", "");
                        }
                      }}
                    >
                      {countryOptions.map((c) => (
                        <option key={c.value || "blank"} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </Field>

                  <Field label="City">
                    <input className={inputBase()} value={form.locationCity ?? ""} onChange={(e) => setField("locationCity", e.target.value)} />
                  </Field>
                </div>

                {countrySelectValue === "Other" ? (
                  <Field label="Country (type it)">
                    <input className={inputBase()} value={form.locationCountry ?? ""} onChange={(e) => setField("locationCountry", e.target.value)} />
                  </Field>
                ) : null}

                {isUSA ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="US Region">
                      <select className={inputBase()} value={form.locationUsRegion ?? ""} onChange={(e) => setField("locationUsRegion", e.target.value)}>
                        {US_REGION_OPTIONS.map((o) => (
                          <option key={o.value || "blank"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="State">
                      <select className={inputBase()} value={form.locationState ?? ""} onChange={(e) => setField("locationState", e.target.value)}>
                        {usStateOptions.map((s) => (
                          <option key={s.value || "blank"} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                ) : (
                  <Field label="State/Province">
                    <input className={inputBase()} value={form.locationState ?? ""} onChange={(e) => setField("locationState", e.target.value)} />
                  </Field>
                )}

                <div className="border-t border-slate-200 pt-4">
                  <div className="text-[14px] font-extrabold tracking-wide text-slate-600">Contact</div>
                </div>

                <Field label="Seller role">
                  <select className={inputBase()} value={form.sellerRole || "OWNER"} onChange={(e) => setField("sellerRole", e.target.value)}>
                    <option value="OWNER">Owner</option>
                    <option value="BROKER">Broker</option>
                  </select>
                </Field>

                <Field label="Contact name">
                  <input className={inputBase()} value={form.listingContactName ?? ""} onChange={(e) => setField("listingContactName", e.target.value)} />
                </Field>

                {String(form.sellerRole || "").toUpperCase() === "BROKER" ? (
                  <>
                    <Field label="Brokerage name">
                      <input className={inputBase()} value={form.brokerageName ?? ""} onChange={(e) => setField("brokerageName", e.target.value)} />
                    </Field>
                    <Field label="Brokerage address (multi-line allowed)">
                      <textarea className={textareaBase()} value={form.brokerageAddress ?? ""} onChange={(e) => setField("brokerageAddress", e.target.value)} />
                    </Field>
                    <Field label="Broker hero image key/URL">
                      <input className={inputBase()} value={form.brokerHeroImageUrl ?? ""} onChange={(e) => setField("brokerHeroImageUrl", e.target.value)} />
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

        <div className="mt-6 space-y-6">
          <SectionCard title="Description">
            <textarea className={textareaBase()} value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)} />
          </SectionCard>

          <SectionCard title="Specifications">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Cabins"><input className={inputBase()} value={form.cabins ?? ""} onChange={(e) => setField("cabins", e.target.value)} /></Field>
              <Field label="Heads"><input className={inputBase()} value={form.heads ?? ""} onChange={(e) => setField("heads", e.target.value)} /></Field>

              <Field label="LOA"><input className={inputBase()} value={form.loa ?? ""} onChange={(e) => setField("loa", e.target.value)} /></Field>
              <Field label="LOA Unit"><input className={inputBase()} value={form.loaUnit ?? ""} onChange={(e) => setField("loaUnit", e.target.value)} /></Field>

              <Field label="Draft"><input className={inputBase()} value={form.draft ?? ""} onChange={(e) => setField("draft", e.target.value)} /></Field>
              <Field label="Draft Unit"><input className={inputBase()} value={form.draftUnit ?? ""} onChange={(e) => setField("draftUnit", e.target.value)} /></Field>

              <Field label="Air Draft"><input className={inputBase()} value={form.airDraft ?? ""} onChange={(e) => setField("airDraft", e.target.value)} /></Field>
              <Field label="Air Draft Unit"><input className={inputBase()} value={form.airDraftUnit ?? ""} onChange={(e) => setField("airDraftUnit", e.target.value)} /></Field>

              <Field label="Displacement"><input className={inputBase()} value={form.displacement ?? ""} onChange={(e) => setField("displacement", e.target.value)} /></Field>
              <Field label="Displacement Unit"><input className={inputBase()} value={form.displacementUnit ?? ""} onChange={(e) => setField("displacementUnit", e.target.value)} /></Field>

              <Field label="Tank Unit"><input className={inputBase()} value={form.tankUnit ?? ""} onChange={(e) => setField("tankUnit", e.target.value)} /></Field>
              <Field label="Fuel Capacity"><input className={inputBase()} value={form.tankFuel ?? ""} onChange={(e) => setField("tankFuel", e.target.value)} /></Field>
              <Field label="Water Capacity"><input className={inputBase()} value={form.tankWater ?? ""} onChange={(e) => setField("tankWater", e.target.value)} /></Field>
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
              <Field label="Make"><input className={inputBase()} value={form.engineMake ?? ""} onChange={(e) => setField("engineMake", e.target.value)} /></Field>
              <Field label="Horsepower"><input className={inputBase()} value={form.engineHorsepower ?? ""} onChange={(e) => setField("engineHorsepower", e.target.value)} /></Field>
              <Field label="Propeller"><input className={inputBase()} value={form.propeller ?? ""} onChange={(e) => setField("propeller", e.target.value)} /></Field>
              <Field label="Hours (single)"><input className={inputBase()} value={form.engineHours ?? ""} onChange={(e) => setField("engineHours", e.target.value)} /></Field>
              <Field label="Left engine hours"><input className={inputBase()} value={form.leftEngineHours ?? ""} onChange={(e) => setField("leftEngineHours", e.target.value)} /></Field>
              <Field label="Right engine hours"><input className={inputBase()} value={form.rightEngineHours ?? ""} onChange={(e) => setField("rightEngineHours", e.target.value)} /></Field>
            </div>
          </SectionCard>

          <SectionCard title="Equipment">
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
                  placeholder="Add equipment item…"
                  value={equipInput}
                  onChange={(e) => setEquipInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEquipment();
                    }
                  }}
                />
                <button type="button" onClick={addEquipment} disabled={!equipInput.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-full px-4 text-[12px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 disabled:opacity-60">
                  Add
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Generator included?">
                  <select className={inputBase()} value={form.hasGenerator ? "YES" : "NO"} onChange={(e) => setField("hasGenerator", e.target.value === "YES")}>
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
                    <Field label="Generator make"><input className={inputBase()} value={form.generatorMake ?? ""} onChange={(e) => setField("generatorMake", e.target.value)} /></Field>
                    <Field label="Generator kW"><input className={inputBase()} value={form.generatorKw ?? ""} onChange={(e) => setField("generatorKw", e.target.value)} /></Field>
                    <Field label="Generator hours"><input className={inputBase()} value={form.generatorHours ?? ""} onChange={(e) => setField("generatorHours", e.target.value)} /></Field>
                  </>
                ) : null}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Dinghy included?">
                  <select className={inputBase()} value={form.hasDinghy ? "YES" : "NO"} onChange={(e) => setField("hasDinghy", e.target.value === "YES")}>
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </Field>

                {form.hasDinghy ? (
                  <div className="sm:col-span-2">
                    <Field label="Dinghy details">
                      <textarea className={textareaBase()} value={form.dinghyDetails ?? ""} onChange={(e) => setField("dinghyDetails", e.target.value)} />
                    </Field>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5" />

              <div>
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
