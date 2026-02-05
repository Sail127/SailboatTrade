// components/ListingDetail.js
import ListingMedia from "./ListingMedia";
import ListingSidebar from "./ListingSidebar";
import SpecTable from "./SpecTable";

const INK = "#0a2230";
const GOLD = "#c8a44d";

function hullLabel(v) {
  if (!v) return "";
  const s = String(v).toUpperCase();
  if (s === "MONOHULL") return "Monohull";
  if (s === "CATAMARAN") return "Catamaran";
  if (s === "TRIMARAN") return "Trimaran";
  return v;
}

function joinNonEmpty(parts, sep = ", ") {
  return parts.map((x) => String(x || "").trim()).filter(Boolean).join(sep);
}

function uniq(arr) {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

export default function ListingDetail({ listing = {} }) {
  const {
    title,
    year,
    builder,
    model,
    type,

    heroImageUrl,
    imageUrls,
    images,

    description,
    equipment,

    locationCity,
    locationState,
    locationCountry,

    __previewToken,
  } = listing ?? {};

  const name = joinNonEmpty([year, builder, model], " ");

  // ✅ Put hero FIRST, then gallery keys
  const pics = uniq(
    [
      heroImageUrl,
      ...(Array.isArray(imageUrls) ? imageUrls : []),
      ...(Array.isArray(images) ? images.map((im) => im?.url).filter(Boolean) : []),
    ].filter(Boolean),
  );

  const equipList = Array.isArray(equipment) ? equipment.filter(Boolean) : [];

  const locationLine = joinNonEmpty(
    [
      locationCity,
      locationState,
      locationCountry && locationCountry !== "United States" ? locationCountry : null,
    ],
    ", ",
  );

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-8">
            <ListingMedia
              images={pics}
              title={title || name || "Sailboat"}
              previewToken={__previewToken || null}
            />

            {/* Title + quick facts */}
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-black/10">
                <span className="text-[12px] font-semibold" style={{ color: INK }}>
                  {hullLabel(type) || "Sailboat Listing"}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[12px] text-slate-600">
                  {locationLine || "Location not specified"}
                </span>
              </div>

              <h1
                className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight"
                style={{ color: INK }}
              >
                {name || title || "Sailboat"}
              </h1>

              {title && title !== name ? (
                <div className="mt-1 text-[13px] text-slate-600">{title}</div>
              ) : null}

              <div className="mt-4 h-px bg-slate-200" />
            </div>

            {/* Description */}
            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold" style={{ color: INK }}>
                  Description
                </h2>

                {/* Optional: remove if you don’t want this visible */}
                <span className="text-[12px] font-semibold" style={{ color: GOLD }}>
                  Premium listing view
                </span>
              </div>

              <div className="mt-2 bg-white rounded-2xl p-5 ring-1 ring-black/10">
                <div className="text-[14px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {description || "No description provided."}
                </div>
              </div>
            </section>

            {/* Boat Basics / Specs */}
            <section className="mt-6">
              <h2 className="text-[15px] font-semibold" style={{ color: INK }}>
                Boat Basics
              </h2>
              <div className="mt-2">
                <SpecTable listing={listing} />
              </div>
            </section>

            {/* Equipment */}
            <section className="mt-6">
              <h2 className="text-[15px] font-semibold" style={{ color: INK }}>
                Equipment
              </h2>
              <div className="mt-2 bg-white rounded-2xl p-5 ring-1 ring-black/10">
                {equipList.length ? (
                  <div className="flex flex-wrap gap-2">
                    {equipList.map((item, i) => (
                      <span
                        key={`${item}-${i}`}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[13px] text-slate-800"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[14px] text-slate-700">No equipment listed.</div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-4">
            <ListingSidebar listing={listing} />
          </div>
        </div>
      </div>
    </div>
  );
}
