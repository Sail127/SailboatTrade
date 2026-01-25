// app/listings/new/NewListingForm.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const label = "block text-sm font-semibold text-[#0a2230] mb-2";

const input =
  "w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const textarea =
  "w-full min-h-[130px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold " +
  "bg-[#0a2230] text-white hover:bg-[#0f2a3b] transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/50";

const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold " +
  "border border-slate-300 text-[#0a2230] hover:bg-slate-50 transition";

const smallPill =
  "h-9 rounded-full border border-slate-300 bg-white px-3 text-xs text-[#0a2230] shadow-sm " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/30";

const toInt = (v) => {
  if (v === "" || v == null) return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

const toFloat = (v) => {
  if (v === "" || v == null) return null;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

export default function NewListingForm() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  // Required per YOUR api route: title, description, contactEmail, type
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [type, setType] = useState("MONOHULL");

  // Optional
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [length, setLength] = useState("");
  const [lengthUnit, setLengthUnit] = useState("ft");

  const [locationCity, setLocationCity] = useState("");
  const [locationRegion, setLocationRegion] = useState("");
  const [locationCountry, setLocationCountry] = useState("");

  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [equipmentText, setEquipmentText] = useState("");

  const imageUrls = useMemo(
    () =>
      imageUrlsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [imageUrlsText]
  );

  const equipment = useMemo(
    () =>
      equipmentText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [equipmentText]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!title.trim() || !description.trim() || !contactEmail.trim() || !type) {
      setErr("Please fill: Title, Description, Contact Email, and Hull Type.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        // required
        title: title.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        type, // MONOHULL | CATAMARAN

        // optional
        make: make.trim() || null,
        model: model.trim() || null,
        year: toInt(year),

        price: toInt(price),
        currency,

        length: toFloat(length),
        lengthUnit, // "ft" or "m" (schema uses string)

        locationCity: locationCity.trim() || null,
        locationRegion: locationRegion.trim() || null,
        locationCountry: locationCountry.trim() || null,

        heroImageUrl: heroImageUrl.trim() || null,
        imageUrls: imageUrls.length ? imageUrls : null,
        equipment: equipment.length ? equipment : null,
      };

      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      router.push("/listings");
      router.refresh();
    } catch (e2) {
      setErr(e2?.message || "Failed to create listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* REQUIRED */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0a2230]">Required</h2>

        <div className="mt-4 grid grid-cols-1 gap-5">
          <div>
            <label className={label}>Title *</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className={label}>Description *</label>
            <textarea className={textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={label}>Contact Email *</label>
              <input className={input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>

            <div>
              <label className={label}>Hull Type *</label>
              <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="MONOHULL">Monohull</option>
                <option value="CATAMARAN">Catamaran</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* OPTIONAL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0a2230]">Optional details</h2>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={label}>Builder</label>
            <input className={input} value={make} onChange={(e) => setMake(e.target.value)} />
          </div>

          <div>
            <label className={label}>Model</label>
            <input className={input} value={model} onChange={(e) => setModel(e.target.value)} />
          </div>

          <div>
            <label className={label}>Year</label>
            <input className={input} value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
          </div>

          <div>
            <label className={label}>Price</label>
            <div className="flex gap-3">
              <input className={input} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
              <select
                className="h-11 w-28 rounded-xl border border-slate-300 bg-white px-3 text-sm text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {["USD", "EUR", "GBP", "AUD", "NZD", "JPY"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className={label}>Length</label>
              <select className={smallPill} value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value)}>
                <option value="ft">ft</option>
                <option value="m">m</option>
              </select>
            </div>
            <input className={input} value={length} onChange={(e) => setLength(e.target.value)} inputMode="decimal" />
          </div>

          <div>
            <label className={label}>City</label>
            <input className={input} value={locationCity} onChange={(e) => setLocationCity(e.target.value)} />
          </div>

          <div>
            <label className={label}>Region/State</label>
            <input className={input} value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} />
          </div>

          <div>
            <label className={label}>Country</label>
            <input className={input} value={locationCountry} onChange={(e) => setLocationCountry(e.target.value)} />
          </div>

          <div>
            <label className={label}>Hero Image URL</label>
            <input className={input} value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className={label}>Additional Image URLs (one per line)</label>
            <textarea className={textarea} value={imageUrlsText} onChange={(e) => setImageUrlsText(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className={label}>Equipment (one per line)</label>
            <textarea className={textarea} value={equipmentText} onChange={(e) => setEquipmentText(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" className={btnGhost} onClick={() => router.push("/listings")}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving…" : "Create listing"}
        </button>
      </div>
    </form>
  );
}
