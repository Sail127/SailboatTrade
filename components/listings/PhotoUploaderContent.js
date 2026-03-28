"use client";

import { useState } from "react";
import ListingCard from "@/components/ListingCard";
import { normalizeHeroImageFrame } from "@/lib/heroImageFrame";

function formatPrice(value, currency = "USD") {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD"),
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${num.toLocaleString()} ${currency}`;
  }
}

function usRegionLabel(value) {
  const key = String(value || "").toUpperCase();
  if (key === "WEST_COAST") return "West Coast";
  if (key === "EAST_COAST") return "East Coast";
  if (key === "GULF_COAST") return "Gulf Coast";
  if (key === "GREAT_LAKES") return "Great Lakes";
  if (key === "HAWAII") return "Hawaii";
  if (key === "OTHER_INLAND_WATERS") return "Other Inland Waters";
  if (key === "OTHER_US_TERRITORIAL") return "Other U.S. Territorial";
  return "";
}

function isFileDrag(event) {
  return Boolean(event.dataTransfer?.types?.includes("Files"));
}

function DividerTitle({ children }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-300" />
      <div className="text-[13px] font-semibold tracking-[0.08em] text-[#0a2230]">{children}</div>
      <div className="h-px flex-1 bg-slate-300" />
    </div>
  );
}

function UploadButton({
  disabled = false,
  onFilesSelected,
  label = "Upload",
  multiple = true,
}) {
  return (
    <label
      className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-[13px] font-semibold text-[#0a2230] transition hover:bg-slate-50 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={async (event) => {
          await onFilesSelected?.(event.target.files);
          event.target.value = "";
        }}
      />
      {label}
    </label>
  );
}

function EmptyPreviewCard({ previewListing }) {
  const previewTitle = String(previewListing?.title || "Sailboat Listing").trim() || "Sailboat Listing";
  const priceText = formatPrice(previewListing?.price, previewListing?.currency || "USD");
  const lengthText = previewListing?.loa ? `${previewListing.loa} ${previewListing?.loaUnit || "ft"}` : "";
  const countryUpper = String(previewListing?.locationCountry || "").trim().toUpperCase();
  const primaryLocation = [previewListing?.locationCity, previewListing?.locationState]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
  const secondaryLocation =
    countryUpper === "US"
      ? usRegionLabel(previewListing?.locationUsRegion)
        ? `${usRegionLabel(previewListing?.locationUsRegion)}, USA`
        : ""
      : String(previewListing?.locationCountry || "").trim();

  return (
    <div className="group block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
      <div className="relative h-56 bg-slate-100 sm:h-64">
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] font-semibold text-slate-500">
          Upload a listing card photo to preview the live listing card.
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-2.5 pt-1.5">
        <div className="flex min-h-[30px] items-center justify-between gap-2">
          <h3 className="line-clamp-1 flex-1 text-[15px] font-semibold leading-[1.15] text-slate-900">{previewTitle}</h3>
          {priceText ? <div className="shrink-0 text-[15px] font-bold leading-none text-[#0a2230]">{priceText}</div> : null}
        </div>

        {lengthText ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium leading-none text-slate-700">
              {lengthText}
            </span>
          </div>
        ) : null}

        <div className="mt-2 text-[13px] leading-tight text-slate-700">
          {secondaryLocation ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 truncate">{primaryLocation || "Location updates here"}</div>
              <span className="shrink-0 whitespace-nowrap">{secondaryLocation}</span>
            </div>
          ) : (
            <div className="line-clamp-1">{primaryLocation || "Location updates here"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PhotoUploaderContent({
  items = [],
  maxPhotos = 25,
  isBusy = false,
  limitMessage = "",
  onDismissLimitMessage = null,
  notice = null,
  onFeaturedFilesSelected,
  onAlbumFilesSelected,
  featuredButtonDisabled = false,
  albumButtonDisabled = false,
  featuredButtonLabel = "Upload",
  albumButtonLabel = "Upload",
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  heroImageFrame = null,
  previewListing = null,
}) {
  const [activeDropArea, setActiveDropArea] = useState("");
  const heroItem = items.find((item) => item.isHero) ?? null;
  const albumItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.isHero);
  const albumCounterOffset = heroItem ? 2 : 1;
  const canAddMorePhotos = items.length < maxPhotos;

  async function handleFeaturedDrop(event) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setActiveDropArea("");
    if (featuredButtonDisabled || isBusy) return;
    await onFeaturedFilesSelected?.(event.dataTransfer?.files);
  }

  async function handleAlbumDrop(event) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setActiveDropArea("");
    if (albumButtonDisabled || isBusy) return;
    await onAlbumFilesSelected?.(event.dataTransfer?.files);
  }

  function handleDragEnter(area, event) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (isBusy) return;
    setActiveDropArea(area);
  }

  function handleDragOverArea(area, event) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (isBusy) return;
    event.dataTransfer.dropEffect = "copy";
    if (activeDropArea !== area) setActiveDropArea(area);
  }

  function handleDragLeave(area, event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (activeDropArea === area) setActiveDropArea("");
  }

  return (
    <div className="space-y-4">
      {limitMessage ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <div>{limitMessage}</div>
          {onDismissLimitMessage ? (
            <button
              type="button"
              className="text-[12px] font-semibold underline underline-offset-2 hover:text-amber-950"
              onClick={onDismissLimitMessage}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      {notice}

      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-4">
        <div className="space-y-5">
          <DividerTitle>Listing Card Preview</DividerTitle>

          <div className="flex flex-col gap-4 min-[640px]:flex-row min-[640px]:items-start">
            <div
              className={`w-full shrink-0 max-w-[372px] rounded-2xl transition ${
                activeDropArea === "featured" ? "ring-4 ring-[#c8a44d]/20" : ""
              }`}
              onDragEnter={(event) => handleDragEnter("featured", event)}
              onDragOver={(event) => handleDragOverArea("featured", event)}
              onDragLeave={(event) => handleDragLeave("featured", event)}
              onDrop={handleFeaturedDrop}
            >
              {heroItem ? (
                <ListingCard
                  listing={{
                    id: previewListing?.id || "preview",
                    year: previewListing?.year ?? "",
                    builder: previewListing?.builder ?? "",
                    model: previewListing?.model ?? "",
                    title: previewListing?.title ?? "Sailboat Listing",
                    type: previewListing?.type ?? "",
                    loa: previewListing?.loa ?? "",
                    loaUnit: previewListing?.loaUnit ?? "ft",
                    price: previewListing?.price ?? "",
                    currency: previewListing?.currency ?? "USD",
                    locationCity: previewListing?.locationCity ?? "",
                    locationState: previewListing?.locationState ?? "",
                    locationCountry: previewListing?.locationCountry ?? "",
                    locationUsRegion: previewListing?.locationUsRegion ?? "",
                    featuredHome: false,
                    heroImageUrl: heroItem.imageSrc,
                    heroImageFrame: normalizeHeroImageFrame(heroImageFrame),
                  }}
                  variant="featured"
                  interactive={false}
                  showFavorite={false}
                  previewChrome
                  previewUploaded={Boolean(heroItem?.isUploaded)}
                />
              ) : (
                <EmptyPreviewCard previewListing={previewListing} />
              )}
            </div>

            <div className="flex min-w-[148px] flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="text-[13px] font-semibold text-[#0a2230]">Drag &amp; drop listing card photo</div>
              <UploadButton
                disabled={featuredButtonDisabled || isBusy}
                onFilesSelected={onFeaturedFilesSelected}
                label={featuredButtonLabel}
                multiple={false}
              />
              {heroItem ? (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center text-[20px] font-bold leading-none text-red-600 hover:text-red-700"
                  onClick={() => onRemove?.(heroItem.id)}
                  aria-label="Delete listing card photo"
                  title="Delete listing card photo"
                >
                  X
                </button>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-300/80 pt-5">
            <DividerTitle>Album Preview</DividerTitle>

            <div
              className={`mt-4 rounded-2xl border border-transparent transition ${
                activeDropArea === "album" ? "border-[#c8a44d]/40 bg-amber-50/50" : ""
              }`}
              onDragEnter={(event) => handleDragEnter("album", event)}
              onDragOver={(event) => handleDragOverArea("album", event)}
              onDragLeave={(event) => handleDragLeave("album", event)}
              onDrop={handleAlbumDrop}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {canAddMorePhotos ? (
                  <label
                    className={`flex min-h-[210px] cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:bg-slate-50 ${
                      albumButtonDisabled || isBusy ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={albumButtonDisabled || isBusy}
                      className="hidden"
                      onChange={async (event) => {
                        await onAlbumFilesSelected?.(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <div className="text-[13px] font-semibold text-[#0a2230]">Drag &amp; drop album photos</div>
                    <div className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-[13px] font-semibold text-[#0a2230]">
                      {albumButtonLabel}
                    </div>
                  </label>
                ) : null}

                {albumItems.map(({ item, index: originalIndex }) => (
                  <div
                    key={item.id}
                    draggable={!isBusy}
                    onDragStart={(event) => onDragStart?.(event, item.id)}
                    onDragOver={(event) => {
                      if (isFileDrag(event)) return;
                      event.preventDefault();
                      event.stopPropagation();
                      onDragOver?.(event);
                    }}
                    onDrop={(event) => {
                      if (isFileDrag(event)) return;
                      event.preventDefault();
                      event.stopPropagation();
                      onDrop?.(event, item.id);
                    }}
                    onDragEnd={() => onDragEnd?.()}
                    className="relative cursor-move overflow-hidden border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageSrc}
                        alt={item.alt || "Album photo preview"}
                        className="h-36 w-full bg-slate-100 object-contain shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                        loading="lazy"
                      />

                      {item.isUploaded ? (
                        <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                          ✓
                        </div>
                      ) : null}
                    </div>

                    <div className="relative min-h-[50px] bg-white px-2 py-2">
                      <div className="absolute bottom-2 left-2 text-[12px] text-slate-600">{`${originalIndex + albumCounterOffset} of ${maxPhotos}`}</div>
                      <button
                        type="button"
                        className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center text-[20px] font-bold leading-none text-red-600 hover:text-red-700"
                        onClick={() => onRemove?.(item.id)}
                        aria-label="Delete album photo"
                        title="Delete album photo"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
