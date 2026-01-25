// components/ListingDetail.js
import ListingMedia from "./ListingMedia.js";
import ListingSidebar from "./ListingSidebar.js";
import SpecTable from "./SpecTable.js";

const INK = "#0e2230";

export default function ListingDetail({ listing = {} }) {
  const {
    title, year, make, model, builder,
    heroImageUrl, imageUrls, images,
    description, equipment, // <- new
  } = listing ?? {};

  const brand = make || builder;
  const name = [year, [brand, model].filter(Boolean).join(" ")].filter(Boolean).join(" ");
  const pics = [
    ...(Array.isArray(imageUrls) ? imageUrls : []),
    ...(Array.isArray(images) ? images.map((im) => im?.url).filter(Boolean) : []),
    heroImageUrl,
  ]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  const equipList = Array.isArray(equipment) ? equipment.filter(Boolean) : [];

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT */}
      <div className="lg:col-span-8">
        <ListingMedia images={pics} title={title || name || "Sailboat"} />

        {/* Heading */}
        <div className="mt-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: INK }}>
            {name || title || "Sailboat"}
          </h1>
        </div>

        {/* 1) DESCRIPTION */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white/95">Description</h2>
          <div className="mt-2 bg-white rounded-2xl p-5 ring-1 ring-black/10">
            <div className="text-slate-800 whitespace-pre-wrap">
              {description || "No description provided."}
            </div>
          </div>
        </section>

        {/* 2) EQUIPMENT */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white/95">Equipment</h2>
          <div className="mt-2 bg-white rounded-2xl p-5 ring-1 ring-black/10">
            {equipList.length ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                {equipList.map((item, i) => (
                  <li key={i} className="text-slate-800">• {item}</li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-800">No equipment listed.</div>
            )}
          </div>
        </section>

        {/* 3) SPECS */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white/95">Specs</h2>
          <div className="mt-2">
            <SpecTable listing={listing} />
          </div>
        </section>
      </div>

      {/* RIGHT */}
      <div className="lg:col-span-4">
        <ListingSidebar listing={listing} />
      </div>
    </div>
  );
}
