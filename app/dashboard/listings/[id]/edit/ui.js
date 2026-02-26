"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function arraysEqual(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) return false;
  return true;
}

function clampGallery(arr) {
  const clean = (Array.isArray(arr) ? arr : [])
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);
  return clean.slice(0, 30);
}

function deriveLoadedState(listing) {
  const pendingGallery = Array.isArray(listing?.pendingImageUrls) ? listing.pendingImageUrls : [];
  const liveGallery = Array.isArray(listing?.imageUrls) ? listing.imageUrls : [];

  const preferPendingGallery = pendingGallery.length > 0 ? pendingGallery : liveGallery;

  return {
    title: listing?.pendingTitle ?? listing?.title ?? "",
    description: listing?.pendingDescription ?? listing?.description ?? "",
    heroImageUrl: listing?.pendingHeroImageUrl ?? listing?.heroImageUrl ?? "",
    imageUrls: clampGallery(preferPendingGallery),

    price: listing?.price != null ? String(listing.price) : "",
    currency: listing?.currency || "USD",

    locationCountry: listing?.locationCountry || "",
    locationCity: listing?.locationCity || "",
    locationState: listing?.locationState || "",
    locationUsRegion: listing?.locationUsRegion || "",

    listingContactName: listing?.listingContactName || "",
    contactEmail: listing?.contactEmail || "",
    contactPhone: listing?.contactPhone || "",
  };
}

function deriveLiveState(listing) {
  return {
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    heroImageUrl: listing?.heroImageUrl ?? "",
    imageUrls: clampGallery(listing?.imageUrls || []),
  };
}

