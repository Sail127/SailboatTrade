// app/listings/new/NewListingForm.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ✅ MUST NOT CHANGE — shared with other pages
 */
import { getCountryOptions } from "@/lib/countries";
import { guessDefaultPhoneCountry, normalizePhoneToE164, toPhoneIso2Lower } from "@/lib/phone";

/**
 * ✅ NEW SHARED US STATE DROPDOWN
 */
import { getUsStateOptions } from "@/lib/us-states";

/**
 * ✅ Phone UI
 */
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

/* =========================================================
   0) CONFIG + UI TOKENS
========================================================= */
const DRAFT_KEY = "st:newListingDraft:v3";
const AUTOSAVE_MS = 3 * 60 * 1000; // ✅ 3 minutes
const DRAFT_TTL_MS = 30 * 60 * 1000; // ✅ 30 minutes (sliding TTL)

// ✅ Pricing rules (UI copy only — enforcement happens in checkout/server)
const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTO_LIMIT = 25;

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

/* =========================================================
   1) SMALL UI TOKENS
========================================================= */
const labelBase = "block text-[13px] font-semibold text-[#0a2230] mb-1.5";

const fieldBase =
  "w-full h-10 rounded-xl border px-3 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const textareaBase =
  "w-full rounded-xl border px-3 py-2.5 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

const btnPrimary =
  "inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold " +
  "bg-[#0a2230] text-white hover:bg-[#0f2a3b] transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/50";

const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold " +
  "border border-slate-300 text-[#0a2230] hover:bg-slate-50 transition";

/* =========================================================
   2) HELPERS (numbers, money, country)
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
  const map = { USD: "$", EUR: "€", GBP: "£", AUD: "A$", NZD: "NZ$", JPY: "¥" };
  return map[code] || "";
}

function formatCommaNumber(raw) {
  let s = String(raw ?? "");
  s = s.replace(/,/g, "");
  s = s.replace(/[^\d.]/g, "");
  if (!s) return "";

  const hasTrailingDot = s.endsWith(".");
  const parts = s.split(".");
  const intRaw = parts[0] ?? "";
  const frac = parts.slice(1).join("");

  const intPart = intRaw === "" && frac ? "0" : intRaw.replace(/^0+(?=\d)/, "");
  const intWithCommas = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  let out = intWithCommas;
  if (frac) out += "." + frac;
  else if (hasTrailingDot) out += ".";
  return out;
}

function normalizeCountryCode(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const up = s.toUpperCase();

  if (up === "USA" || up === "US" || up === "U.S." || up === "U.S.A.") return "US";
  if (s.toLowerCase().includes("united states")) return "US";
  if (/^[A-Z]{2}$/.test(up)) return up;

  return s;
}

function formatConverted(n, decimals = 2) {
  if (!Number.isFinite(n)) return "";
  const fixed = n.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
}
function convertIfNumber(valueStr, factor, decimals = 2) {
  const n = toFloat(valueStr);
  if (n == null) return valueStr;
  return formatConverted(n * factor, decimals);
}

/**
 * Broker hero preview:
 * - if stored is URL -> use as-is
 * - if stored is data URL -> use as-is
 * - if stored is an R2 key -> build via NEXT_PUBLIC_R2_PUBLIC_BASE_URL (or /api/uploads fallback)
 */
function toHeroPreviewUrl(stored) {
  const v = String(stored || "").trim();
  if (!v) return "";
  if (v.startsWith("data:")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;

  const base = String(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}/${encodeURIComponent(v)}`;

  return `/api/uploads?key=${encodeURIComponent(v)}`;
}

/**
 * Listing photo preview from key (persists across reloads)
 */
function toPhotoPreviewUrl(storedKey) {
  const v = String(storedKey || "").trim();
  if (!v) return "";
  if (v.startsWith("data:")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;

  const base = String(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}/${encodeURIComponent(v)}`;

  return `/api/uploads?key=${encodeURIComponent(v)}`;
}

function fmtWhen(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "";
  try {
    return new Date(n).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* =========================================================
   3) OPTIONS
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
  const rest = deduped.filter((m) => !TOP5.includes(m)).sort((a, b) => a.localeCompare(b));
  return [...TOP5, ...rest];
}

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
  "Lithium Batteries",
  "Radar",
  "Self Tailing Winches",
  "Solar Panels",
  "Stern Thruster",
  "Underwater LEDs",
  "Water Heater",
  "Water Maker",
  "Wind Generator",
].sort((a, b) => a.localeCompare(b));

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AUD", "NZD", "JPY"];

/* =========================================================
   4) UI COMPONENTS
========================================================= */
function Asterisk() {
  return <span className="ml-1 font-extrabold text-[#0a2230]">*</span>;
}

function XIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={`h-9 rounded-full px-4 text-[13px] font-semibold border transition ${
        active ? "bg-[#0a2230] text-white border-[#0a2230]" : "bg-white text-[#0a2230] border-slate-300 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function UnitSystemToggle({ value, onChange }) {
  const base = "h-8 px-3 rounded-full text-[12px] font-semibold transition inline-flex items-center justify-center";
  const active = "bg-white text-[#0a2230] border border-white";
  const inactive = "bg-transparent text-white/80 border border-transparent hover:bg-white/10";

  return (
    <div className="inline-flex items-center gap-2">
      <div className="text-[11px] font-semibold text-white/80 mr-1">Units</div>
      <div className="inline-flex items-center rounded-full border border-white/25 p-1">
        <button type="button" className={`${base} ${value === "US" ? active : inactive}`} onClick={() => onChange("US")}>
          U.S.
        </button>
        <button type="button" className={`${base} ${value === "METRIC" ? active : inactive}`} onClick={() => onChange("METRIC")}>
          Metric
        </button>
      </div>
    </div>
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
              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${c === value ? "font-semibold text-[#0a2230]" : "text-slate-700"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, headerRight, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.08)] overflow-visible">
      <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight" style={{ color: GOLD }}>
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-xs sm:text-sm text-white/80">{subtitle}</p> : null}
          </div>
          {headerRight ? <div className="pt-0.5">{headerRight}</div> : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/* =========================================================
   5) MAIN
========================================================= */
export default function NewListingForm() {
  const router = useRouter();

  const builders = useMemo(orderBuilders, []);
  const countryOptions = useMemo(() => getCountryOptions("en"), []);
  const usStateOptions = useMemo(() => getUsStateOptions(), []);

  /* -------------------------
     FORM STATE (global)
  ------------------------- */
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  /* Email verification banner */
  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  /* Draft state: no “resume” UI — just autosave + auto-restore */
  const [draftLoaded, setDraftLoaded] = useState(false); // storage read complete
  const [draftSessionReady, setDraftSessionReady] = useState(false); // autosave enabled after first interaction or restore
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null);

  const restoringDraftRef = useRef(false);
  const suppressAutosaveRef = useRef(false);

  function getDraftStore() {
    if (typeof window === "undefined") return null;
    return window.sessionStorage; // session-only
  }

  /* ✅ ME autofill should run once (and again after Reset) */
  const meAutofillDoneRef = useRef(false);
  const [autofillTick, setAutofillTick] = useState(0);

  /* -------------------------
     MASTER UNIT SYSTEM
  ------------------------- */
  const [unitSystem, setUnitSystem] = useState("US"); // "US" | "METRIC"
  const lengthUnit = unitSystem === "METRIC" ? "m" : "ft";
  const tankUnit = unitSystem === "METRIC" ? "L" : "gal";
  const displacementUnit = unitSystem === "METRIC" ? "kg" : "lb";

  const changeUnitSystem = useCallback(
    (next) => {
      if (next === unitSystem) return;

      const FT_TO_M = 0.3048;
      const M_TO_FT = 1 / FT_TO_M;
      const GAL_TO_L = 3.78541;
      const L_TO_GAL = 1 / GAL_TO_L;
      const LB_TO_KG = 0.45359237;
      const KG_TO_LB = 1 / LB_TO_KG;

      if (unitSystem === "US" && next === "METRIC") {
        setLoa((v) => convertIfNumber(v, FT_TO_M, 2));
        setDraft((v) => convertIfNumber(v, FT_TO_M, 2));
        setAirDraft((v) => convertIfNumber(v, FT_TO_M, 2));
        setTankFuel((v) => convertIfNumber(v, GAL_TO_L, 1));
        setTankWater((v) => convertIfNumber(v, GAL_TO_L, 1));
        setDisplacement((v) => formatCommaNumber(convertIfNumber(v, LB_TO_KG, 1)));
      } else if (unitSystem === "METRIC" && next === "US") {
        setLoa((v) => convertIfNumber(v, M_TO_FT, 2));
        setDraft((v) => convertIfNumber(v, M_TO_FT, 2));
        setAirDraft((v) => convertIfNumber(v, M_TO_FT, 2));
        setTankFuel((v) => convertIfNumber(v, L_TO_GAL, 1));
        setTankWater((v) => convertIfNumber(v, L_TO_GAL, 1));
        setDisplacement((v) => formatCommaNumber(convertIfNumber(v, KG_TO_LB, 1)));
      }

      setUnitSystem(next);
    },
    [unitSystem]
  );

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

  const [boatCondition, setBoatCondition] = useState(""); // NEW | USED
  const [type, setType] = useState(""); // MONOHULL | CATAMARAN | TRIMARAN
  const [year, setYear] = useState("");
  const [builderSel, setBuilderSel] = useState("");
  const [builderOther, setBuilderOther] = useState("");
  const [model, setModel] = useState("");

  const [priceDisplay, setPriceDisplay] = useState("");
  const [currency, setCurrency] = useState("USD");

  /* -------------------------
     LOCATION
  ------------------------- */
  const [locationCountrySel, setLocationCountrySel] = useState("");
  const [locationCountryOther, setLocationCountryOther] = useState("");
  const [locationUsRegion, setLocationUsRegion] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");

  /* -------------------------
     SPECIFICATIONS
  ------------------------- */
  const [loa, setLoa] = useState("");
  const [draft, setDraft] = useState("");
  const [airDraft, setAirDraft] = useState("");
  const [displacement, setDisplacement] = useState("");

  const [tankFuel, setTankFuel] = useState("");
  const [tankWater, setTankWater] = useState("");

  const [cabins, setCabins] = useState("");
  const [heads, setHeads] = useState("");

  /* -------------------------
     DESCRIPTION
  ------------------------- */
  const [description, setDescription] = useState("");

  /* -------------------------
     ENGINE
  ------------------------- */
  const isMultiEngine = type === "CATAMARAN" || type === "TRIMARAN";
  const [engineFuel, setEngineFuel] = useState("");
  const [engineMake, setEngineMake] = useState("");
  const [horsepower, setHorsepower] = useState("");
  const [propeller, setPropeller] = useState("");

  const [engineHours, setEngineHours] = useState("");
  const [leftEngineHours, setLeftEngineHours] = useState("");
  const [rightEngineHours, setRightEngineHours] = useState("");

  /* -------------------------
     EQUIPMENT
  ------------------------- */
  const [equipmentSelected, setEquipmentSelected] = useState(() => new Set());
  const [additionalEquipmentInput, setAdditionalEquipmentInput] = useState("");
  const [additionalEquipment, setAdditionalEquipment] = useState([]);
  const [riggingRemarks, setRiggingRemarks] = useState("");

  const [hasGenerator, setHasGenerator] = useState("NO");
  const [generatorFuel, setGeneratorFuel] = useState("");
  const [generatorMake, setGeneratorMake] = useState("");
  const [generatorKw, setGeneratorKw] = useState("");
  const [generatorHours, setGeneratorHours] = useState("");

  const [hasDinghy, setHasDinghy] = useState("NO");
  const [dinghyNotes, setDinghyNotes] = useState("");

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
  function normalizeEquipmentName(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return "";
    if (s.toLowerCase() === "heater") return "Water Heater";
    return s;
  }
  function togglePreset(name) {
    const n = normalizeEquipmentName(name);
    if (!n) return;
    setEquipmentSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }
  function addAdditionalEquipment(raw) {
    const v = normalizeEquipmentName(raw);
    if (!v) return;
    setAdditionalEquipment((prev) => dedupeStrings([...prev, v]));
    setAdditionalEquipmentInput("");
  }
  function removeAdditionalEquipment(name) {
    const target = normalizeEquipmentName(name).toLowerCase();
    setAdditionalEquipment((prev) => prev.filter((x) => normalizeEquipmentName(x).toLowerCase() !== target));
  }

  const installedEquipment = useMemo(() => {
    const presets = Array.from(equipmentSelected).map(normalizeEquipmentName);
    const extra = (additionalEquipment || []).map(normalizeEquipmentName);
    return dedupeStrings([...presets, ...extra]).sort((a, b) => a.localeCompare(b));
  }, [equipmentSelected, additionalEquipment]);

  /* -------------------------
     ADDITIONAL INFO
  ------------------------- */
  const [additionalInfo, setAdditionalInfo] = useState("");

  /* -------------------------
     PHOTOS
  ------------------------- */
  const [photoItems, setPhotoItems] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoLimitMsg, setPhotoLimitMsg] = useState("");

  const photoItemsRef = useRef([]);
  useEffect(() => {
    photoItemsRef.current = photoItems;
  }, [photoItems]);

  function addPhotos(filesList) {
    const files = Array.from(filesList || []).filter((f) => /^image\//i.test(f.type));
    if (!files.length) return;

    setDraftSessionReady(true);
    setPhotoLimitMsg("");

    const currentCount = (photoItemsRef.current || []).length;
    const remaining = Math.max(0, MAX_PHOTO_LIMIT - currentCount);

    if (remaining <= 0) {
      setPhotoLimitMsg(`This listing is limited to ${MAX_PHOTO_LIMIT} photos. Remove a photo to add another.`);
      return;
    }

    const accepted = files.slice(0, remaining);
    const rejectedCount = files.length - accepted.length;

    const next = accepted.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      return { id, file, previewUrl, status: "local", uploadedKey: "" };
    });

    setPhotoItems((prev) => [...prev, ...next]);

    if (rejectedCount > 0) {
      setPhotoLimitMsg(
        `Only ${remaining} more ${remaining === 1 ? "photo" : "photos"} can be added. ${rejectedCount} ${
          rejectedCount === 1 ? "file was" : "files were"
        } not added (max ${MAX_PHOTO_LIMIT}).`
      );
    }
  }

  function removePhoto(id) {
    setPhotoItems((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.previewUrl) {
        try {
          if (String(item.previewUrl).startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
        } catch {}
      }
      return prev.filter((p) => p.id !== id);
    });
    setPhotoLimitMsg("");
  }

  async function uploadAllPhotosIfNeeded(itemsSnapshot = null) {
    const snapshot = itemsSnapshot ?? photoItems;

    if ((snapshot || []).length > MAX_PHOTO_LIMIT) {
      throw new Error(`This listing is limited to ${MAX_PHOTO_LIMIT} photos. Remove photos before uploading.`);
    }

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

      const next = snapshot.map((p) => {
        const k = uploadedKeyById[p.id];
        if (!k) return p;

        try {
          if (p?.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
        } catch {}

        return { ...p, status: "uploaded", uploadedKey: k, previewUrl: toPhotoPreviewUrl(k) };
      });

      setPhotoItems(next);
      return next;
    } finally {
      setUploadingPhotos(false);
    }
  }

  /* -------------------------
     LISTING CONTACT + ACCOUNT AUTOFILL
  ------------------------- */
  const [sellerRole, setSellerRole] = useState(""); // OWNER | BROKER
  const [listingContactFirstName, setListingContactFirstName] = useState("");
  const [listingContactLastName, setListingContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [brokerageName, setBrokerageName] = useState("");
  const [brokerageStreet, setBrokerageStreet] = useState("");
  const [brokerageCity, setBrokerageCity] = useState("");
  const [brokerageState, setBrokerageState] = useState("");
  const [brokerageCountrySel, setBrokerageCountrySel] = useState("");
  const [brokerageCountryOther, setBrokerageCountryOther] = useState("");

  // Broker hero: READ-ONLY here (from account)
  const [accountBrokerHero, setAccountBrokerHero] = useState("");

  const [showPhonePrivacy, setShowPhonePrivacy] = useState(false);

  const contactTouchedRef = useRef({
    sellerRole: false,
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    brokerageName: false,
    brokerageStreet: false,
    brokerageCity: false,
    brokerageState: false,
    brokerageCountry: false,
  });

  const contactPhoneRef = useRef("");
  useEffect(() => {
    contactPhoneRef.current = String(contactPhone || "");
  }, [contactPhone]);
  const phoneFocusedRef = useRef(false);
  const suppressPhoneOnChangeRef = useRef(false);

  /* =========================================================
     6) VALIDATION + UI STATES
========================================================= */
  const effectiveCountryRaw = locationCountrySel === "Other" ? locationCountryOther : locationCountrySel;
  const effectiveCountry = normalizeCountryCode(effectiveCountryRaw);
  const isUSA = effectiveCountry === "US";

  const effectiveBrokerCountryRaw = brokerageCountrySel === "Other" ? brokerageCountryOther : brokerageCountrySel;
  const effectiveBrokerCountry = normalizeCountryCode(effectiveBrokerCountryRaw);
  const isBrokerUS = effectiveBrokerCountry === "US";

  const effectiveBuilder = builderSel === "Other" ? builderOther.trim() : builderSel.trim();

  const yearInt = toInt(year);
  const loaNum = toFloat(loa);
  const draftNum = toFloat(draft);
  const airDraftNum = toFloat(airDraft);

  const tankFuelNum = toFloat(tankFuel);
  const tankWaterNum = toFloat(tankWater);

  const horsepowerInt = toInt(horsepower);
  const engineHoursInt = toInt(engineHours);
  const leftEngineHoursInt = toInt(leftEngineHours);
  const rightEngineHoursInt = toInt(rightEngineHours);

  const generatorKwNum = toFloat(generatorKw);
  const generatorHoursInt = toInt(generatorHours);

  const priceNum = parseWholeDollars(priceDisplay);
  const curSymbol = currencySymbolFor(currency);

  const [touched, setTouched] = useState({});
  const touch = (key) => setTouched((p) => ({ ...p, [key]: true }));

  const missing = {
    sellerRole: !sellerRole,

    boatCondition: !boatCondition,
    type: !type,
    year: yearInt == null,
    builder: !effectiveBuilder,
    model: !model.trim(),
    price: priceNum == null,

    country: !effectiveCountry,
    city: !locationCity.trim(),
    usRegion: isUSA && !locationUsRegion,
    state: isUSA && !locationState,

    loa: loaNum == null,
    draft: draftNum == null,

    description: !description.trim(),

    firstName: !listingContactFirstName.trim(),
    lastName: !listingContactLastName.trim(),
    contactEmail: !contactEmail.trim(),
  };

  const showErrorFor = (key) => Boolean(touched[key] && missing[key]);
  const fieldBorder = (bad) => (bad ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-slate-300 bg-white");
  const label = (key) => `${labelBase} ${showErrorFor(key) ? "text-red-700" : ""}`;
  const input = (key) => `${fieldBase} ${fieldBorder(showErrorFor(key))}`;
  const textarea = (key) => `${textareaBase} ${fieldBorder(showErrorFor(key))}`;

  /* =========================================================
     7) DRAFT SAVE / RESTORE / RESET (NO RESUME BUTTON)
========================================================= */
  const buildDraftSnapshot = useCallback(() => {
    return {
      v: 3,
      savedAt: Date.now(),

      unitSystem,

      boatCondition,
      type,
      year,
      builderSel,
      builderOther,
      model,
      priceDisplay,
      currency,

      locationCountrySel,
      locationCountryOther,
      locationUsRegion,
      locationState,
      locationCity,

      loa,
      draft,
      airDraft,
      displacement,
      tankFuel,
      tankWater,
      cabins,
      heads,

      engineFuel,
      engineMake,
      horsepower,
      propeller,
      engineHours,
      leftEngineHours,
      rightEngineHours,

      equipmentSelected: Array.from(equipmentSelected || []),
      additionalEquipmentInput,
      additionalEquipment,
      riggingRemarks,

      hasGenerator,
      generatorFuel,
      generatorMake,
      generatorKw,
      generatorHours,

      hasDinghy,
      dinghyNotes,

      description,
      additionalInfo,

      sellerRole,
      listingContactFirstName,
      listingContactLastName,
      contactEmail,
      contactPhone,

      brokerageName,
      brokerageStreet,
      brokerageCity,
      brokerageState,
      brokerageCountrySel,
      brokerageCountryOther,

      // ✅ only uploaded photo keys are persisted
      photoItemsUploaded: (photoItems || [])
        .filter((p) => p?.status === "uploaded" && p?.uploadedKey)
        .slice(0, MAX_PHOTO_LIMIT)
        .map((p) => ({ id: p.id, uploadedKey: p.uploadedKey })),

      accountBrokerHero: accountBrokerHero || "",
    };
  }, [
    unitSystem,
    boatCondition,
    type,
    year,
    builderSel,
    builderOther,
    model,
    priceDisplay,
    currency,
    locationCountrySel,
    locationCountryOther,
    locationUsRegion,
    locationState,
    locationCity,
    loa,
    draft,
    airDraft,
    displacement,
    tankFuel,
    tankWater,
    cabins,
    heads,
    engineFuel,
    engineMake,
    horsepower,
    propeller,
    engineHours,
    leftEngineHours,
    rightEngineHours,
    equipmentSelected,
    additionalEquipmentInput,
    additionalEquipment,
    riggingRemarks,
    hasGenerator,
    generatorFuel,
    generatorMake,
    generatorKw,
    generatorHours,
    hasDinghy,
    dinghyNotes,
    description,
    additionalInfo,
    sellerRole,
    listingContactFirstName,
    listingContactLastName,
    contactEmail,
    contactPhone,
    brokerageName,
    brokerageStreet,
    brokerageCity,
    brokerageState,
    brokerageCountrySel,
    brokerageCountryOther,
    photoItems,
    accountBrokerHero,
  ]);

  const clearDraftStorageOnly = useCallback(() => {
    const store = getDraftStore();
    if (!store) return;
    try {
      store.removeItem(DRAFT_KEY);
    } catch {}
  }, []);

  const saveDraftNow = useCallback(
    (force = false) => {
      const store = getDraftStore();
      if (!store) return;
      if (!draftLoaded && !force) return;
      if (!draftSessionReady && !force) return;
      if (restoringDraftRef.current) return;
      if (suppressAutosaveRef.current) return;

      try {
        const snap = buildDraftSnapshot();
        snap.expiresAt = Date.now() + DRAFT_TTL_MS; // sliding TTL
        store.setItem(DRAFT_KEY, JSON.stringify(snap));
        setLastDraftSavedAt(snap.savedAt);
      } catch {}
    },
    [buildDraftSnapshot, draftLoaded, draftSessionReady]
  );

  const resetAllFields = useCallback(() => {
    suppressAutosaveRef.current = true;

    setFormError("");
    setNeedsEmailVerify(false);
    setResendMsg("");

    setUnitSystem("US");

    setBoatCondition("");
    setType("");
    setYear("");
    setBuilderSel("");
    setBuilderOther("");
    setModel("");
    setPriceDisplay("");
    setCurrency("USD");

    setLocationCountrySel("");
    setLocationCountryOther("");
    setLocationUsRegion("");
    setLocationState("");
    setLocationCity("");

    setLoa("");
    setDraft("");
    setAirDraft("");
    setDisplacement("");
    setTankFuel("");
    setTankWater("");
    setCabins("");
    setHeads("");

    setEngineFuel("");
    setEngineMake("");
    setHorsepower("");
    setPropeller("");
    setEngineHours("");
    setLeftEngineHours("");
    setRightEngineHours("");

    setEquipmentSelected(new Set());
    setAdditionalEquipmentInput("");
    setAdditionalEquipment([]);
    setRiggingRemarks("");

    setHasGenerator("NO");
    setGeneratorFuel("");
    setGeneratorMake("");
    setGeneratorKw("");
    setGeneratorHours("");

    setHasDinghy("NO");
    setDinghyNotes("");

    setDescription("");
    setAdditionalInfo("");

    setPhotoLimitMsg("");
    setPhotoItems((prev) => {
      try {
        (prev || []).forEach((p) => p?.previewUrl && String(p.previewUrl).startsWith("blob:") && URL.revokeObjectURL(p.previewUrl));
      } catch {}
      return [];
    });

    setSellerRole("");
    setListingContactFirstName("");
    setListingContactLastName("");
    setContactEmail("");

    suppressPhoneOnChangeRef.current = true;
    setContactPhone("");
    setTimeout(() => {
      suppressPhoneOnChangeRef.current = false;
    }, 0);

    setBrokerageName("");
    setBrokerageStreet("");
    setBrokerageCity("");
    setBrokerageState("");
    setBrokerageCountrySel("");
    setBrokerageCountryOther("");

    setAccountBrokerHero("");

    setTouched({});
    setLastDraftSavedAt(null);

    contactTouchedRef.current = {
      sellerRole: false,
      firstName: false,
      lastName: false,
      email: false,
      phone: false,
      brokerageName: false,
      brokerageStreet: false,
      brokerageCity: false,
      brokerageState: false,
      brokerageCountry: false,
    };

    meAutofillDoneRef.current = false;
    setAutofillTick((n) => n + 1);

    setTimeout(() => {
      suppressAutosaveRef.current = false;
    }, 0);
  }, []);

  const resetFormAndDraft = useCallback(() => {
    clearDraftStorageOnly();
    setLastDraftSavedAt(null);
    setDraftSessionReady(false); // ✅ don’t immediately write a blank draft; wait until they edit again
    resetAllFields();
  }, [clearDraftStorageOnly, resetAllFields]);

  const applyDraftSnapshot = useCallback((d) => {
    if (!d || typeof d !== "object") return;

    restoringDraftRef.current = true;
    try {
      if (typeof d.unitSystem === "string") setUnitSystem(d.unitSystem);

      if (typeof d.boatCondition === "string") setBoatCondition(d.boatCondition);
      if (typeof d.type === "string") setType(d.type);
      if (typeof d.year === "string") setYear(d.year);
      if (typeof d.builderSel === "string") setBuilderSel(d.builderSel);
      if (typeof d.builderOther === "string") setBuilderOther(d.builderOther);
      if (typeof d.model === "string") setModel(d.model);
      if (typeof d.priceDisplay === "string") setPriceDisplay(d.priceDisplay);
      if (typeof d.currency === "string") setCurrency(d.currency);

      if (typeof d.locationCountrySel === "string") setLocationCountrySel(d.locationCountrySel);
      if (typeof d.locationCountryOther === "string") setLocationCountryOther(d.locationCountryOther);
      if (typeof d.locationUsRegion === "string") setLocationUsRegion(d.locationUsRegion);
      if (typeof d.locationState === "string") setLocationState(d.locationState);
      if (typeof d.locationCity === "string") setLocationCity(d.locationCity);

      if (typeof d.loa === "string") setLoa(d.loa);
      if (typeof d.draft === "string") setDraft(d.draft);
      if (typeof d.airDraft === "string") setAirDraft(d.airDraft);
      if (typeof d.displacement === "string") setDisplacement(d.displacement);
      if (typeof d.tankFuel === "string") setTankFuel(d.tankFuel);
      if (typeof d.tankWater === "string") setTankWater(d.tankWater);
      if (typeof d.cabins === "string") setCabins(d.cabins);
      if (typeof d.heads === "string") setHeads(d.heads);

      if (typeof d.engineFuel === "string") setEngineFuel(d.engineFuel);
      if (typeof d.engineMake === "string") setEngineMake(d.engineMake);
      if (typeof d.horsepower === "string") setHorsepower(d.horsepower);
      if (typeof d.propeller === "string") setPropeller(d.propeller);
      if (typeof d.engineHours === "string") setEngineHours(d.engineHours);
      if (typeof d.leftEngineHours === "string") setLeftEngineHours(d.leftEngineHours);
      if (typeof d.rightEngineHours === "string") setRightEngineHours(d.rightEngineHours);

      if (Array.isArray(d.equipmentSelected)) setEquipmentSelected(new Set(d.equipmentSelected.map(normalizeEquipmentName).filter(Boolean)));
      if (typeof d.additionalEquipmentInput === "string") setAdditionalEquipmentInput(d.additionalEquipmentInput);
      if (Array.isArray(d.additionalEquipment)) setAdditionalEquipment(d.additionalEquipment.map(normalizeEquipmentName).filter(Boolean));
      if (typeof d.riggingRemarks === "string") setRiggingRemarks(d.riggingRemarks);

      if (typeof d.hasGenerator === "string") setHasGenerator(d.hasGenerator);
      if (typeof d.generatorFuel === "string") setGeneratorFuel(d.generatorFuel);
      if (typeof d.generatorMake === "string") setGeneratorMake(d.generatorMake);
      if (typeof d.generatorKw === "string") setGeneratorKw(d.generatorKw);
      if (typeof d.generatorHours === "string") setGeneratorHours(d.generatorHours);

      if (typeof d.hasDinghy === "string") setHasDinghy(d.hasDinghy);
      if (typeof d.dinghyNotes === "string") setDinghyNotes(d.dinghyNotes);

      if (typeof d.description === "string") setDescription(d.description);
      if (typeof d.additionalInfo === "string") setAdditionalInfo(d.additionalInfo);

      if (typeof d.sellerRole === "string") setSellerRole(d.sellerRole);
      if (typeof d.listingContactFirstName === "string") setListingContactFirstName(d.listingContactFirstName);
      if (typeof d.listingContactLastName === "string") setListingContactLastName(d.listingContactLastName);
      if (typeof d.contactEmail === "string") setContactEmail(d.contactEmail);

      if (typeof d.contactPhone === "string") {
        suppressPhoneOnChangeRef.current = true;
        setContactPhone(d.contactPhone);
        setTimeout(() => {
          suppressPhoneOnChangeRef.current = false;
        }, 0);
      }

      if (typeof d.brokerageName === "string") setBrokerageName(d.brokerageName);
      if (typeof d.brokerageStreet === "string") setBrokerageStreet(d.brokerageStreet);
      if (typeof d.brokerageCity === "string") setBrokerageCity(d.brokerageCity);
      if (typeof d.brokerageState === "string") setBrokerageState(d.brokerageState);
      if (typeof d.brokerageCountrySel === "string") setBrokerageCountrySel(d.brokerageCountrySel);
      if (typeof d.brokerageCountryOther === "string") setBrokerageCountryOther(d.brokerageCountryOther);

      if (Array.isArray(d.photoItemsUploaded)) {
        const restored = d.photoItemsUploaded
          .slice(0, MAX_PHOTO_LIMIT)
          .map((x) => {
            const key = String(x?.uploadedKey || "").trim();
            if (!key) return null;
            return {
              id: x.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              file: null,
              previewUrl: toPhotoPreviewUrl(key),
              status: "uploaded",
              uploadedKey: key,
            };
          })
          .filter(Boolean);

        setPhotoItems(restored);
      }

      if (typeof d.accountBrokerHero === "string") setAccountBrokerHero(d.accountBrokerHero);

      if (typeof d.savedAt === "number") setLastDraftSavedAt(d.savedAt);

      setPhotoLimitMsg("");
      setFormError("");
    } finally {
      setTimeout(() => {
        restoringDraftRef.current = false;
      }, 0);
    }
  }, []);

  /* -------------------------
     Draft load (auto-restore) on mount
  ------------------------- */
  useEffect(() => {
    const store = getDraftStore();
    if (!store) {
      setDraftLoaded(true);
      return;
    }

    try {
      const raw = store.getItem(DRAFT_KEY);
      if (!raw) {
        setDraftLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw);

      const expiresAt = Number(parsed?.expiresAt || 0);
      const savedAt = Number(parsed?.savedAt || 0);

      // ✅ backward compatible expiry check
      const expired =
        (expiresAt && Date.now() > expiresAt) ||
        (!expiresAt && savedAt && Date.now() - savedAt > DRAFT_TTL_MS);

      if (expired) {
        store.removeItem(DRAFT_KEY);
        setDraftLoaded(true);
        return;
      }

      // ✅ auto-restore for crash protection (no resume UI)
      applyDraftSnapshot(parsed);
      setDraftSessionReady(true);
      if (savedAt) setLastDraftSavedAt(savedAt);
      setDraftLoaded(true);
    } catch {
      setDraftLoaded(true);
    }
  }, [applyDraftSnapshot]);

  /* -------------------------
     Mark user interaction (enables autosave)
  ------------------------- */
  const markEdited = useCallback(() => {
    if (!draftSessionReady) setDraftSessionReady(true);
    if (suppressAutosaveRef.current) suppressAutosaveRef.current = false;
  }, [draftSessionReady]);

  /* =========================================================
     8) ACCOUNT AUTOFILL (after storage read)
========================================================= */
  useEffect(() => {
    if (!draftLoaded) return;
    if (meAutofillDoneRef.current) return;

    meAutofillDoneRef.current = true;

    function pickCountrySelFromAnyString(countryStr) {
      const raw = String(countryStr || "").trim();
      if (!raw) return { sel: "", other: "" };

      const code = normalizeCountryCode(raw);
      if (code && /^[A-Z]{2}$/.test(code)) {
        const found = countryOptions.find((c) => c.value === code);
        if (found) return { sel: code, other: "" };
      }

      const byLabel = countryOptions.find((c) => String(c.label || "").toLowerCase() === raw.toLowerCase());
      if (byLabel) return { sel: byLabel.value, other: "" };

      return { sel: "Other", other: raw };
    }

    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !data) return;

        const u = data?.user && typeof data.user === "object" ? data.user : data;

        const maybeFirst = String(u?.firstName || u?.nameFirst || "").trim();
        const maybeLast = String(u?.lastName || u?.nameLast || "").trim();
        const maybeEmail = String(u?.email || "").trim();
        const maybePhone = String(u?.phoneE164 || u?.phone || u?.phoneNumber || "").trim();

        const maybeRole = String(u?.sellerRole || u?.role || "").toUpperCase().trim();
        const maybeBrokerageName = String(u?.brokerageName || u?.businessName || u?.company || "").trim();
        const maybeStreet = String(u?.brokerageStreet || u?.street || "").trim();
        const maybeCity = String(u?.brokerageCity || u?.city || "").trim();
        const maybeState = String(u?.brokerageState || u?.state || u?.region || "").trim();
        const maybeCountry = String(u?.brokerageCountry || u?.country || "").trim();

        const maybeHero = String(u?.brokerHeroImageUrl || data?.brokerHeroImageUrl || "").trim();

        if (!contactTouchedRef.current.firstName && !listingContactFirstName.trim() && maybeFirst) setListingContactFirstName(maybeFirst);
        if (!contactTouchedRef.current.lastName && !listingContactLastName.trim() && maybeLast) setListingContactLastName(maybeLast);
        if (!contactTouchedRef.current.email && !contactEmail.trim() && maybeEmail) setContactEmail(maybeEmail);

        if (!contactTouchedRef.current.phone && !String(contactPhoneRef.current || "").trim() && maybePhone) {
          const norm = normalizePhoneToE164(maybePhone);
          if (norm?.ok) {
            suppressPhoneOnChangeRef.current = true;
            setContactPhone(norm.e164);
            setTimeout(() => {
              suppressPhoneOnChangeRef.current = false;
            }, 0);
          }
        }

        if (!contactTouchedRef.current.sellerRole && !sellerRole && (maybeRole === "OWNER" || maybeRole === "BROKER")) {
          setSellerRole(maybeRole);
        }

        if (!contactTouchedRef.current.brokerageName && !brokerageName.trim() && maybeBrokerageName) setBrokerageName(maybeBrokerageName);
        if (!contactTouchedRef.current.brokerageStreet && !brokerageStreet.trim() && maybeStreet) setBrokerageStreet(maybeStreet);
        if (!contactTouchedRef.current.brokerageCity && !brokerageCity.trim() && maybeCity) setBrokerageCity(maybeCity);
        if (!contactTouchedRef.current.brokerageState && !brokerageState && maybeState) setBrokerageState(maybeState);

        if (!contactTouchedRef.current.brokerageCountry && !brokerageCountrySel && maybeCountry) {
          const picked = pickCountrySelFromAnyString(maybeCountry);
          setBrokerageCountrySel(picked.sel);
          setBrokerageCountryOther(picked.other);
        }

        if (!accountBrokerHero && maybeHero) setAccountBrokerHero(maybeHero);
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoaded, countryOptions, autofillTick]);

  /* =========================================================
     9) AUTOSAVE (every 3 minutes + on hide/unload)
========================================================= */
  useEffect(() => {
    if (!draftLoaded) return;
    if (!draftSessionReady) return;

    const interval = setInterval(() => saveDraftNow(false), AUTOSAVE_MS);

    function onVisibility() {
      if (document.visibilityState === "hidden") saveDraftNow(false);
    }
    function onBeforeUnload() {
      saveDraftNow(false);
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [draftLoaded, draftSessionReady, saveDraftNow]);

  /* =========================================================
     10) SUBMIT
========================================================= */
  function autoTitle() {
    const parts = [];
    if (yearInt) parts.push(String(yearInt));
    const b = effectiveBuilder;
    if (b) parts.push(b);
    if (model.trim()) parts.push(model.trim());
    return parts.join(" ").trim() || "Sailboat Listing";
  }

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
      boatCondition: true,
      type: true,
      year: true,
      builder: true,
      model: true,
      price: true,
      country: true,
      city: true,
      usRegion: true,
      state: true,
      loa: true,
      draft: true,
      description: true,
      firstName: true,
      lastName: true,
      contactEmail: true,
    }));

    if (Object.values(missing).some(Boolean)) {
      setFormError("Please complete the highlighted required fields.");
      return;
    }

    // Phone optional, but must be valid E.164 if provided
    let phoneE164 = null;
    const rawPhone = String(contactPhone || "").trim();
    if (rawPhone) {
      const pn = normalizePhoneToE164(rawPhone);
      if (!pn?.ok) {
        setFormError("Please enter a valid phone number (or leave it blank).");
        return;
      }
      phoneE164 = pn.e164;
    }

    // Require user to press Upload if they added photos
    const hasLocalPhotos = (photoItems || []).some((p) => p?.status === "local");
    if (photoItems.length > 0 && hasLocalPhotos) {
      setFormError("You selected photos. Please press Upload in the Photos section before submitting.");
      window.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }

    if (photoItems.length > MAX_PHOTO_LIMIT) {
      setFormError(`This listing is limited to ${MAX_PHOTO_LIMIT} photos. Remove photos to continue.`);
      return;
    }

    setSubmitting(true);
    try {
      const photosAfterUpload = await uploadAllPhotosIfNeeded(photoItems);
      const orderedKeys = (photosAfterUpload || []).map((p) => p.uploadedKey).filter(Boolean);

      const cabinsInt = toInt(cabins);
      const headsInt = toInt(heads);
      const displacementNum = toFloat(displacement);

      const payload = {
        title: autoTitle(),
        description: description.trim(),

        year: yearInt,
        builder: effectiveBuilder || null,
        model: model.trim() || null,
        boatCondition: boatCondition || null,
        type,

        price: priceNum,
        currency,

        locationCountry: effectiveCountry,
        locationCity: locationCity.trim() || null,
        locationState: isUSA ? locationState || null : null,
        locationUsRegion: isUSA ? locationUsRegion || null : null,

        loa: loaNum,
        loaUnit: lengthUnit,
        draft: draftNum,
        draftUnit: lengthUnit,
        airDraft: airDraftNum,
        airDraftUnit: lengthUnit,

        tankUnit,
        tankFuel: tankFuelNum,
        tankWater: tankWaterNum,

        cabins: cabinsInt,
        heads: headsInt,
        displacement: displacementNum,
        displacementUnit,

        engineFuel: engineFuel || null,
        engineMake: engineMake.trim() || null,
        propeller: propeller.trim() || null,
        engineHorsepower: horsepowerInt,
        engineHours: !isMultiEngine ? engineHoursInt : null,
        leftEngineHours: isMultiEngine ? leftEngineHoursInt : null,
        rightEngineHours: isMultiEngine ? rightEngineHoursInt : null,

        hasGenerator,
        generatorFuel: hasGenerator === "YES" ? generatorFuel || null : null,
        generatorMake: hasGenerator === "YES" ? generatorMake.trim() || null : null,
        generatorKw: hasGenerator === "YES" ? generatorKwNum : null,
        generatorHours: hasGenerator === "YES" ? generatorHoursInt : null,

        hasDinghy: hasDinghy || null,
        dinghyDetails: hasDinghy === "YES" ? (dinghyNotes || "").trim() || null : null,

        equipment: installedEquipment,

        heroImageUrl: orderedKeys[0] || null,
        imageUrls: orderedKeys,

        sellerRole,
        listingContactName: `${listingContactFirstName} ${listingContactLastName}`.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: phoneE164,

        brokerageName: sellerRole === "BROKER" ? brokerageName.trim() || null : null,
        brokerageAddress:
          sellerRole === "BROKER"
            ? [brokerageStreet, brokerageCity, brokerageState, effectiveBrokerCountry].map((s) => (s || "").trim()).filter(Boolean).join(", ") || null
            : null,

        brokerHeroImageUrl: sellerRole === "BROKER" ? accountBrokerHero || null : null,

        additionalInfo: additionalInfo.trim() || null,
        riggingRemarks: riggingRemarks.trim() || null,
      };

      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok && data?.code === "EMAIL_NOT_VERIFIED") {
        setNeedsEmailVerify(true);
        setFormError("Please verify your email before creating a listing.");
        window.scrollTo?.({ top: 0, behavior: "smooth" });
        return;
      }

      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      clearDraftStorageOnly();
      setLastDraftSavedAt(null);
      setDraftSessionReady(false);

      router.push(data.previewPath || data.previewUrl || "/listings");
      router.refresh();
    } catch (err) {
      setFormError(err?.message || "Failed to create listing.");
      saveDraftNow(true);
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     11) DRAFT BAR + PROMO + ALERTS
========================================================= */
  function DraftBar() {
    const hasSaved = Boolean(lastDraftSavedAt);
    const linkBtnDanger = "text-[12px] font-semibold underline underline-offset-2 text-red-600 hover:text-red-700 transition";

    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {hasSaved ? (
            <>
              Draft saved <span className="font-semibold text-slate-800">{fmtWhen(lastDraftSavedAt)}</span>
            </>
          ) : (
            <>Draft not saved yet</>
          )}
          <span className="mx-2 text-slate-300">•</span>
          <span>Autosaves every 3 minutes while you edit. Expires after 30 minutes of inactivity.</span>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className={linkBtnDanger} onClick={resetFormAndDraft}>
            Reset form
          </button>
        </div>
      </div>
    );
  }

  function FormErrorBanner() {
    if (!formError) return null;
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{formError}</div>;
  }

  function EmailVerifyBanner() {
    if (!needsEmailVerify) return null;
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-[13px] text-amber-900">
        <div className="font-semibold">Verify your email to post listings</div>
        <div className="mt-1 text-amber-900/80">
          Click the verification link you received during registration, then return here and submit again.
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
        </div>

        {resendMsg ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[12px] text-slate-700">{resendMsg}</div>
        ) : null}
      </div>
    );
  }

  // Big promo (kept as-is)
  function FreeListingPromo() {
    return (
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-[0_16px_48px_rgba(2,6,23,0.16)] bg-white">
        <div className="absolute -right-14 top-8 rotate-45 bg-[#f3b23f] text-[#0a2230] px-16 py-2 text-[12px] font-extrabold tracking-wide shadow-md">
          FREE LISTING
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="text-[12px] font-extrabold tracking-wide text-slate-500">SAILBOAT-ONLY MARKETPLACE</div>
              <div className="mt-2 text-[24px] sm:text-[34px] font-extrabold tracking-tight text-[#0a2230] leading-tight">
                Get your boat in front of buyers —{" "}
                <span className="inline-flex items-center rounded-lg bg-[#f3b23f] px-2 py-0.5 text-[#0a2230]">free to list</span>.
              </div>
              <div className="mt-2 text-[13px] sm:text-[14px] text-slate-600 max-w-2xl">
                No credit card required. Post now and upgrade later only if you want more photos or homepage exposure.
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">
                  Free: {FREE_PHOTO_LIMIT} photos
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">
                  Upgrade: up to {MAX_PHOTO_LIMIT} photos
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">
                  12MB/photo
                </span>
              </div>
            </div>

            <div className="w-full lg:w-[360px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[12px] font-extrabold tracking-wide text-slate-700">Upgrades ($5/mo each)</div>
              <div className="mt-2 space-y-1.5 text-[12px] text-slate-700">
                <div>• Photo Plus (up to {MAX_PHOTO_LIMIT})</div>
                <div>• Featured Home placement</div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500">Auto-renews monthly until canceled from your dashboard.</div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[12px] font-extrabold bg-[#f3b23f] text-[#0a2230] hover:bg-[#e6a62f]"
                  onClick={() => {
                    const el = document.getElementById("photos-section");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  List now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     12) PHONE DEFAULT COUNTRY + HERO PREVIEW
========================================================= */
  const phoneDefaultCountry = useMemo(() => {
    if (brokerageCountrySel && brokerageCountrySel !== "Other") {
      return toPhoneIso2Lower(brokerageCountrySel) || guessDefaultPhoneCountry("us");
    }
    if (locationCountrySel && locationCountrySel !== "Other") {
      return toPhoneIso2Lower(locationCountrySel) || guessDefaultPhoneCountry("us");
    }
    return guessDefaultPhoneCountry("us");
  }, [brokerageCountrySel, locationCountrySel]);

  const heroPreviewUrl = useMemo(() => toHeroPreviewUrl(accountBrokerHero), [accountBrokerHero]);

  /* =========================================================
     13) RENDER
========================================================= */
  return (
    <form onSubmit={onSubmit} onChangeCapture={markEdited} onClickCapture={markEdited} className="space-y-7 max-w-4xl mx-auto px-4 sm:px-0">
      {/* ✅ Top alerts */}
      <EmailVerifyBanner />
      <FormErrorBanner />

      {/* ✅ Promo */}
      <FreeListingPromo />

      {/* ✅ Draft bar TOP */}
      <DraftBar />

      {/* =====================================================
          1) BOAT BASICS
      ====================================================== */}
      <SectionCard title="Boat Basics">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-4">
            <label className={label("boatCondition")}>
              Condition <Asterisk />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Pill active={boatCondition === "NEW"} onClick={() => { setBoatCondition("NEW"); touch("boatCondition"); }}>
                New
              </Pill>
              <Pill active={boatCondition === "USED"} onClick={() => { setBoatCondition("USED"); touch("boatCondition"); }}>
                Used
              </Pill>
            </div>
          </div>

          <div className="sm:col-span-4">
            <label className={label("type")}>
              Hull Type <Asterisk />
            </label>
            <select className={input("type")} value={type} onChange={(e) => setType(e.target.value)} onBlur={() => touch("type")}>
              <option value="">Select…</option>
              <option value="MONOHULL">Monohull</option>
              <option value="CATAMARAN">Catamaran</option>
              <option value="TRIMARAN">Trimaran</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className={label("year")}>
              Year <Asterisk />
            </label>
            <select className={input("year")} value={year} onChange={(e) => setYear(e.target.value)} onBlur={() => touch("year")}>
              <option value="">Select…</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-4">
            <label className={label("builder")}>
              Builder <Asterisk />
            </label>
            <select className={input("builder")} value={builderSel} onChange={(e) => setBuilderSel(e.target.value)} onBlur={() => touch("builder")}>
              <option value="">Select a builder</option>
              {TOP5.map((b) => (
                <option key={`top-${b}`} value={b}>{b}</option>
              ))}
              <option disabled>──────────</option>
              {builders.filter((b) => !TOP5.includes(b)).map((b) => (
                <option key={`az-${b}`} value={b}>{b}</option>
              ))}
              <option disabled>──────────</option>
              <option value="Other">Other</option>
            </select>

            {builderSel === "Other" && (
              <div className="mt-3">
                <label className={label("builder")}>
                  Other builder <Asterisk />
                </label>
                <input className={input("builder")} value={builderOther} onChange={(e) => setBuilderOther(e.target.value)} onBlur={() => touch("builder")} />
              </div>
            )}
          </div>

          <div className="sm:col-span-4">
            <label className={label("model")}>
              Model <Asterisk />
            </label>
            <input className={input("model")} value={model} onChange={(e) => setModel(e.target.value)} onBlur={() => touch("model")} />
          </div>

          <div className="sm:col-span-4">
            <div className="flex items-center gap-2">
              <label className={label("price")}>
                Price <Asterisk />
              </label>
              <CurrencyPill value={currency} onChange={setCurrency} />
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-400">{curSymbol}</span>
              <input
                className={input("price") + " pl-8"}
                value={priceDisplay}
                onChange={(e) => setPriceDisplay(formatWholeDollars(e.target.value))}
                onBlur={() => touch("price")}
                inputMode="numeric"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* =====================================================
          2) BOAT LOCATION
      ====================================================== */}
      <SectionCard title="Boat Location" subtitle="Enter where the boat is physically located.">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-6">
            <label className={label("country")}>
              Country <Asterisk />
            </label>
            <select
              className={input("country")}
              value={locationCountrySel || ""}
              onChange={(e) => {
                const nextVal = e.target.value;
                setLocationCountrySel(nextVal);
                touch("country");

                const nextEffective = nextVal === "Other" ? normalizeCountryCode(locationCountryOther) : normalizeCountryCode(nextVal);
                if (nextEffective !== "US") {
                  setLocationUsRegion("");
                  setLocationState("");
                }
              }}
              onBlur={() => touch("country")}
            >
              {countryOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
              <option value="Other">Other</option>
            </select>

            {locationCountrySel === "Other" && (
              <div className="mt-3">
                <label className={label("country")}>
                  Country (type it) <Asterisk />
                </label>
                <input className={input("country")} value={locationCountryOther} onChange={(e) => setLocationCountryOther(e.target.value)} onBlur={() => touch("country")} />
              </div>
            )}
          </div>

          <div className="sm:col-span-6">
            <label className={label("city")}>
              City <Asterisk />
            </label>
            <input className={input("city")} value={locationCity} onChange={(e) => setLocationCity(e.target.value)} onBlur={() => touch("city")} />
          </div>

          {isUSA && (
            <>
              <div className="sm:col-span-6">
                <label className={label("usRegion")}>
                  USA Region <Asterisk />
                </label>
                <select className={input("usRegion")} value={locationUsRegion} onChange={(e) => setLocationUsRegion(e.target.value)} onBlur={() => touch("usRegion")}>
                  {US_REGION_OPTIONS.map((o) => (
                    <option key={o.value || "blank"} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className={label("state")}>
                  State <Asterisk />
                </label>
                <select className={input("state")} value={locationState} onChange={(e) => setLocationState(e.target.value)} onBlur={() => touch("state")}>
                  {usStateOptions.map((s) => (
                    <option key={s.value || "blank"} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* =====================================================
          3) SPECIFICATIONS
      ====================================================== */}
      <SectionCard
        title="Specifications"
        subtitle="Dimensions, accommodations, and capacities."
        headerRight={<UnitSystemToggle value={unitSystem} onChange={changeUnitSystem} />}
      >
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
          <div className="mb-3 break-inside-avoid">
            <label className={label("loa")}>
              LOA (Length) ({lengthUnit}) <Asterisk />
            </label>
            <input className={input("loa")} value={loa} onChange={(e) => setLoa(e.target.value)} onBlur={() => touch("loa")} inputMode="decimal" />
          </div>

          <div className="mb-3 break-inside-avoid">
            <label className={label("draft")}>
              Draft (keel depth) ({lengthUnit}) <Asterisk />
            </label>
            <input className={input("draft")} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => touch("draft")} inputMode="decimal" />
          </div>

          <div className="mb-3 break-inside-avoid">
            <label className={labelBase}>Air Draft (Min. Bridge Clearance) ({lengthUnit})</label>
            <input className={`${fieldBase} border-slate-300 bg-white`} value={airDraft} onChange={(e) => setAirDraft(e.target.value)} inputMode="decimal" />
          </div>

          <div className="mb-3 break-inside-avoid">
            <label className={labelBase}>Displacement ({displacementUnit})</label>
            <input className={`${fieldBase} border-slate-300 bg-white`} value={displacement} onChange={(e) => setDisplacement(formatCommaNumber(e.target.value))} inputMode="decimal" />
          </div>

          <div className="mb-3 break-inside-avoid">
            <label className={labelBase}>Fuel Capacity ({tankUnit})</label>
            <input className={`${fieldBase} border-slate-300 bg-white`} value={tankFuel} onChange={(e) => setTankFuel(e.target.value)} inputMode="decimal" />
          </div>

          <div className="mb-3 break-inside-avoid">
            <label className={labelBase}>Water Capacity ({tankUnit})</label>
            <input className={`${fieldBase} border-slate-300 bg-white`} value={tankWater} onChange={(e) => setTankWater(e.target.value)} inputMode="decimal" />
          </div>

          <div className="mb-3 break-inside-avoid">
            <label className={labelBase}>Number of Cabins</label>
            <input className={`${fieldBase} border-slate-300 bg-white`} value={cabins} onChange={(e) => setCabins(e.target.value)} inputMode="numeric" />
          </div>

          <div className="mb-3 break-inside-avoid">
            <label className={labelBase}>Number of Heads</label>
            <input className={`${fieldBase} border-slate-300 bg-white`} value={heads} onChange={(e) => setHeads(e.target.value)} inputMode="numeric" />
          </div>
        </div>
      </SectionCard>

      {/* =====================================================
          4) DESCRIPTION
      ====================================================== */}
      <SectionCard title="Description">
        <label className={label("description")}>
          Description <Asterisk />
        </label>
        <textarea
          className={`${textarea("description")} !min-h-[285px]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => touch("description")}
          placeholder="Tell buyers about condition, upgrades, maintenance, and what makes this boat special…"
        />
      </SectionCard>

      {/* =====================================================
          5) ENGINE
      ====================================================== */}
      <SectionCard title="Engine" subtitle="Fuel type, hours, make, horsepower, and propeller details (optional).">
        <div className="space-y-4">
          <div>
            <div className="text-[12px] font-semibold text-[#0a2230] mb-2">Fuel Type</div>
            <div className="flex items-center gap-2">
              <Pill active={engineFuel === "DIESEL"} onClick={() => setEngineFuel("DIESEL")}>Diesel</Pill>
              <Pill active={engineFuel === "GAS"} onClick={() => setEngineFuel("GAS")}>Gas</Pill>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {!isMultiEngine ? (
              <div className="md:col-span-3">
                <label className={labelBase}>Engine Hours</label>
                <input className={`${fieldBase} border-slate-300 bg-white`} value={engineHours} onChange={(e) => setEngineHours(e.target.value)} inputMode="numeric" />
              </div>
            ) : (
              <>
                <div className="md:col-span-2">
                  <label className={labelBase}>Left Hours</label>
                  <input className={`${fieldBase} border-slate-300 bg-white`} value={leftEngineHours} onChange={(e) => setLeftEngineHours(e.target.value)} inputMode="numeric" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelBase}>Right Hours</label>
                  <input className={`${fieldBase} border-slate-300 bg-white`} value={rightEngineHours} onChange={(e) => setRightEngineHours(e.target.value)} inputMode="numeric" />
                </div>
              </>
            )}

            <div className="md:col-span-3">
              <label className={labelBase}>Make</label>
              <input className={`${fieldBase} border-slate-300 bg-white`} value={engineMake} onChange={(e) => setEngineMake(e.target.value)} placeholder="Yanmar, Volvo, etc." />
            </div>

            <div className="md:col-span-2">
              <label className={labelBase}>Horsepower</label>
              <input className={`${fieldBase} border-slate-300 bg-white`} value={horsepower} onChange={(e) => setHorsepower(e.target.value)} inputMode="numeric" />
            </div>

            <div className={isMultiEngine ? "md:col-span-3" : "md:col-span-4"}>
              <label className={labelBase}>Propeller Details</label>
              <input className={`${fieldBase} border-slate-300 bg-white`} value={propeller} onChange={(e) => setPropeller(e.target.value)} placeholder="3-blade, folding, feathering…" />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* =====================================================
          6) EQUIPMENT INVENTORY
      ====================================================== */}
      <SectionCard title="Equipment Inventory" subtitle="Select installed equipment, then add additional equipment.">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[13px] font-semibold text-[#0a2230] mb-3">Installed Equipment</div>

          <div className="flex flex-wrap gap-2">
            {installedEquipment.length === 0 ? (
              <div className="text-[12px] text-slate-600">None selected yet.</div>
            ) : (
              installedEquipment.map((name) => (
                <span key={`sel-${name}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-[#0a2230]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0a2230] text-white">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-semibold">{name}</span>
                  <button
                    type="button"
                    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                    onClick={() => {
                      if (equipmentSelected.has(name)) togglePreset(name);
                      else removeAdditionalEquipment(name);
                    }}
                    aria-label={`Remove ${name}`}
                  >
                    <XIcon />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 text-[13px] font-semibold text-[#0a2230]">Choose Equipment</div>

        <div className="mt-3 columns-1 sm:columns-2 md:columns-3 gap-3">
          {EQUIPMENT_PRESETS.map((name) => {
            const active = equipmentSelected.has(name);
            return (
              <div key={`preset-${name}`} className="mb-2 break-inside-avoid">
                <button
                  type="button"
                  onClick={() => togglePreset(name)}
                  className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    active ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition ${
                      active ? "bg-[#0a2230] border-[#0a2230] text-white" : "bg-white border-slate-300 text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[13px] font-semibold text-[#0a2230]">{name}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="w-full max-w-[520px]">
            <input
              className={`${fieldBase} border-slate-300 bg-white`}
              value={additionalEquipmentInput}
              onChange={(e) => setAdditionalEquipmentInput(e.target.value)}
              placeholder="Additional equipment (press Enter)…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAdditionalEquipment(additionalEquipmentInput);
                }
              }}
            />
          </div>
          <button type="button" className={btnGhost} onClick={() => addAdditionalEquipment(additionalEquipmentInput)}>
            Add
          </button>
        </div>

        <div className="mt-6 border-t border-slate-200" />

        <div className="pt-6">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-semibold text-[#0a2230]">Generator</div>
            <Pill active={hasGenerator === "YES"} onClick={() => setHasGenerator("YES")}>Yes</Pill>
            <Pill
              active={hasGenerator === "NO"}
              onClick={() => {
                setHasGenerator("NO");
                setGeneratorFuel("");
                setGeneratorMake("");
                setGeneratorKw("");
                setGeneratorHours("");
              }}
            >
              No
            </Pill>
          </div>

          {hasGenerator === "YES" && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-4">
                <div className="text-[12px] font-semibold text-[#0a2230] mb-2">Fuel</div>
                <div className="flex items-center gap-2">
                  <Pill active={generatorFuel === "DIESEL"} onClick={() => setGeneratorFuel("DIESEL")}>Diesel</Pill>
                  <Pill active={generatorFuel === "GAS"} onClick={() => setGeneratorFuel("GAS")}>Gas</Pill>
                </div>
              </div>

              <div className="lg:col-span-4">
                <label className={labelBase}>Generator Make</label>
                <input className={`${fieldBase} border-slate-300 bg-white`} value={generatorMake} onChange={(e) => setGeneratorMake(e.target.value)} />
              </div>

              <div className="lg:col-span-2">
                <label className={labelBase}>kW</label>
                <input className={`${fieldBase} border-slate-300 bg-white`} value={generatorKw} onChange={(e) => setGeneratorKw(e.target.value)} inputMode="decimal" />
              </div>

              <div className="lg:col-span-2">
                <label className={labelBase}>Hours</label>
                <input className={`${fieldBase} border-slate-300 bg-white`} value={generatorHours} onChange={(e) => setGeneratorHours(e.target.value)} inputMode="numeric" />
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-slate-200" />

          <div className="pt-6">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-semibold text-[#0a2230]">Dinghy Included?</div>
              <Pill active={hasDinghy === "YES"} onClick={() => setHasDinghy("YES")}>Yes</Pill>
              <Pill active={hasDinghy === "NO"} onClick={() => { setHasDinghy("NO"); setDinghyNotes(""); }}>
                No
              </Pill>
            </div>

            {hasDinghy === "YES" && (
              <div className="mt-3">
                <label className={labelBase}>Dinghy details</label>
                <textarea
                  className={`${textareaBase} border-slate-300 bg-white !min-h-[120px]`}
                  value={dinghyNotes}
                  onChange={(e) => setDinghyNotes(e.target.value)}
                  placeholder="Example: 2021 10' inflatable, Honda 5hp 4-stroke, etc…"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200" />

        <div className="pt-6">
          <label className={labelBase}>Rigging / Sail Inventory Remarks</label>
          <textarea
            className={`${textareaBase} border-slate-300 bg-white !min-h-[120px]`}
            value={riggingRemarks}
            onChange={(e) => setRiggingRemarks(e.target.value)}
            placeholder="List sail inventory, rigging replacements, standing/running rigging age, notable upgrades…"
          />
        </div>
      </SectionCard>

      {/* =====================================================
          7) ADDITIONAL INFORMATION
      ====================================================== */}
      <SectionCard title="Additional Information" subtitle="Anything else buyers should know (optional).">
        <label className={labelBase}>Additional Information</label>
        <textarea
          className={`${textareaBase} border-slate-300 bg-white !min-h-[180px]`}
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="Ownership history, major refits, notable inclusions, delivery options, storage/moorage info, etc…"
        />
      </SectionCard>

      {/* =====================================================
          8) PHOTOS
      ====================================================== */}
      <div id="photos-section" />
      <SectionCard title="Photos" subtitle="Add photos, then press Upload. First photo becomes the hero image.">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[12px] text-slate-700">
            <div className="font-extrabold text-[#0a2230]">Photo limits</div>
            <div className="mt-1">
              Free listings include <span className="font-extrabold">{FREE_PHOTO_LIMIT}</span> photos. Upgraded listings allow up to{" "}
              <span className="font-extrabold">{MAX_PHOTO_LIMIT}</span> photos. (Max 12MB per photo — we resize/compress automatically after upload.)
            </div>
            <div className="mt-1 text-slate-600">
              You currently have <span className="font-extrabold">{photoItems.length}</span> selected.
            </div>
          </div>

          {photoLimitMsg ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 flex items-start justify-between gap-3">
              <div>{photoLimitMsg}</div>
              <button type="button" className="text-[12px] font-semibold underline underline-offset-2 hover:text-amber-950" onClick={() => setPhotoLimitMsg("")}>
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const atMax = photoItems.length >= MAX_PHOTO_LIMIT;
              return (
                <label className={`${btnGhost} cursor-pointer ${atMax ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={atMax}
                    className="hidden"
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  Add photos
                </label>
              );
            })()}

            <button
              type="button"
              className={`${btnPrimary} ${uploadingPhotos ? "opacity-70 cursor-not-allowed" : ""}`}
              disabled={uploadingPhotos || photoItems.length === 0}
              onClick={() => {
                setDraftSessionReady(true);
                uploadAllPhotosIfNeeded(photoItems);
              }}
            >
              {uploadingPhotos ? "Uploading…" : "Upload"}
            </button>
          </div>

          {photoItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-[13px] text-slate-600">No photos yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photoItems.map((p, idx) => (
                <div key={p.id} className="relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt="Photo preview" className="w-full h-36 object-contain bg-slate-100" loading="lazy" />

                  {idx === 0 && (
                    <div className="absolute left-2 top-2 rounded-full bg-[#0a2230] text-white text-[11px] font-semibold px-2 py-1">Hero</div>
                  )}

                  {p.status === "uploaded" && (
                    <div className="absolute right-2 top-2 rounded-full bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1">✓</div>
                  )}

                  <div className="p-2 flex items-center justify-between gap-2">
                    <div className="text-[12px] text-slate-600">{p.status === "uploaded" ? "Uploaded" : "Local"}</div>
                    <button type="button" className={btnGhost} onClick={() => removePhoto(p.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* =====================================================
          9) LISTING CONTACT
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
                  contactTouchedRef.current.sellerRole = true;
                  setSellerRole("OWNER");
                  touch("sellerRole");
                }}
              >
                Owner
              </Pill>
              <Pill
                active={sellerRole === "BROKER"}
                onClick={() => {
                  contactTouchedRef.current.sellerRole = true;
                  setSellerRole("BROKER");
                  touch("sellerRole");
                }}
              >
                Broker
              </Pill>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LEFT */}
            <div className="space-y-4">
              {sellerRole === "BROKER" && (
                <div>
                  <label className={labelBase}>Brokerage Name</label>
                  <input
                    className={`${fieldBase} border-slate-300 bg-white`}
                    value={brokerageName}
                    onChange={(e) => {
                      contactTouchedRef.current.brokerageName = true;
                      setBrokerageName(e.target.value);
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className={label("firstName")}>
                    First Name <Asterisk />
                  </label>
                  <input
                    className={input("firstName")}
                    value={listingContactFirstName}
                    onChange={(e) => {
                      contactTouchedRef.current.firstName = true;
                      setListingContactFirstName(e.target.value);
                    }}
                    onBlur={() => touch("firstName")}
                  />
                </div>

                <div>
                  <label className={label("lastName")}>
                    Last Name <Asterisk />
                  </label>
                  <input
                    className={input("lastName")}
                    value={listingContactLastName}
                    onChange={(e) => {
                      contactTouchedRef.current.lastName = true;
                      setListingContactLastName(e.target.value);
                    }}
                    onBlur={() => touch("lastName")}
                  />
                </div>
              </div>

              {sellerRole === "BROKER" && (
                <>
                  <div>
                    <label className={labelBase}>Street Address</label>
                    <input
                      className={`${fieldBase} border-slate-300 bg-white`}
                      value={brokerageStreet}
                      onChange={(e) => {
                        contactTouchedRef.current.brokerageStreet = true;
                        setBrokerageStreet(e.target.value);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className={labelBase}>City</label>
                      <input
                        className={`${fieldBase} border-slate-300 bg-white`}
                        value={brokerageCity}
                        onChange={(e) => {
                          contactTouchedRef.current.brokerageCity = true;
                          setBrokerageCity(e.target.value);
                        }}
                      />
                    </div>

                    <div>
                      <label className={labelBase}>{isBrokerUS ? "State" : "State / Region"}</label>

                      {isBrokerUS ? (
                        <select
                          className={`${fieldBase} border-slate-300 bg-white`}
                          value={brokerageState || ""}
                          onChange={(e) => {
                            contactTouchedRef.current.brokerageState = true;
                            setBrokerageState(e.target.value);
                          }}
                        >
                          {usStateOptions.map((s) => (
                            <option key={`bs-${s.value || "blank"}`} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className={`${fieldBase} border-slate-300 bg-white`}
                          value={brokerageState}
                          onChange={(e) => {
                            contactTouchedRef.current.brokerageState = true;
                            setBrokerageState(e.target.value);
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={labelBase}>Country</label>
                    <select
                      className={`${fieldBase} border-slate-300 bg-white`}
                      value={brokerageCountrySel || ""}
                      onChange={(e) => {
                        contactTouchedRef.current.brokerageCountry = true;
                        setBrokerageCountrySel(e.target.value);
                      }}
                    >
                      {countryOptions.map((c) => (
                        <option key={`bc-${c.value}`} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>

                    {brokerageCountrySel === "Other" && (
                      <div className="mt-3">
                        <label className={labelBase}>Country (type it)</label>
                        <input
                          className={`${fieldBase} border-slate-300 bg-white`}
                          value={brokerageCountryOther}
                          onChange={(e) => {
                            contactTouchedRef.current.brokerageCountry = true;
                            setBrokerageCountryOther(e.target.value);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* RIGHT */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className={labelBase}>Phone Number</label>
                  <button
                    type="button"
                    onClick={() => setShowPhonePrivacy(true)}
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                  >
                    How ST protects your number
                  </button>
                </div>

                <PhoneInput
                  defaultCountry={phoneDefaultCountry}
                  value={contactPhone || ""}
                  inputProps={{
                    onFocus: () => {
                      phoneFocusedRef.current = true;
                    },
                    onBlur: () => {
                      phoneFocusedRef.current = false;
                    },
                  }}
                  onChange={(val, meta) => {
                    if (suppressPhoneOnChangeRef.current) return;

                    const raw = String(meta?.phone || val || "").trim();
                    const norm = normalizePhoneToE164(raw);

                    if (phoneFocusedRef.current) {
                      contactTouchedRef.current.phone = true;
                      setContactPhone(norm?.ok ? norm.e164 : String(val || ""));
                      return;
                    }

                    if (String(contactPhoneRef.current || "").trim()) return;
                    if (!norm?.ok) return;
                    setContactPhone(norm.e164);
                  }}
                  className="w-full"
                  inputClassName="!w-full !h-10 !rounded-xl !border !border-slate-300 !px-3 !text-[13px] !text-[#0a2230] focus:!ring-2 focus:!ring-[#c8a44d]/40"
                  countrySelectorStyleProps={{
                    buttonClassName: "!h-10 !rounded-xl !border !border-slate-300 !bg-white hover:!bg-slate-50",
                    dropdownClassName: "!z-50",
                  }}
                />
              </div>

              <div>
                <label className={label("contactEmail")}>
                  Email <Asterisk />
                </label>
                <input
                  className={input("contactEmail")}
                  value={contactEmail}
                  onChange={(e) => {
                    contactTouchedRef.current.email = true;
                    setContactEmail(e.target.value);
                  }}
                  onBlur={() => touch("contactEmail")}
                  inputMode="email"
                />
              </div>

              {sellerRole === "BROKER" && (
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <label className={labelBase}>Broker Hero Image</label>
                    <div className="text-[11px] text-slate-500">Set this on your Account page</div>
                  </div>

                  <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="relative aspect-[3/2] bg-slate-50">
                      {heroPreviewUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={heroPreviewUrl}
                            alt="Broker hero preview"
                            className="absolute inset-0 h-full w-full object-contain bg-white"
                            loading="lazy"
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 grid place-items-center p-4 text-center">
                          <div className="max-w-[340px]">
                            <div className="text-[12px] font-semibold text-slate-700">No broker hero image on your account</div>
                            <div className="mt-1 text-[12px] text-slate-600">
                              Upload a logo/headshot on your <span className="font-semibold">Dashboard → Account</span>. Once saved there, it will
                              automatically appear here on new listings.
                            </div>
                            <div className="mt-3 flex justify-center">
                              <button type="button" className={btnPrimary} onClick={() => router.push("/dashboard/account")}>
                                Go to Account
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 text-[12px] text-slate-600 border-t border-slate-200 bg-slate-50">
                      Brokers can upload a business logo on their Dashboard → Account page before creating a listing.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Phone privacy modal */}
      {showPhonePrivacy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowPhonePrivacy(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-[#0a2230]">
              <div className="text-[14px] font-semibold text-white">How ST protects your number</div>
            </div>
            <div className="p-5 text-[13px] text-slate-700">
              ST.com values your privacy and will only display a phone number if a valid user is logged in.
              <div className="mt-4 flex justify-end">
                <button type="button" className={btnPrimary} onClick={() => setShowPhonePrivacy(false)}>
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Bottom: form error banner ALSO here */}
      <FormErrorBanner />

      {/* ✅ Draft bar BOTTOM */}
      <DraftBar />

      {/* Submit buttons */}
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
