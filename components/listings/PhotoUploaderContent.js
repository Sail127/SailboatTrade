"use client";

export default function PhotoUploaderContent({
  items = [],
  maxPhotos = 25,
  isBusy = false,
  limitMessage = "",
  onDismissLimitMessage = null,
  notice = null,
  onFilesSelected,
  addButtonDisabled = false,
  addButtonLabel = "Add photos",
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
  return (
    <div className="space-y-4">
      {limitMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 flex items-start justify-between gap-3">
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

      <div className="flex flex-wrap items-center gap-2">
        <label className={`inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50 transition cursor-pointer ${addButtonDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
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
      </div>

      <div className="text-[12px] font-semibold text-[#0a2230]">
        {items.length} of {maxPhotos} photos added
        {counterSecondaryText ? <span className="ml-2 text-[11px] font-medium text-slate-500">{counterSecondaryText}</span> : null}
      </div>

      {counterNote ? <div className="text-[12px] text-slate-600">{counterNote}</div> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-[13px] text-slate-600">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable={!isBusy}
              onDragStart={(e) => onDragStart?.(e, item.id)}
              onDragOver={(e) => onDragOver?.(e)}
              onDrop={(e) => onDrop?.(e, item.id)}
              onDragEnd={() => onDragEnd?.()}
              className="relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm cursor-move"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageSrc} alt={item.alt || "Photo preview"} className="w-full h-36 object-contain bg-slate-100" loading="lazy" />

              {item.isHero ? (
                <div className="absolute left-2 top-2 rounded-full bg-[#0a2230] text-white text-[11px] font-semibold px-2 py-1">Hero</div>
              ) : null}

              {item.isUploaded ? (
                <div className="absolute right-2 top-2 rounded-full bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1">✓</div>
              ) : null}

              <div className="p-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[12px] text-slate-600">{item.label || `Photo ${index + 1}`}</div>
                <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                  <div className="sm:hidden flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label="Move photo up"
                      onClick={() => onMove?.(item.id, "up")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-[#0a2230] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      aria-label="Move photo down"
                      onClick={() => onMove?.(item.id, "down")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-[#0a2230] disabled:opacity-40 disabled:cursor-not-allowed"
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
  );
}