export default function EditListingForm({ listing }) {
  const router = useRouter();

  const status = String(listing?.status || "").toUpperCase();
  const billingStatus = String(listing?.billingStatus || "FREE").toUpperCase();
  const contentReviewStatus = String(listing?.contentReviewStatus || "NONE").toUpperCase();

  const isPaid = billingStatus === "ACTIVE";
  const isPublished = status === "PUBLISHED";
  const isPendingReview = status === "PENDING_REVIEW";
  const isRejected = status === "REJECTED";
  const isRemoved = status === "REMOVED";

  const hasPendingContent = isPublished && contentReviewStatus === "PENDING";
  const contentRejected = isPublished && contentReviewStatus === "REJECTED";

  const previewToken = listing?.previewToken || "";
  const previewUrl = useMemo(() => (previewToken ? `/listings/preview/${previewToken}` : ""), [previewToken]);

  // Local previews for newly uploaded keys BEFORE saving
  const [localPreviewMap, setLocalPreviewMap] = useState({});

  // Loaded baseline (what the server last sent us)
  const [baseline, setBaseline] = useState(() => deriveLoadedState(listing));

  // Form state
  const [title, setTitle] = useState(baseline.title);
  const [description, setDescription] = useState(baseline.description);

  const [heroImageUrl, setHeroImageUrl] = useState(baseline.heroImageUrl);
  const [imageUrls, setImageUrls] = useState(baseline.imageUrls);

  const [price, setPrice] = useState(baseline.price);
  const [currency, setCurrency] = useState(baseline.currency);

  const [locationCountry, setLocationCountry] = useState(baseline.locationCountry);
  const [locationCity, setLocationCity] = useState(baseline.locationCity);
  const [locationState, setLocationState] = useState(baseline.locationState);
  const [locationUsRegion, setLocationUsRegion] = useState(baseline.locationUsRegion);

  const [listingContactName, setListingContactName] = useState(baseline.listingContactName);
  const [contactEmail, setContactEmail] = useState(baseline.contactEmail);
  const [contactPhone, setContactPhone] = useState(baseline.contactPhone);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [showCompare, setShowCompare] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // When server data changes (router.refresh after save), sync baseline + state
  useEffect(() => {
    const next = deriveLoadedState(listing);
    setBaseline(next);

    setTitle(next.title);
    setDescription(next.description);
    setHeroImageUrl(next.heroImageUrl);
    setImageUrls(next.imageUrls);

    setPrice(next.price);
    setCurrency(next.currency);

    setLocationCountry(next.locationCountry);
    setLocationCity(next.locationCity);
    setLocationState(next.locationState);
    setLocationUsRegion(next.locationUsRegion);

    setListingContactName(next.listingContactName);
    setContactEmail(next.contactEmail);
    setContactPhone(next.contactPhone);

    // clear any temporary signed preview urls after refresh (server now references keys)
    setLocalPreviewMap({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id, listing?.updatedAt, listing?.contentSubmittedAt, listing?.contentReviewedAt]);

  const dirtyMajor =
    title !== baseline.title ||
    description !== baseline.description ||
    heroImageUrl !== baseline.heroImageUrl ||
    !arraysEqual(imageUrls, baseline.imageUrls);

  const dirtyMinor =
    price !== baseline.price ||
    currency !== baseline.currency ||
    locationCountry !== baseline.locationCountry ||
    locationCity !== baseline.locationCity ||
    locationState !== baseline.locationState ||
    locationUsRegion !== baseline.locationUsRegion ||
    listingContactName !== baseline.listingContactName ||
    contactEmail !== baseline.contactEmail ||
    contactPhone !== baseline.contactPhone;

  const dirtyAny = dirtyMajor || dirtyMinor;

  // Warn if user tries to close tab with unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (!dirtyAny) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyAny]);

  function StatusPill({ children, tone = "slate" }) {
    const toneMap = {
      slate: "bg-slate-50 text-slate-700 border-slate-200",
      amber: "bg-amber-50 text-amber-800 border-amber-200",
      green: "bg-emerald-50 text-emerald-800 border-emerald-200",
      red: "bg-red-50 text-red-700 border-red-200",
      navy: "bg-[#0a2230] text-white border-[#0a2230]",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${toneMap[tone] || toneMap.slate}`}>
        {children}
      </span>
    );
  }

  function imgSrcForKey(key) {
    if (!key) return "";
    if (localPreviewMap[key]) return localPreviewMap[key];
    if (!previewToken) return "";
    return `/api/uploads?key=${encodeURIComponent(String(key))}&token=${encodeURIComponent(String(previewToken))}`;
  }

  async function uploadOne(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Upload failed.");

    const key = data?.key;
    const signed = data?.previewUrl;
    if (!key) throw new Error("Upload failed: missing key.");

    if (signed) setLocalPreviewMap((m) => ({ ...m, [key]: signed }));
    return key;
  }

  async function onHeroFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr("");
    setOk("");
    setUploadingHero(true);
    try {
      const key = await uploadOne(file);
      setHeroImageUrl(key);
      setOk("Hero image uploaded (not saved yet).");
    } catch (e2) {
      setErr(e2?.message || "Hero upload failed.");
    } finally {
      setUploadingHero(false);
    }
  }

  async function onGalleryFilesChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setErr("");
    setOk("");
    setUploadingGallery(true);

    try {
      let remaining = 30 - imageUrls.length;
      if (remaining <= 0) {
        setOk("You’ve reached the max of 30 gallery images.");
        return;
      }

      const toUpload = files.slice(0, remaining);
      const newKeys = [];
      for (const f of toUpload) newKeys.push(await uploadOne(f));

      setImageUrls((prev) => clampGallery([...prev, ...newKeys]));
      setOk(`${newKeys.length} image(s) uploaded (not saved yet).`);
    } catch (e2) {
      setErr(e2?.message || "Gallery upload failed.");
    } finally {
      setUploadingGallery(false);
    }
  }

  function removeGalleryImage(idx) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveGalleryImage(idx, dir) {
    setImageUrls((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  }

  function setAsHero(key) {
    if (!key) return;
    setHeroImageUrl(key);
    setOk("Set as hero image (not saved yet).");
  }

  function resetToLoaded() {
    if (!confirm("Discard your unsaved changes and revert to the last loaded version?")) return;
    setErr("");
    setOk("");
    setTitle(baseline.title);
    setDescription(baseline.description);
    setHeroImageUrl(baseline.heroImageUrl);
    setImageUrls(baseline.imageUrls);

    setPrice(baseline.price);
    setCurrency(baseline.currency);

    setLocationCountry(baseline.locationCountry);
    setLocationCity(baseline.locationCity);
    setLocationState(baseline.locationState);
    setLocationUsRegion(baseline.locationUsRegion);

    setListingContactName(baseline.listingContactName);
    setContactEmail(baseline.contactEmail);
    setContactPhone(baseline.contactPhone);
  }

  function resetToLive() {
    const live = deriveLiveState(listing);
    if (!confirm("Reset title/description/photos back to the LIVE version currently visible to the public?")) return;
    setErr("");
    setOk("Reset to live content (not saved yet).");
    setTitle(live.title);
    setDescription(live.description);
    setHeroImageUrl(live.heroImageUrl);
    setImageUrls(live.imageUrls);
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);

    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,

          price,
          currency,

          locationCountry,
          locationCity,
          locationState,
          locationUsRegion,

          listingContactName,
          contactEmail,
          contactPhone,

          heroImageUrl: heroImageUrl || null,
          imageUrls: clampGallery(imageUrls),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed.");

      if (isPublished && data?.majorChanged) {
        setOk("Saved.");
      } else if (isPublished) {
        setOk("Saved. Minor edits updated the live listing.");
      } else {
        setOk("Saved.");
      }

      router.refresh();
    } catch (e2) {
      setErr(e2?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function submitForApproval() {
    setErr("");
    setOk("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/listings/${listing.id}/submit-for-review`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Submit failed.");

      setOk("Submitted for review. An admin will approve it before it goes live.");
      router.refresh();
    } catch (e) {
      setErr(e?.message || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const live = useMemo(() => deriveLiveState(listing), [listing]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0a2230]">Edit listing</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill tone={isPublished ? "green" : isPendingReview ? "amber" : isRejected || isRemoved ? "red" : "slate"}>
              {status.replaceAll("_", " ") || "—"}
            </StatusPill>

              <StatusPill tone={isPaid ? "green" : billingStatus === "PAST_DUE" ? "red" : billingStatus === "CANCELED" ? "amber" : "slate"}>
                Billing: {billingStatus || "—"}
              </StatusPill>

            {isPublished && (
              <StatusPill tone={contentReviewStatus === "PENDING" ? "amber" : contentReviewStatus === "REJECTED" ? "red" : "slate"}>
                Content review: {contentReviewStatus}
              </StatusPill>
            )}

            {dirtyAny && <StatusPill tone="amber">Unsaved changes</StatusPill>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isPublished ? (
            <a
              className="h-10 inline-flex items-center rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
              href={`/listings/${listing.id}`}
              target="_blank"
              rel="noreferrer"
            >
              View live
            </a>
          ) : (
            <a
              className="h-10 inline-flex items-center rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
              href={previewUrl || "#"}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (!previewUrl) e.preventDefault();
              }}
            >
              Preview
            </a>
          )}

          <Link className="h-10 inline-flex items-center rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50" href="/dashboard/listings">
            Back
          </Link>
        </div>
      </div>

      {/* Context banners */}
      {isRemoved && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">This listing was removed by an admin.</div>
          {listing.removedReason && <div className="mt-1">{listing.removedReason}</div>}
          <div className="mt-2 text-xs text-red-700/80">
            You can still edit details for recordkeeping, but it won’t be publishable unless restored by admin.
          </div>
        </div>
      )}

      {!isRemoved && isPublished && hasPendingContent && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-semibold">Content changes pending approval</div>
          <div className="mt-1">
            Your title/description/photos updates are waiting for admin review. Minor edits update immediately.
          </div>
          <button
            type="button"
            className="mt-3 h-9 rounded-full border px-4 text-xs font-semibold hover:bg-white"
            onClick={() => setShowCompare((v) => !v)}
          >
            {showCompare ? "Hide live vs pending preview" : "Show live vs pending preview"}
          </button>

          {showCompare && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs font-semibold text-slate-700">Live</div>
                <div className="mt-2">
                  {live.heroImageUrl ? (
                    <img className="h-28 w-full rounded-lg border object-cover" src={imgSrcForKey(live.heroImageUrl)} alt="" />
                  ) : (
                    <div className="h-28 w-full rounded-lg border bg-slate-50 flex items-center justify-center text-xs text-slate-500">No live hero</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <div className="text-xs font-semibold text-slate-700">Pending (your edits)</div>
                <div className="mt-2">
                  {heroImageUrl ? (
                    <img className="h-28 w-full rounded-lg border object-cover" src={imgSrcForKey(heroImageUrl)} alt="" />
                  ) : (
                    <div className="h-28 w-full rounded-lg border bg-slate-50 flex items-center justify-center text-xs text-slate-500">No pending hero</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!isRemoved && isPublished && contentRejected && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Content changes were rejected</div>
          <div className="mt-1">{listing.contentRejectionReason || "An admin rejected your content changes. Please edit and save again to resubmit."}</div>
          <div className="mt-2 text-xs text-red-700/80">
            Update title/description/photos and click “Save changes” to resubmit.
          </div>
        </div>
      )}

      {!isRemoved && isPublished && !hasPendingContent && !contentRejected && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="font-semibold">Your listing is live.</div>
          <div className="mt-1">Minor edits update immediately. Title/description/photos changes require admin approval.</div>
        </div>
      )}

      {!isRemoved && !isPublished && !isPaid && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold">Payment required before approval.</div>
          <div className="mt-1">Complete checkout to submit your listing to the admin approval queue.</div>
        </div>
      )}

      {!isRemoved && isPaid && isPendingReview && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-semibold">Awaiting admin approval.</div>
          <div className="mt-1">Your listing is in the review queue and will go live after approval.</div>
        </div>
      )}

      {!isRemoved && isRejected && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Rejected</div>
          <div className="mt-1">{listing.rejectionReason || "An admin rejected this listing. Please correct issues and resubmit."}</div>
        </div>
      )}

      {/* Alerts */}
      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
      {ok && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{ok}</div>}

      {/* Form */}
      <form onSubmit={save} className="mt-6 space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2 justify-between items-start">
          <div className="text-sm font-semibold text-[#0a2230]">Listing details</div>
          <div className="flex flex-wrap gap-2">
            {isPublished && (
              <button
                type="button"
                className="h-9 rounded-full border px-4 text-xs font-semibold hover:bg-slate-50"
                onClick={resetToLive}
              >
                Reset to live
              </button>
            )}
            <button
              type="button"
              className="h-9 rounded-full border px-4 text-xs font-semibold hover:bg-slate-50"
              onClick={resetToLoaded}
              disabled={!dirtyAny}
            >
              Discard changes
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#0a2230]">Title</label>
          <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
          {isPublished && <div className="mt-1 text-xs text-slate-500">Title changes require admin approval when live.</div>}
        </div>

        <div>
          <label className="text-sm font-semibold text-[#0a2230]">Description</label>
          <textarea className="mt-2 w-full min-h-[170px] rounded-xl border px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
          {isPublished && <div className="mt-1 text-xs text-slate-500">Description changes require admin approval when live.</div>}
        </div>

        {/* Photos */}
        <div className="rounded-2xl border bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-[#0a2230]">Photos</div>
              <div className="mt-1 text-xs text-slate-600">
                {isPublished ? "Changing photos requires admin approval." : "Upload photos before submitting for approval."}
              </div>
              {dirtyMajor && <div className="mt-1 text-xs text-amber-700">Photos/title/description changes are not saved yet.</div>}
            </div>
            <div className="text-xs text-slate-500">Gallery: {imageUrls.length}/30</div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Hero */}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-[#0a2230]">Hero image</div>
                <label className="h-9 cursor-pointer rounded-full bg-[#0a2230] px-4 text-xs font-semibold text-white inline-flex items-center justify-center hover:opacity-95">
                  {uploadingHero ? "Uploading…" : "Upload hero"}
                  <input type="file" accept="image/*" className="hidden" onChange={onHeroFileChange} />
                </label>
              </div>

              <div className="mt-3">
                {heroImageUrl ? (
                  <div>
                    <img src={imgSrcForKey(heroImageUrl)} alt="" className="h-44 w-full rounded-xl border object-cover" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="h-9 rounded-full border px-4 text-xs font-semibold hover:bg-slate-50"
                        onClick={() => setHeroImageUrl("")}
                      >
                        Remove hero
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 w-full rounded-xl border bg-slate-50 flex items-center justify-center text-xs text-slate-500">No hero image yet</div>
                )}
              </div>
            </div>

            {/* Gallery */}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-[#0a2230]">Gallery</div>
                <label className="h-9 cursor-pointer rounded-full border px-4 text-xs font-semibold inline-flex items-center justify-center hover:bg-slate-50">
                  {uploadingGallery ? "Uploading…" : "Upload images"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onGalleryFilesChange} />
                </label>
              </div>

              {imageUrls.length === 0 ? (
                <div className="mt-3 h-44 w-full rounded-xl border bg-slate-50 flex items-center justify-center text-xs text-slate-500">No gallery images yet</div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {imageUrls.map((k, idx) => (
                    <div key={`${k}-${idx}`} className="rounded-xl border p-2 bg-white">
                      <img src={imgSrcForKey(k)} alt="" className="h-28 w-full rounded-lg object-cover" />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" className="h-8 rounded-full border px-3 text-[11px] font-semibold hover:bg-slate-50" onClick={() => setAsHero(k)}>
                          Set hero
                        </button>
                        <button type="button" className="h-8 rounded-full border px-3 text-[11px] font-semibold hover:bg-slate-50" onClick={() => moveGalleryImage(idx, -1)} disabled={idx === 0}>
                          Up
                        </button>
                        <button type="button" className="h-8 rounded-full border px-3 text-[11px] font-semibold hover:bg-slate-50" onClick={() => moveGalleryImage(idx, +1)} disabled={idx === imageUrls.length - 1}>
                          Down
                        </button>
                        <button type="button" className="h-8 rounded-full border border-red-200 bg-red-50 px-3 text-[11px] font-semibold text-red-700 hover:brightness-95" onClick={() => removeGalleryImage(idx)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 text-xs text-slate-500">Tip: reorder with Up/Down. First few images show most prominently.</div>
            </div>
          </div>
        </div>

        {/* Minor fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-[#0a2230]">Price</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 185000" />
            <div className="mt-1 text-xs text-slate-500">Price updates live immediately.</div>
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">Currency</label>
            <select className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["USD", "EUR", "GBP", "AUD", "NZD", "JPY"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">Country</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={locationCountry} onChange={(e) => setLocationCountry(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">City</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">State</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={locationState} onChange={(e) => setLocationState(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">US Region</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={locationUsRegion} onChange={(e) => setLocationUsRegion(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">Contact name</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={listingContactName} onChange={(e) => setListingContactName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">Contact email</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0a2230]">Phone</label>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            disabled={saving || !dirtyAny}
            className="h-10 rounded-full bg-[#0a2230] px-5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : dirtyAny ? "Save changes" : "No changes"}
          </button>

          {!isRemoved && isPaid && !isPublished && !isPendingReview && (
            <button
              type="button"
              disabled={submitting}
              className="h-10 rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:opacity-60"
              onClick={submitForApproval}
            >
              {submitting ? "Submitting…" : isRejected ? "Resubmit for approval" : "Submit for approval"}
            </button>
          )}

          {!isRemoved && isPaid && isPendingReview && (
            <span className="h-10 inline-flex items-center rounded-full bg-amber-50 px-5 text-sm font-semibold text-amber-800 border border-amber-200">
              Awaiting approval
            </span>
          )}

          {!isRemoved && !isPaid && (
            <Link className="h-10 inline-flex items-center rounded-full bg-[#c8a44d] px-5 text-sm font-semibold text-[#0a2230] hover:brightness-95" href={`/checkout/${listing.id}`}>
              Go to checkout
            </Link>
          )}

          {!isPublished && previewUrl && (
            <a className="h-10 inline-flex items-center rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50" href={previewUrl} target="_blank" rel="noreferrer">
              Open preview
            </a>
          )}
        </div>

        <div className="text-xs text-slate-500">
          {!isRemoved && !isPublished && !isPaid
            ? "Your listing won’t be sent to the admin queue until payment is complete."
            : !isRemoved && isPaid && !isPublished
            ? "Paid listings must be approved by an admin before they go live."
            : isPublished
            ? "Minor edits apply immediately. Title/description/photos changes require admin approval."
            : ""}
        </div>
      </form>

      {/* Sticky unsaved bar */}
      {dirtyAny && (
        <div className="fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-amber-900">
                You have unsaved changes
                <span className="ml-2 text-xs font-medium text-amber-800">
                  {dirtyMajor && dirtyMinor ? "(content + minor edits)" : dirtyMajor ? "(content changes)" : "(minor edits)"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="h-9 rounded-full bg-[#0a2230] px-4 text-xs font-semibold text-white hover:opacity-95"
                  onClick={() => {
                    // submit the form programmatically
                    document?.getElementById?.("editListingHiddenSubmit")?.click?.();
                  }}
                >
                  Save now
                </button>
                <button type="button" className="h-9 rounded-full border px-4 text-xs font-semibold hover:bg-white" onClick={resetToLoaded}>
                  Discard
                </button>
                {isPublished && (
                  <button type="button" className="h-9 rounded-full border px-4 text-xs font-semibold hover:bg-white" onClick={resetToLive}>
                    Reset to live
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden submit button for sticky bar */}
      <button id="editListingHiddenSubmit" className="hidden" onClick={(e) => save(e)} />
    </div>
  );
}
