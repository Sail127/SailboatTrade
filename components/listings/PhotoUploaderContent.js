"use client";

import { useState } from "react";

export default function PhotoUploaderContent({
  items = [],
  maxPhotos = 25,
  isBusy = false,
  limitMessage = "",
  onDismissLimitMessage = null,
  notice = null,
  onFilesSelected,
  addButtonDisabled = false,
  addButtonLabel = "Select photos",
  counterNote = "",
  counterSecondaryText = "",
  emptyText = "No photos yet.",
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMove,
  onRemove,
}) {
  const [isDragTargetActive, setIsDragTargetActive] = useState(false);

  async function handleDroppedFiles(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragTargetActive(false);
    if (addButtonDisabled || isBusy) return;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    await onFilesSelected?.(files);
  }

  function handleDragEnter(event) {
    event.preventDefault();
    if (addButtonDisabled || isBusy) return;
    if (event.dataTransfer?.types?.includes("Files")) setIsDragTargetActive(true);
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (addButtonDisabled || isBusy) return;
    event.dataTransfer.dropEffect = "copy";
    if (!isDragTargetActive) setIsDragTargetActive(true);
  }

  function handleDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragTargetActive(false);
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

      <div
        className={`rounded-2xl border-2 border-dashed px-4 py-4 transition ${
          isDragTargetActive
            ? "border-[#c8a44d] bg-amber-50/70 shadow-[0_0_0_4px_rgba(200,164,77,0.12)]"
            : "border-slate-300 bg-slate-50/60"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDroppedFiles}
      >
        <div className="flex min-h-[210px] flex-col justify-center">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="text-[15px] font-semibold text-[#0a2230]">
              Drag and drop photos here
            </div>
            <div className="text-[12px] text-slate-500">or</div>
            <label
              className={`inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-[13px] font-semibold text-[#0a2230] transition hover:bg-slate-50 cursor-pointer ${
                addButtonDisabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={addButtonDisabled}
                className="hidden"
                onChange={async (e) => {
                  await onFilesSelected?.(e.target.files);
                  e.target.value = "";
                }}
              />
              {addButtonLabel}
            </label>
            <div className="text-[12px] text-slate-500">JPG, PNG, and WEBP supported.</div>
          </div>

          <div className="mt-4 text-center text-[12px] font-semibold text-[#0a2230]">
            {items.length} of {maxPhotos} photos added
            {counterSecondaryText ? <span className="ml-2 text-[11px] font-medium text-slate-500">{counterSecondaryText}</span> : null}
          </div>

          {counterNote ? <div className="mt-1 text-center text-[12px] text-slate-600">{counterNote}</div> : null}

          {items.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-[13px] text-slate-600">
              {emptyText}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable={!isBusy}
                  onDragStart={(e) => onDragStart?.(e, item.id)}
                  onDragOver={(e) => onDragOver?.(e)}
                  onDrop={(e) => onDrop?.(e, item.id)}
                  onDragEnd={() => onDragEnd?.()}
                  className="relative cursor-move overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageSrc} alt={item.alt || "Photo preview"} className="h-36 w-full object-contain bg-slate-100" loading="lazy" />

                  {item.isHero ? (
                    <div className="absolute left-2 top-2 rounded-full bg-[#0a2230] px-2 py-1 text-[11px] font-semibold text-white">
                      Hero
                    </div>
                  ) : null}

                  {item.isUploaded ? (
                    <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                      ✓
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[12px] text-slate-600">{item.label || `Photo ${index + 1}`}</div>
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                      <div className="flex items-center gap-1 sm:hidden">
                        <button
                          type="button"
                          disabled={index === 0}
                          aria-label="Move photo up"
                          onClick={() => onMove?.(item.id, "up")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-[#0a2230] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === items.length - 1}
                          aria-label="Move photo down"
                          onClick={() => onMove?.(item.id, "down")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-[#0a2230] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[14px] font-bold text-red-700 hover:bg-red-100"
                        onClick={() => onRemove?.(item.id)}
                        aria-label="Remove photo"
                        title="Remove photo"
                      >
                        X
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
