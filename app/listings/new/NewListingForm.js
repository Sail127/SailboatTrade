// app/listings/new/NewListingForm.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================================================
   00) SHARED UI TOKENS / CLASSES
========================================================= */
const NAVY = "#0a2230";
const GOLD = "#c8a44d";

// Slightly smaller body UI type (~10% smaller), keep section titles as-is
const helpText = "text-[11px] text-slate-600 mt-1";

const labelBase = "block text-[13px] font-semibold text-[#0a2230] mb-1.5";

const fieldBase =
  "w-full h-10 rounded-xl border px-3 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const fieldSmall =
  "h-10 rounded-xl border px-3 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const textareaBase =
  "w-full min-h-[190px] rounded-xl border px-3 py-2.5 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const btnPrimary =
  "inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold " +
  "bg-[#0a2230] text-white hover:bg-[#0f2a3b] transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/50";

const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold " +
  "border border-slate-300 text-[#0a2230] hover:bg-slate-50 transition";

const btnMini =
  "inline-flex h-8 items-center justify-center rounded-full px-3 text-[12px] font-semibold " +
  "border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 transition " +
  "focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 " +
  "bg-white text-[#0a2230] hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

/* =========================================================
   01) HELPERS
========================================================= */
const toInt = (v) => {
  if (v === "" || v == null) return null;
  const n = Number.parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

const toFloat = (v) => {
  if (v === "" || v == null) return null;
  const n = Number.parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function normalizeCountry(raw) {
  const s = String(raw ?? "").trim();
  const lower = s.toLowerCase();
  if (
    lower === "usa" ||
    lower === "us" ||
    lower === "u.s." ||
    lower === "u.s.a." ||
    lower === "united states" ||
    lower === "united states of america"
  ) {
    return "United States";
  }
  return s;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function moveItem(arr, from, to) {
  const next = arr.slice();
  const item = next.splice(from, 1)[0];
  next.splice(to, 0, item);
  return next;
}

function dedupeStrings(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const v = String(s || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/* Price formatting: whole dollars + commas while typing */
function formatWholeDollars(raw) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const normalized = String(Number(digits));
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseWholeDollars(formatted) {
  const digits = String(formatted ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number(digits);
}

function currencySymbolFor(code) {
  const map = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    AUD: "A$",
    NZD: "NZ$",
    JPY: "¥",
  };
  return map[code] || "";
}

/* =========================================================
   02) OPTIONS
========================================================= */
const RAW_BUILDERS = [
  "Beneteau",
  "Jeanneau",
  "Lagoon",
  "Catalina",
  "Fountaine Pajot",
  "Dufour",
  "Bavaria",
  "Hunter",
  "Hanse",
  "X-Yachts",
  "Oyster",
  "Hallberg-Rassy",
  "Island Packet",
  "J/Boats",
  "Elan",
  "Excess",
  "Hylas",
  "Leopard",
  "Bali",
  "Nautitech",
];

const TOP5 = ["Beneteau", "Jeanneau", "Lagoon", "Catalina", "Bavaria"];

function orderBuilders() {
  const set = new Set(RAW_BUILDERS.map((m) => m.trim()));
  const deduped = Array.from(set);
  const rest = deduped
    .filter((m) => !TOP5.includes(m))
    .sort((a, b) => a.localeCompare(b));
  return [...TOP5, ...rest];
}

const COUNTRY_OPTIONS = [
  "United States",
  "Canada",
  "United Kingdom",
  "France",
  "Italy",
  "Spain",
  "Greece",
  "Croatia",
  "Netherlands",
  "Sweden",
  "Portugal",
  "Australia",
  "New Zealand",
  "Mexico",
  "Bahamas",
  "Other",
];

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

const EQUIPMENT_PRESETS = [
  "AIS",
  "Air Conditioner",
  "Autopilot",
  "Bow Thruster",
  "Chartplotter",
  "Dinghy Davits",
  "Electric Windlass",
  "Electric Winches",
  "Generator",
  "Heater",
  "Radar",
  "Self Tailing Winches",
  "Solar Panels",
  "Stern Thruster",
  "Underwater LEDs",
  "Water Maker",
  "Wind Generator",
].sort((a, b) => a.localeCompare(b));

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AUD", "NZD", "JPY"];

/* =========================================================
   03) SMALL COMPONENTS
========================================================= */
function Asterisk() {
  return <span className="ml-1 font-extrabold text-[#0a2230]">*</span>;
}

function SmallToggleInline({ value, onChange, options = ["ft", "m"] }) {
  const base =
    "text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border transition";
  const active = "text-[#0a2230] bg-slate-200 border-slate-300";
  const inactive = "text-slate-600 bg-white border-slate-300 hover:bg-slate-50";

  return (
    <span className="inline-flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={`${base} ${value === opt ? active : inactive}`}
        >
          {String(opt).toUpperCase()}
        </button>
      ))}
    </span>
  );
}

function CurrencyPill({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border border-slate-300 bg-slate-200 text-[#0a2230] hover:bg-slate-100 transition inline-flex items-center gap-1"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value}
        <span className="text-[10px] opacity-70">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-28 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
          {CURRENCY_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${
                c === value ? "font-semibold text-[#0a2230]" : "text-slate-700"
              }`}
              role="option"
              aria-selected={c === value}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.08)] overflow-hidden">
      <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
        <h2
          className="text-base sm:text-lg font-semibold tracking-tight !text-[#c8a44d]"
          style={{ color: "#c8a44d" }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs sm:text-sm text-white/80">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M6 14l6-6 6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M6 10l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={`h-9 rounded-full px-4 text-[13px] font-semibold border transition ${
        active
          ? "bg-[#0a2230] text-white border-[#0a2230]"
          : "bg-white text-[#0a2230] border-slate-300 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* =========================================================
   04) MAIN FORM
========================================================= */
export default function NewListingForm() {
  const router = useRouter();
  const builders = useMemo(orderBuilders, []);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
    // Email verification UX
  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState("");


  /* -------------------------
     BOAT BASICS
  ------------------------- */
  const nowYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const max = nowYear + 1;
    const min = 1950;
    const arr = [];
    for (let y = max; y >= min; y--) arr.push(String(y));
    return arr;
  }, [nowYear]);

  const [year, setYear] = useState("");
  const [builderSel, setBuilderSel] = useState("");
  const [builderOther, setBuilderOther] = useState("");
  const [model, setModel] = useState("");

  const [boatCondition, setBoatCondition] = useState(""); // "NEW" | "USED"

  const [cabins, setCabins] = useState("");
  const [heads, setHeads] = useState("");

  const [loa, setLoa] = useState("");
  const [loaUnit, setLoaUnit] = useState("ft");

  const [draft, setDraft] = useState("");
  const [draftUnit, setDraftUnit] = useState("ft");

  const [airDraft, setAirDraft] = useState("");
  const [airDraftUnit, setAirDraftUnit] = useState("ft");

  const [type, setType] = useState("MONOHULL");

  const [priceDisplay, setPriceDisplay] = useState("");
  const [currency, setCurrency] = useState("USD");

  /* -------------------------
     LOCATION
  ------------------------- */
  const [locationCountrySel, setLocationCountrySel] = useState("United States");
  const [locationCountryOther, setLocationCountryOther] = useState("");
  const [locationUsRegion, setLocationUsRegion] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");

  /* -------------------------
     ADDITIONAL INFORMATION
  ------------------------- */
  const isMultiEngine = type === "CATAMARAN" || type === "TRIMARAN";

  // Engines
  const [engineFuel, setEngineFuel] = useState(""); // "DIESEL" | "GAS"
  const [engineMake, setEngineMake] = useState("");
  const [engineModel, setEngineModel] = useState("");
  const [propeller, setPropeller] = useState("");
  const [horsepower, setHorsepower] = useState("");

  const [engineHours, setEngineHours] = useState("");
  const [leftEngineHours, setLeftEngineHours] = useState("");
  const [rightEngineHours, setRightEngineHours] = useState("");

  // Generator
  const [hasGenerator, setHasGenerator] = useState("NO"); // "YES" | "NO"
  const [generatorFuel, setGeneratorFuel] = useState("");
  const [generatorMake, setGeneratorMake] = useState("");
  const [generatorKw, setGeneratorKw] = useState("");
  const [generatorHours, setGeneratorHours] = useState("");

  // Tanks
  const [tankUnit, setTankUnit] = useState(loaUnit === "m" ? "L" : "gal");
  const [tankFuel, setTankFuel] = useState("");
  const [tankWater, setTankWater] = useState("");
  const [tankHolding, setTankHolding] = useState("");

  // Dinghy
  const [hasDinghy, setHasDinghy] = useState(""); // "YES" | "NO"
  const [dinghyModel, setDinghyModel] = useState("");
  const [dinghyLength, setDinghyLength] = useState("");
  const [dinghyLengthUnit, setDinghyLengthUnit] = useState("ft");
  const [dinghyMotor, setDinghyMotor] = useState(""); // "YES" | "NO"

  useEffect(() => {
    setTankUnit(loaUnit === "m" ? "L" : "gal");
  }, [loaUnit]);

  /* -------------------------
     DESCRIPTION
  ------------------------- */
  const [description, setDescription] = useState("");

  /* -------------------------
     EQUIPMENT
  ------------------------- */
  const [equipmentSelected, setEquipmentSelected] = useState(() => new Set());
  const [additionalEquipmentInput, setAdditionalEquipmentInput] = useState("");
  const [additionalEquipment, setAdditionalEquipment] = useState([]);

  /* -------------------------
     PHOTOS
  ------------------------- */
  const [photoItems, setPhotoItems] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [draggingPhotoId, setDraggingPhotoId] = useState(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState(null);

  /* -------------------------
     LISTING CONTACT
  ------------------------- */
  const [sellerRole, setSellerRole] = useState("");
  const [listingContactName, setListingContactName] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [brokerageAddress, setBrokerageAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [brokerHeroItem, setBrokerHeroItem] = useState(null);
  const [uploadingBrokerHero, setUploadingBrokerHero] = useState(false);

  /* -------------------------
     CLEANUP OBJECT URLS ON UNMOUNT
  ------------------------- */
  const photoItemsRef = useRef([]);
  const brokerHeroRef = useRef(null);

  useEffect(() => {
    photoItemsRef.current = photoItems;
  }, [photoItems]);

  useEffect(() => {
    brokerHeroRef.current = brokerHeroItem;
  }, [brokerHeroItem]);

  useEffect(() => {
    return () => {
      try {
        (photoItemsRef.current || []).forEach((p) => {
          if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
        });
      } catch {}
      try {
        if (brokerHeroRef.current?.previewUrl) {
          URL.revokeObjectURL(brokerHeroRef.current.previewUrl);
        }
      } catch {}
    };
  }, []);

  /* =========================================================
     DERIVED VALUES
  ========================================================= */
  const effectiveCountryRaw =
    locationCountrySel === "Other" ? locationCountryOther : locationCountrySel;
  const effectiveCountry = normalizeCountry(effectiveCountryRaw);
  const isUSA = effectiveCountry === "United States";

  const effectiveBuilder =
    builderSel === "Other" ? builderOther.trim() : builderSel.trim();

  const yearInt = toInt(year);
  const loaNum = toFloat(loa);
  const draftNum = toFloat(draft);
  const airDraftNum = toFloat(airDraft);

  const cabinsInt = toInt(cabins);
  const headsInt = toInt(heads);

  const horsepowerInt = toInt(horsepower);

  const engineHoursInt = toInt(engineHours);
  const leftEngineHoursInt = toInt(leftEngineHours);
  const rightEngineHoursInt = toInt(rightEngineHours);

  const generatorHoursInt = toInt(generatorHours);
  const generatorKwNum = toFloat(generatorKw);

  const tankFuelNum = toFloat(tankFuel);
  const tankWaterNum = toFloat(tankWater);
  const tankHoldingNum = toFloat(tankHolding);

  const dinghyLengthNum = toFloat(dinghyLength);

  const priceNum = parseWholeDollars(priceDisplay);
  const curSymbol = currencySymbolFor(currency);

  const tankUnitLabel = tankUnit === "gal" ? "Gallons" : "Liters";

  const [touched, setTouched] = useState({});
  const touch = (key) => setTouched((p) => ({ ...p, [key]: true }));

  const missing = {
    sellerRole: !sellerRole,

    year: yearInt == null,
    builder: !effectiveBuilder,
    model: !model.trim(),
    loa: loaNum == null,
    boatCondition: !boatCondition,

    description: !description.trim(),
    type: !type,
    price: priceNum == null,
    country: !effectiveCountry,
    usRegion: isUSA && !locationUsRegion,
    state: isUSA && !locationState.trim(),
    listingContactName: !listingContactName.trim(),
    contactEmail: !contactEmail.trim(),
  };

  const showErrorFor = (key) => Boolean(touched[key] && missing[key]);

  const fieldBorder = (bad) =>
    bad
      ? "border-red-300 bg-red-50 focus:ring-red-200"
      : "border-slate-300 bg-white";

  const label = (key) =>
    `${labelBase} ${showErrorFor(key) ? "text-red-700" : ""}`;
  const input = (key) => `${fieldBase} ${fieldBorder(showErrorFor(key))}`;
  const inputSm = (key) => `${fieldSmall} ${fieldBorder(showErrorFor(key))}`;
  const textarea = (key) => `${textareaBase} ${fieldBorder(showErrorFor(key))}`;

  /* =========================================================
     EQUIPMENT
  ========================================================= */
  function togglePreset(name) {
    setEquipmentSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function addAdditionalEquipment(raw) {
    const v = String(raw || "").trim();
    if (!v) return;
    setAdditionalEquipment((prev) => dedupeStrings([...prev, v]));
    setAdditionalEquipmentInput("");
  }

  function removeAdditionalEquipment(name) {
    setAdditionalEquipment((prev) =>
      prev.filter((x) => x.toLowerCase() !== name.toLowerCase())
    );
  }

  const installedEquipment = useMemo(() => {
    const presets = Array.from(equipmentSelected);
    return dedupeStrings([...presets, ...additionalEquipment]).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [equipmentSelected, additionalEquipment]);

  /* =========================================================
     PHOTOS
  ========================================================= */
  function reorderPhotos(fromId, toId) {
    setPhotoItems((prev) => {
      const from = prev.findIndex((p) => p.id === fromId);
      const to = prev.findIndex((p) => p.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;

      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function addPhotos(filesList) {
    const files = Array.from(filesList || []).filter((f) => /^image\//i.test(f.type));
    if (!files.length) return;

    const next = files.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      return { id, file, previewUrl, status: "local", uploadedKey: "" };
    });

    setPhotoItems((prev) => [...prev, ...next]);
  }

  function removePhoto(id) {
    setPhotoItems((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.previewUrl) {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {}
      }
      return prev.filter((p) => p.id !== id);
    });
  }

  function movePhoto(id, dir) {
    setPhotoItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const to = clamp(idx + dir, 0, prev.length - 1);
      if (to === idx) return prev;
      return moveItem(prev, idx, to);
    });
  }

  async function uploadAllPhotosIfNeeded(itemsSnapshot = null) {
    const snapshot = itemsSnapshot ?? photoItems;
    const locals = snapshot.filter((p) => p.status === "local");
    if (!locals.length) return snapshot;

    setUploadingPhotos(true);
    setFormError("");

    try {
      const uploadedKeyById = {};

      for (const item of locals) {
        const formData = new FormData();
        formData.append("file", item.file);

        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
        if (!data?.key) throw new Error("Upload did not return a key.");

        uploadedKeyById[item.id] = String(data.key);
      }

      const next = snapshot.map((p) =>
        uploadedKeyById[p.id]
          ? { ...p, status: "uploaded", uploadedKey: uploadedKeyById[p.id] }
          : p
      );

      setPhotoItems(next);
      return next;
    } catch (e) {
      setFormError(e?.message || "Photo upload failed.");
      throw e;
    } finally {
      setUploadingPhotos(false);
    }
  }

  /* =========================================================
     BROKER HERO
  ========================================================= */
  function pickBrokerHero(file) {
    if (!file || !/^image\//i.test(file.type)) return;

    if (brokerHeroItem?.previewUrl) {
      try {
        URL.revokeObjectURL(brokerHeroItem.previewUrl);
      } catch {}
    }

    setBrokerHeroItem({
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedKey: "",
      status: "local",
    });
  }

  async function uploadBrokerHeroIfNeeded(itemSnapshot = null) {
    const snapshot = itemSnapshot ?? brokerHeroItem;
    if (!snapshot || snapshot.status !== "local") return snapshot;

    setUploadingBrokerHero(true);
    setFormError("");

    try {
      const formData = new FormData();
      formData.append("file", snapshot.file);

      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
      if (!data?.key) throw new Error("Upload did not return a key.");

      const next = { ...snapshot, status: "uploaded", uploadedKey: String(data.key) };
      setBrokerHeroItem(next);
      return next;
    } catch (e) {
      setFormError(e?.message || "Business hero image upload failed.");
      throw e;
    } finally {
      setUploadingBrokerHero(false);
    }
  }

  /* =========================================================
     TITLE
  ========================================================= */
  function autoTitle() {
    const parts = [];
    if (yearInt) parts.push(String(yearInt));
    if (effectiveBuilder) parts.push(effectiveBuilder);
    if (model.trim()) parts.push(model.trim());
    const built = parts.join(" ").trim();
    return built || "Sailboat Listing";
  }

  /* =========================================================
     SUBMIT
  ========================================================= */
   async function resendVerificationEmail() {
    setResendMsg("");
    setResendBusy(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) throw new Error(data?.error || "Could not resend verification email.");
      if (data.alreadyVerified) {
        setResendMsg("You’re already verified. Try submitting again.");
        return;
      }
      setResendMsg("Verification email sent. Check your inbox (and spam).");
    } catch (e) {
      setResendMsg(e?.message || "Could not resend verification email.");
    } finally {
      setResendBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError("");

    setTouched((p) => ({
      ...p,
      sellerRole: true,

      year: true,
      builder: true,
      model: true,
      loa: true,
      boatCondition: true,

      description: true,
      type: true,
      price: true,
      country: true,
      usRegion: true,
      state: true,
      listingContactName: true,
      contactEmail: true,
    }));

    const anyMissing = Object.values(missing).some(Boolean);
    if (anyMissing) {
      setFormError("Please complete the highlighted required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const photosAfterUpload = await uploadAllPhotosIfNeeded(photoItems);
      const brokerAfterUpload = await uploadBrokerHeroIfNeeded(brokerHeroItem);

      const orderedKeys = (photosAfterUpload || [])
        .map((p) => p.uploadedKey)
        .filter(Boolean);

      const payload = {
        title: autoTitle(),
        description: description.trim(),

        // Basics
        year: yearInt,
        builder: effectiveBuilder || null,
        model: model.trim() || null,
        boatCondition: boatCondition || null,
        cabins: cabinsInt,
        heads: headsInt,

        type,

        // Price
        price: priceNum,
        currency,

        // Location
        locationCountry: effectiveCountry,
        locationCity: locationCity.trim() || null,
        locationState: isUSA ? locationState.trim() || null : null,
        locationUsRegion: isUSA ? locationUsRegion || null : null,

        // Dimensions
        loa: loaNum,
        loaUnit,
        draft: draftNum,
        draftUnit,
        airDraft: airDraftNum,
        airDraftUnit,

        // Engines
        engineFuel: engineFuel || null,
        engineMake: engineMake.trim() || null,
        engineModel: engineModel.trim() || null,
        propeller: propeller.trim() || null,
        engineHorsepower: horsepowerInt,

        engineHours: !isMultiEngine ? engineHoursInt : null,
        leftEngineHours: isMultiEngine ? leftEngineHoursInt : null,
        rightEngineHours: isMultiEngine ? rightEngineHoursInt : null,

        // Generator (send YES/NO so the API can safely coerce)
        hasGenerator,
        generatorFuel: hasGenerator === "YES" ? generatorFuel || null : null,
        generatorMake: hasGenerator === "YES" ? generatorMake.trim() || null : null,
        generatorKw: hasGenerator === "YES" ? generatorKwNum : null,
        generatorHours: hasGenerator === "YES" ? generatorHoursInt : null,

        // Tanks
        tankUnit,
        tankFuel: tankFuelNum,
        tankWater: tankWaterNum,
        tankHolding: tankHoldingNum,

        // Dinghy
        hasDinghy: hasDinghy || null,
        dinghyModel: dinghyModel.trim() || null,
        dinghyLength: dinghyLengthNum,
        dinghyLengthUnit,
        dinghyMotor: dinghyMotor || null,

        // Equipment (always array)
        equipment: installedEquipment,

        // Photos
        heroImageUrl: orderedKeys[0] || null,
        imageUrls: orderedKeys,

        // Contact
        sellerRole,
        listingContactName: listingContactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,

        // Broker fields
        brokerageName: sellerRole === "BROKER" ? brokerageName.trim() || null : null,
        brokerageAddress: sellerRole === "BROKER" ? brokerageAddress.trim() || null : null,
        brokerLogoUrl: brokerAfterUpload?.uploadedKey || null,
      };

      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

            const data = await res.json().catch(() => ({}));

      // ✅ Email verification gate
      if (!res.ok && data?.code === "EMAIL_NOT_VERIFIED") {
        setNeedsEmailVerify(true);
        setFormError("Please verify your email before creating a listing.");
        // scroll user to the message area
        try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
        return;
      }

      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      // if they were previously blocked but now succeeded
      setNeedsEmailVerify(false);
      setResendMsg("");


      router.push(data.previewPath || data.previewUrl || "/listings");
      router.refresh();
    } catch (e2) {
      setFormError(e2?.message || "Failed to create listing.");
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <form onSubmit={onSubmit} className="space-y-7 max-w-4xl mx-auto px-4 sm:px-0">
            {needsEmailVerify && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-[13px] text-amber-900">
          <div className="font-semibold">Verify your email to post listings</div>
          <div className="mt-1 text-amber-900/80">
            We sent you a verification link during registration. Click it, then come back and submit again.
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold ${
                resendBusy ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-[#0a2230] text-white hover:bg-[#0f2a3b]"
              }`}
              disabled={resendBusy}
              onClick={resendVerificationEmail}
            >
              {resendBusy ? "Sending…" : "Resend verification email"}
            </button>

            <a
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            >
              Go to dashboard
            </a>
          </div>

          {resendMsg ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[12px] text-slate-700">
              {resendMsg}
            </div>
          ) : null}
        </div>
      )}

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {formError}
        </div>
      )}

      {/* =====================================================
          1) BOAT BASICS
      ====================================================== */}
      <SectionCard title="Boat Basics">
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-12 items-end">
          {/* Condition */}
          <div className="sm:col-span-12">
            <label className={label("boatCondition")}>
              Condition <Asterisk />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Pill
                active={boatCondition === "NEW"}
                onClick={() => {
                  setBoatCondition("NEW");
                  touch("boatCondition");
                }}
              >
                New
              </Pill>
              <Pill
                active={boatCondition === "USED"}
                onClick={() => {
                  setBoatCondition("USED");
                  touch("boatCondition");
                }}
              >
                Used
              </Pill>
            </div>
            {showErrorFor("boatCondition") && (
              <div className="mt-2 text-[12px] font-semibold text-red-700">
                Please select New or Used.
              </div>
            )}
          </div>

          {/* Year (dropdown) */}
          <div className="sm:col-span-3 md:col-span-2">
            <label className={label("year")}>
              Year <Asterisk />
            </label>
            <div className="max-w-[160px]">
              <select
                className={inputSm("year")}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onBlur={() => touch("year")}
              >
                <option value="">Select…</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Builder */}
          <div className="sm:col-span-9 md:col-span-10">
            <label className={label("builder")}>
              Builder <Asterisk />
            </label>
            <div className="max-w-[520px]">
              <select
                className={`${fieldBase} ${fieldBorder(showErrorFor("builder"))}`}
                value={builderSel}
                onChange={(e) => setBuilderSel(e.target.value)}
                onBlur={() => touch("builder")}
              >
                <option value="">Select a builder</option>
                {TOP5.map((b) => (
                  <option key={`top-${b}`} value={b}>
                    {b}
                  </option>
                ))}
                <option disabled>──────────</option>
                {builders
                  .filter((b) => !TOP5.includes(b))
                  .map((b) => (
                    <option key={`az-${b}`} value={b}>
                      {b}
                    </option>
                  ))}
                <option disabled>──────────</option>
                <option value="Other">Other</option>
              </select>

              {builderSel === "Other" && (
                <div className="mt-3">
                  <label className={label("builder")}>
                    Other builder <Asterisk />
                  </label>
                  <input
                    className={`${fieldBase} ${fieldBorder(showErrorFor("builder"))}`}
                    value={builderOther}
                    onChange={(e) => setBuilderOther(e.target.value)}
                    onBlur={() => touch("builder")}
                    placeholder="Type builder name"
                  />
                </div>
              )}
            </div>

            {showErrorFor("builder") && (
              <div className="mt-2 text-[12px] font-semibold text-red-700">
                Builder is required.
              </div>
            )}
          </div>

          {/* Model */}
          <div className="sm:col-span-6">
            <label className={label("model")}>
              Model <Asterisk />
            </label>
            <div className="max-w-[520px]">
              <input
                className={input("model")}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={() => touch("model")}
                placeholder="Sun Odyssey 409"
              />
            </div>
          </div>

          {/* Hull Type */}
          <div className="sm:col-span-6">
            <label className={label("type")}>
              Hull Type <Asterisk />
            </label>
            <div className="max-w-[320px]">
              <select
                className={input("type")}
                value={type}
                onChange={(e) => setType(e.target.value)}
                onBlur={() => touch("type")}
              >
                <option value="MONOHULL">Monohull</option>
                <option value="CATAMARAN">Catamaran</option>
                <option value="TRIMARAN">Trimaran</option>
              </select>
            </div>
          </div>

          {/* LOA / Draft / Air Draft — unit buttons next to label */}
          <div className="sm:col-span-12">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4">
                <div className="flex items-center gap-2">
                  <label className={labelBase}>
                    LOA (Length Overall) <Asterisk />
                  </label>
                  <SmallToggleInline value={loaUnit} onChange={setLoaUnit} />
                </div>
                <div className="max-w-[220px]">
                  <input
                    className={`${fieldSmall} ${fieldBorder(showErrorFor("loa"))}`}
                    value={loa}
                    onChange={(e) => setLoa(e.target.value)}
                    onBlur={() => touch("loa")}
                    inputMode="decimal"
                    placeholder="Length overall"
                  />
                </div>
                {showErrorFor("loa") && (
                  <div className="mt-2 text-[12px] font-semibold text-red-700">
                    LOA is required.
                  </div>
                )}
              </div>

              <div className="sm:col-span-4">
                <div className="flex items-center gap-2">
                  <label className={labelBase}>Draft (min keel depth)</label>
                  <SmallToggleInline value={draftUnit} onChange={setDraftUnit} />
                </div>
                <div className="max-w-[220px]">
                  <input
                    className={`${fieldSmall} border-slate-300 bg-white`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    inputMode="decimal"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <div className="flex items-center gap-2">
                  <label className={labelBase}>Air Draft</label>
                  <SmallToggleInline value={airDraftUnit} onChange={setAirDraftUnit} />
                </div>
                <div className="max-w-[220px]">
                  <input
                    className={`${fieldSmall} border-slate-300 bg-white`}
                    value={airDraft}
                    onChange={(e) => setAirDraft(e.target.value)}
                    inputMode="decimal"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* # of Cabins / # of Heads */}
          <div className="sm:col-span-6">
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="max-w-[180px]">
                <label className={labelBase}># of Cabins</label>
                <input
                  className={`${fieldSmall} border-slate-300 bg-white w-full`}
                  value={cabins}
                  onChange={(e) => setCabins(e.target.value)}
                  inputMode="numeric"
                  placeholder="Optional"
                />
              </div>
              <div className="max-w-[180px]">
                <label className={labelBase}># of Heads</label>
                <input
                  className={`${fieldSmall} border-slate-300 bg-white w-full`}
                  value={heads}
                  onChange={(e) => setHeads(e.target.value)}
                  inputMode="numeric"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="sm:col-span-6">
            <div className="flex items-center gap-2">
              <label className={label("price")}>
                Price <Asterisk />
              </label>
              <CurrencyPill value={currency} onChange={setCurrency} />
            </div>

            <div className="max-w-[220px]">
              <input
                className={input("price")}
                value={priceDisplay}
                onChange={(e) => setPriceDisplay(formatWholeDollars(e.target.value))}
                onBlur={() => touch("price")}
                inputMode="numeric"
                placeholder={`${curSymbol}125,000`}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* =====================================================
          2) BOAT LOCATION
      ====================================================== */}
      <SectionCard title="Boat Location" subtitle="Enter where the boat is physically located.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-end">
          <div className="sm:col-span-6">
            <label className={label("country")}>
              Country <Asterisk />
            </label>

            <div className="max-w-[420px]">
              <select
                className={input("country")}
                value={locationCountrySel}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setLocationCountrySel(nextVal);
                  touch("country");

                  const nextEffective =
                    nextVal === "Other"
                      ? normalizeCountry(locationCountryOther)
                      : normalizeCountry(nextVal);

                  if (nextEffective !== "United States") {
                    setLocationUsRegion("");
                    setLocationState("");
                  }
                }}
                onBlur={() => touch("country")}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {locationCountrySel === "Other" && (
                <div className="mt-3">
                  <label className={label("country")}>
                    Country (type it) <Asterisk />
                  </label>
                  <input
                    className={input("country")}
                    value={locationCountryOther}
                    onChange={(e) => setLocationCountryOther(e.target.value)}
                    onBlur={() => touch("country")}
                    placeholder="Enter country name"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-6">
            <label className={labelBase}>City</label>
            <div className="max-w-[420px]">
              <input
                className={`${fieldBase} border-slate-300 bg-white`}
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {isUSA && (
            <>
              <div className="sm:col-span-6">
                <label className={label("usRegion")}>
                  USA Region <Asterisk />
                </label>
                <div className="max-w-[420px]">
                  <select
                    className={input("usRegion")}
                    value={locationUsRegion}
                    onChange={(e) => setLocationUsRegion(e.target.value)}
                    onBlur={() => touch("usRegion")}
                  >
                    {US_REGION_OPTIONS.map((o) => (
                      <option key={o.value || "blank"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className={label("state")}>
                  State <Asterisk />
                </label>
                <div className="max-w-[160px]">
                  <input
                    className={input("state")}
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value)}
                    onBlur={() => touch("state")}
                    placeholder="FL"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* =====================================================
          2.5) ADDITIONAL INFORMATION
      ====================================================== */}
      <SectionCard
        title="Additional Information"
        subtitle="Engines, generator, tanks, and dinghy details (optional)."
      >
        <div className="space-y-6">
          {/* ENGINES */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-[#0a2230] underline underline-offset-4 mb-3">
              Engines
            </div>

            {/* Fuel at top */}
            <div className="mb-4">
              <label className={labelBase}>Fuel</label>
              <div className="flex items-center gap-2">
                <Pill active={engineFuel === "DIESEL"} onClick={() => setEngineFuel("DIESEL")}>
                  Diesel
                </Pill>
                <Pill active={engineFuel === "GAS"} onClick={() => setEngineFuel("GAS")}>
                  Gas
                </Pill>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              {/* Hours: single OR left/right based on hull type */}
              {!isMultiEngine ? (
                <div className="sm:col-span-4">
                  <label className={labelBase}>Engine Hours</label>
                  <div className="max-w-[220px]">
                    <input
                      className={`${fieldSmall} border-slate-300 bg-white w-full`}
                      value={engineHours}
                      onChange={(e) => setEngineHours(e.target.value)}
                      inputMode="numeric"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="sm:col-span-4">
                    <label className={labelBase}>Left Engine Hours</label>
                    <div className="max-w-[220px]">
                      <input
                        className={`${fieldSmall} border-slate-300 bg-white w-full`}
                        value={leftEngineHours}
                        onChange={(e) => setLeftEngineHours(e.target.value)}
                        inputMode="numeric"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-4">
                    <label className={labelBase}>Right Engine Hours</label>
                    <div className="max-w-[220px]">
                      <input
                        className={`${fieldSmall} border-slate-300 bg-white w-full`}
                        value={rightEngineHours}
                        onChange={(e) => setRightEngineHours(e.target.value)}
                        inputMode="numeric"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="sm:col-span-4">
                <label className={labelBase}>Make</label>
                <div className="max-w-[320px]">
                  <input
                    className={`${fieldBase} border-slate-300 bg-white`}
                    value={engineMake}
                    onChange={(e) => setEngineMake(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className={labelBase}>Model</label>
                <div className="max-w-[320px]">
                  <input
                    className={`${fieldBase} border-slate-300 bg-white`}
                    value={engineModel}
                    onChange={(e) => setEngineModel(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Propeller + Horsepower */}
              <div className="sm:col-span-12">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-7">
                    <label className={labelBase}>Propeller</label>
                    <div className="max-w-[420px]">
                      <input
                        className={`${fieldBase} border-slate-300 bg-white`}
                        value={propeller}
                        onChange={(e) => setPropeller(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-5">
                    <label className={labelBase}>Horsepower</label>
                    <div className="max-w-[220px]">
                      <input
                        className={`${fieldSmall} border-slate-300 bg-white w-full`}
                        value={horsepower}
                        onChange={(e) => setHorsepower(e.target.value)}
                        inputMode="numeric"
                        placeholder="Optional"
                      />
                    </div>
                    <div className={helpText}>Optional</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GENERATOR */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-[#0a2230] underline underline-offset-4">
              Generator
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] font-semibold text-slate-700">Generator?</span>
              <Pill active={hasGenerator === "YES"} onClick={() => setHasGenerator("YES")}>
                Yes
              </Pill>
              <Pill active={hasGenerator === "NO"} onClick={() => setHasGenerator("NO")}>
                No
              </Pill>
            </div>

            {hasGenerator === "YES" && (
              <>
                <div className="mt-4 mb-4">
                  <label className={labelBase}>Fuel</label>
                  <div className="flex items-center gap-2">
                    <Pill
                      active={generatorFuel === "DIESEL"}
                      onClick={() => setGeneratorFuel("DIESEL")}
                    >
                      Diesel
                    </Pill>
                    <Pill active={generatorFuel === "GAS"} onClick={() => setGeneratorFuel("GAS")}>
                      Gas
                    </Pill>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-5">
                    <label className={labelBase}>Make</label>
                    <div className="max-w-[360px]">
                      <input
                        className={`${fieldBase} border-slate-300 bg-white`}
                        value={generatorMake}
                        onChange={(e) => setGeneratorMake(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className={labelBase}>kW rating</label>
                    <div className="max-w-[160px]">
                      <input
                        className={`${fieldSmall} border-slate-300 bg-white w-full`}
                        value={generatorKw}
                        onChange={(e) => setGeneratorKw(e.target.value)}
                        inputMode="decimal"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className={labelBase}>Hours</label>
                    <div className="max-w-[160px]">
                      <input
                        className={`${fieldSmall} border-slate-300 bg-white w-full`}
                        value={generatorHours}
                        onChange={(e) => setGeneratorHours(e.target.value)}
                        inputMode="numeric"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* TANKS */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-[#0a2230] underline underline-offset-4">
                Total Tank Capacities
              </div>
              <SmallToggleInline value={tankUnit} onChange={setTankUnit} options={["gal", "L"]} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4">
                <label className={labelBase}>Fuel</label>
                <div className="max-w-[220px]">
                  <input
                    className={`${fieldSmall} border-slate-300 bg-white w-full`}
                    value={tankFuel}
                    onChange={(e) => setTankFuel(e.target.value)}
                    inputMode="decimal"
                    placeholder={tankUnitLabel}
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className={labelBase}>Water</label>
                <div className="max-w-[220px]">
                  <input
                    className={`${fieldSmall} border-slate-300 bg-white w-full`}
                    value={tankWater}
                    onChange={(e) => setTankWater(e.target.value)}
                    inputMode="decimal"
                    placeholder={tankUnitLabel}
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className={labelBase}>Holding</label>
                <div className="max-w-[220px]">
                  <input
                    className={`${fieldSmall} border-slate-300 bg-white w-full`}
                    value={tankHolding}
                    onChange={(e) => setTankHolding(e.target.value)}
                    inputMode="decimal"
                    placeholder={tankUnitLabel}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DINGHY */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-[#0a2230] underline underline-offset-4 mb-3">
              Dinghy Included?
            </div>

            <div className="flex items-center gap-2">
              <Pill active={hasDinghy === "YES"} onClick={() => setHasDinghy("YES")}>
                Yes
              </Pill>
              <Pill active={hasDinghy === "NO"} onClick={() => setHasDinghy("NO")}>
                No
              </Pill>
            </div>

            {hasDinghy === "YES" && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-7">
                  <label className={labelBase}>Dinghy model</label>
                  <div className="max-w-[520px]">
                    <input
                      className={`${fieldBase} border-slate-300 bg-white`}
                      value={dinghyModel}
                      onChange={(e) => setDinghyModel(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <div className="flex items-center gap-2">
                    <label className={labelBase}>Length</label>
                    <SmallToggleInline value={dinghyLengthUnit} onChange={setDinghyLengthUnit} />
                  </div>
                  <div className="max-w-[220px]">
                    <input
                      className={`${fieldSmall} border-slate-300 bg-white w-full`}
                      value={dinghyLength}
                      onChange={(e) => setDinghyLength(e.target.value)}
                      inputMode="decimal"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="sm:col-span-12">
                  <label className={labelBase}>Dinghy motor</label>
                  <div className="flex items-center gap-2">
                    <Pill active={dinghyMotor === "YES"} onClick={() => setDinghyMotor("YES")}>
                      Yes
                    </Pill>
                    <Pill active={dinghyMotor === "NO"} onClick={() => setDinghyMotor("NO")}>
                      No
                    </Pill>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* =====================================================
          3) DESCRIPTION
      ====================================================== */}
      <SectionCard title="Description">
        <div>
          <label className={label("description")}>
            Description <Asterisk />
          </label>
          <textarea
            className={textarea("description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => touch("description")}
            placeholder="Tell buyers about condition, upgrades, maintenance, and what makes this boat special…"
          />
        </div>
      </SectionCard>

      {/* =====================================================
          4) EQUIPMENT
      ====================================================== */}
      <SectionCard title="Equipment" subtitle="Select installed equipment, then add additional equipment.">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[13px] font-semibold text-[#0a2230] mb-2">Installed equipment</div>

            {installedEquipment.length === 0 ? (
              <div className="text-[13px] text-slate-600">None added yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {installedEquipment.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] text-slate-800"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0a2230] text-white text-[12px]">
                      ✓
                    </span>
                    {name}
                    <button
                      type="button"
                      className="ml-1 text-slate-400 hover:text-slate-700"
                      title="Remove"
                      onClick={() => {
                        if (equipmentSelected.has(name)) togglePreset(name);
                        else removeAdditionalEquipment(name);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[13px] font-semibold text-[#0a2230] mb-3">Common equipment</div>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-3">
              {EQUIPMENT_PRESETS.map((name) => {
                const checked = equipmentSelected.has(name);

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => togglePreset(name)}
                    className={[
                      "text-left w-full",
                      "rounded-xl border transition",
                      "px-3 py-2.5",
                      "flex items-center gap-3",
                      checked
                        ? "border-[#0a2230]/25 bg-[#0a2230]/5"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                      "focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40",
                      "mb-3 break-inside-avoid",
                    ].join(" ")}
                    aria-pressed={checked}
                  >
                    <div
                      className={[
                        "h-5 w-5 rounded-md border flex items-center justify-center shrink-0",
                        checked ? "bg-[#0a2230] border-[#0a2230]" : "bg-white border-slate-300",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {checked ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </div>

                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-slate-900 leading-tight">
                        {name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[13px] font-semibold text-[#0a2230] mb-2">Additional equipment</div>

            <div className="flex items-center gap-2 max-w-[720px]">
              <input
                className={`${fieldBase} border-slate-300 bg-white`}
                value={additionalEquipmentInput}
                onChange={(e) => setAdditionalEquipmentInput(e.target.value)}
                placeholder="Type an item (press Enter)…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAdditionalEquipment(additionalEquipmentInput);
                  }
                }}
              />
              <button
                type="button"
                className={btnMini}
                onClick={() => addAdditionalEquipment(additionalEquipmentInput)}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* =====================================================
          5) PHOTOS
      ====================================================== */}
      <SectionCard title="Photos">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelBase}>Upload photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="block w-full text-[13px] text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-[#0a2230] hover:file:bg-slate-200"
              onChange={(e) => addPhotos(e.target.files)}
            />
          </div>

          {photoItems.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {photoItems.map((p, idx) => {
                const isDragOver =
                  dragOverPhotoId === p.id && draggingPhotoId && draggingPhotoId !== p.id;

                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => {
                      setDraggingPhotoId(p.id);
                      setDragOverPhotoId(null);
                    }}
                    onDragEnd={() => {
                      setDraggingPhotoId(null);
                      setDragOverPhotoId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingPhotoId && draggingPhotoId !== p.id) setDragOverPhotoId(p.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverPhotoId === p.id) setDragOverPhotoId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggingPhotoId || draggingPhotoId === p.id) return;
                      reorderPhotos(draggingPhotoId, p.id);
                      setDragOverPhotoId(null);
                    }}
                    className={[
                      "rounded-2xl border bg-white shadow-sm overflow-hidden cursor-grab active:cursor-grabbing",
                      isDragOver ? "border-[#c8a44d] ring-2 ring-[#c8a44d]/30" : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="relative aspect-square bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt={`Photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />

                      {idx === 0 && (
                        <div className="absolute left-2 top-2 rounded-full bg-[#0a2230] text-white text-[11px] font-semibold px-2 py-1">
                          HERO
                        </div>
                      )}
                      {p.status === "uploaded" && (
                        <div className="absolute right-2 top-2 rounded-full bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1">
                          ✓
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] font-semibold text-slate-700">#{idx + 1}</div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className={iconBtn}
                            onClick={() => movePhoto(p.id, -1)}
                            disabled={idx === 0}
                            aria-label="Move photo up"
                            title="Up"
                          >
                            <ChevronUpIcon />
                          </button>
                          <button
                            type="button"
                            className={iconBtn}
                            onClick={() => movePhoto(p.id, +1)}
                            disabled={idx === photoItems.length - 1}
                            aria-label="Move photo down"
                            title="Down"
                          >
                            <ChevronDownIcon />
                          </button>
                          <button
                            type="button"
                            className={iconBtn}
                            onClick={() => removePhoto(p.id)}
                            aria-label="Remove photo"
                            title="Remove"
                          >
                            <XIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold ${
                uploadingPhotos || photoItems.length === 0
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-[#0a2230] text-white hover:bg-[#0f2a3b]"
              }`}
              disabled={uploadingPhotos || photoItems.length === 0}
              onClick={() => uploadAllPhotosIfNeeded(photoItems)}
            >
              {uploadingPhotos ? "Uploading…" : "Upload"}
            </button>

            <div className="text-[13px] text-slate-600">
              {photoItems.length ? `${photoItems.length} photo(s)` : ""}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* =====================================================
          6) LISTING CONTACT
      ====================================================== */}
      <SectionCard title="Listing Contact">
        <div className="space-y-5">
          <div>
            <label className={label("sellerRole")}>
              Are you the vessel&apos;s owner or broker? <Asterisk />
            </label>

            <div className="flex items-center gap-2">
              <Pill
                active={sellerRole === "OWNER"}
                onClick={() => {
                  setSellerRole("OWNER");
                  touch("sellerRole");
                }}
              >
                Owner
              </Pill>

              <Pill
                active={sellerRole === "BROKER"}
                onClick={() => {
                  setSellerRole("BROKER");
                  touch("sellerRole");
                }}
              >
                Broker
              </Pill>
            </div>

            {showErrorFor("sellerRole") && (
              <div className="mt-2 text-[13px] text-red-700">Please choose Owner or Broker.</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-end">
            <div className="sm:col-span-6">
              <label className={label("listingContactName")}>
                Listing Contact Name <Asterisk />
              </label>
              <div className="max-w-[520px]">
                <input
                  className={input("listingContactName")}
                  value={listingContactName}
                  onChange={(e) => setListingContactName(e.target.value)}
                  onBlur={() => touch("listingContactName")}
                  placeholder="John Smith"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className={label("contactEmail")}>
                Email <Asterisk />
              </label>
              <div className="max-w-[520px]">
                <input
                  className={input("contactEmail")}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onBlur={() => touch("contactEmail")}
                  inputMode="email"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className={labelBase}>Phone Number</label>
              <div className="max-w-[320px]">
                <input
                  className={`${fieldBase} border-slate-300 bg-white`}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="Optional"
                />
              </div>
            </div>

            {sellerRole === "BROKER" && (
              <>
                <div className="sm:col-span-6">
                  <label className={labelBase}>Brokerage Name</label>
                  <div className="max-w-[520px]">
                    <input
                      className={`${fieldBase} border-slate-300 bg-white`}
                      value={brokerageName}
                      onChange={(e) => setBrokerageName(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="sm:col-span-12">
                  <label className={labelBase}>Brokerage Address</label>
                  <div className="max-w-[720px]">
                    <input
                      className={`${fieldBase} border-slate-300 bg-white`}
                      value={brokerageAddress}
                      onChange={(e) => setBrokerageAddress(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="sm:col-span-12">
              <label className={labelBase}>Broker / Business Hero Image (optional)</label>
              <div className="max-w-[720px]">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-[13px] text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-[#0a2230] hover:file:bg-slate-200"
                  onChange={(e) => pickBrokerHero(e.target.files?.[0])}
                />
              </div>

              {brokerHeroItem?.previewUrl && (
                <div className="mt-4 flex items-start gap-4">
                  <div className="w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brokerHeroItem.previewUrl}
                      alt="Broker hero preview"
                      className="w-full h-28 object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[#0a2230]">
                      {brokerHeroItem.status === "uploaded" ? "Uploaded" : "Ready"}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold ${
                          uploadingBrokerHero || !brokerHeroItem
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-[#0a2230] text-white hover:bg-[#0f2a3b]"
                        }`}
                        disabled={uploadingBrokerHero || !brokerHeroItem}
                        onClick={() => uploadBrokerHeroIfNeeded(brokerHeroItem)}
                      >
                        {uploadingBrokerHero ? "Uploading…" : "Upload"}
                      </button>

                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => {
                          if (brokerHeroItem?.previewUrl) {
                            try {
                              URL.revokeObjectURL(brokerHeroItem.previewUrl);
                            } catch {}
                          }
                          setBrokerHeroItem(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {formError}
        </div>
      )}

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
