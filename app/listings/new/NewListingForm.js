// app/listings/new/NewListingForm.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * ✅ MUST match Registration + Account pages:
 * Countries come from lib/countries.js
 */
import { getCountryOptions } from "@/lib/countries";

/** ✅ New shared phone UI + normalization (same as Register + Account) */
import PhoneE164Field from "@/components/forms/PhoneE164Field";
import { normalizePhoneToE164 } from "@/lib/phone";

/* =========================================================
   SECTION 1 of 3 — UI TOKENS + HELPERS + OPTIONS + SMALL UI
========================================================= */
const DRAFT_KEY = "st:newListingDraft:v1";
const AUTOSAVE_MS = 2 * 60 * 1000; // 2 minutes
const DRAFT_DEBOUNCE_MS = 900; // save shortly after edits (in addition to the 2-min timer)

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

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
  const map = { USD: "$", EUR: "€", GBP: "£", AUD: "A$", NZD: "NZ$", JPY: "¥" };
  return map[code] || "";
}

/* Options */
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

// ✅ EXACT same region values used on account page + api/account/profile
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

/* -----------------------------
   ✅ Countries from lib/countries.js (single source of truth)
------------------------------ */
function buildCountryOptionsFromLib() {
  return getCountryOptions("en") || [{ value: "", label: "Select…" }];
}

function countryLabelFromValue(options, value) {
  const v = String(value || "").toUpperCase().trim();
  const found = (options || []).find(
    (o) => String(o?.value || "").toUpperCase().trim() === v
  );
  return found?.label || "";
}

/* Small UI */
function Asterisk() {
  return <span className="ml-1 font-extrabold text-[#0a2230]">*</span>;
}

function XIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallToggleInline({ value, onChange, options = ["ft", "m"] }) {
  const base =
    "text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border transition";
  const active = "text-[#0a2230] bg-slate-200 border-slate-300";
  const inactive =
    "text-slate-600 bg-white border-slate-300 hover:bg-slate-50";

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.08)] overflow-visible">
      <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
        <h2
          className="text-base sm:text-lg font-semibold tracking-tight !text-[#c8a44d]"
          style={{ color: GOLD }}
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
   SECTION 2 of 3 — STATE + EFFECTS + LOGIC + SUBMIT
========================================================= */
export default function NewListingForm() {
  const router = useRouter();
  const builders = useMemo(orderBuilders, []);

  // ✅ Country options from lib/countries.js (same as Registration + Account)
  const countryOptions = useMemo(() => buildCountryOptionsFromLib(), []);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ✅ reset banner message (shown top + bottom)
  const [resetMsg, setResetMsg] = useState("");

  // Draft UX
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null);

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

  const [boatCondition, setBoatCondition] = useState(""); // NEW | USED

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
     LOCATION (✅ country is ISO alpha-2 code like Registration/Account)
  ------------------------- */
  const [locationCountry, setLocationCountry] = useState(""); // "US", "CA", ...
  const [locationUsRegion, setLocationUsRegion] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");

  /* -------------------------
     ADDITIONAL INFORMATION
  ------------------------- */
  const isMultiEngine = type === "CATAMARAN" || type === "TRIMARAN";

  const [engineFuel, setEngineFuel] = useState(""); // DIESEL | GAS
  const [engineMake, setEngineMake] = useState("");
  const [engineModel, setEngineModel] = useState("");
  const [propeller, setPropeller] = useState("");
  const [horsepower, setHorsepower] = useState("");

  const [engineHours, setEngineHours] = useState("");
  const [leftEngineHours, setLeftEngineHours] = useState("");
  const [rightEngineHours, setRightEngineHours] = useState("");

  const [hasGenerator, setHasGenerator] = useState("NO"); // YES | NO
  const [generatorFuel, setGeneratorFuel] = useState("");
  const [generatorMake, setGeneratorMake] = useState("");
  const [generatorKw, setGeneratorKw] = useState("");
  const [generatorHours, setGeneratorHours] = useState("");

  const [tankUnit, setTankUnit] = useState(loaUnit === "m" ? "L" : "gal");
  const [tankFuel, setTankFuel] = useState("");
  const [tankWater, setTankWater] = useState("");
  const [tankHolding, setTankHolding] = useState("");

  const [hasDinghy, setHasDinghy] = useState("NO"); // YES | NO
  const [dinghyNotes, setDinghyNotes] = useState("");

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
      prev.filter((x) => x.toLowerCase() !== String(name).toLowerCase())
    );
  }

  const installedEquipment = useMemo(() => {
    const presets = Array.from(equipmentSelected);
    return dedupeStrings([...presets, ...additionalEquipment]).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [equipmentSelected, additionalEquipment]);

  /* -------------------------
     PHOTOS
  ------------------------- */
  const [photoItems, setPhotoItems] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [draggingPhotoId, setDraggingPhotoId] = useState(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState(null);

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

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });
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

  /* -------------------------
     LISTING CONTACT
  ------------------------- */
  const [sellerRole, setSellerRole] = useState("");

  const [listingContactFirstName, setListingContactFirstName] = useState("");
  const [listingContactLastName, setListingContactLastName] = useState("");

  const [brokerageName, setBrokerageName] = useState("");
  const [brokerageStreet, setBrokerageStreet] = useState("");
  const [brokerageCity, setBrokerageCity] = useState("");
  const [brokerageState, setBrokerageState] = useState("");
  const [brokerageCountry, setBrokerageCountry] = useState(""); // ✅ ISO alpha-2

  const [contactEmail, setContactEmail] = useState("");

  // ✅ Phone now uses shared UI + E.164 normalize on submit
  const [contactPhone, setContactPhone] = useState("");
  const [contactPhoneMsg, setContactPhoneMsg] = useState("");

  const [showPhonePrivacy, setShowPhonePrivacy] = useState(false);

  const [brokerHeroItem, setBrokerHeroItem] = useState(null);
  const [uploadingBrokerHero, setUploadingBrokerHero] = useState(false);

  // Track if user manually edited contact fields (don’t overwrite with autopopulate)
  const contactTouchedRef = useRef({
    sellerRole: false,
    firstName: false,
    lastName: false,
    contactEmail: false,
    contactPhone: false,
    brokerageName: false,
    brokerageStreet: false,
    brokerageCity: false,
    brokerageState: false,
    brokerageCountry: false,
  });

  /* -------------------------
     CLEANUP OBJECT URLS ON UNMOUNT (PHOTOS + BROKER HERO)
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
        if (brokerHeroRef.current?.previewUrl)
          URL.revokeObjectURL(brokerHeroRef.current.previewUrl);
      } catch {}
    };
  }, []);

  /* -------------------------
     BROKER HERO
  ------------------------- */
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

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
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
     AUTOFILL CONTACT FROM USER PROFILE (if available)
  ========================================================= */
  useEffect(() => {
    let alive = true;

    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !data) return;

        const maybeFirst = (data?.firstName || data?.nameFirst || "").toString().trim();
        const maybeLast = (data?.lastName || data?.nameLast || "").toString().trim();
        const maybeEmail = (data?.email || "").toString().trim();

        // ✅ phone: prefer phoneE164 if your /api/auth/me returns it
        const maybePhone = (
          data?.phoneE164 ||
          data?.phone ||
          data?.phoneNumber ||
          ""
        )
          .toString()
          .trim();

        if (!contactTouchedRef.current.firstName && !listingContactFirstName.trim() && maybeFirst) {
          setListingContactFirstName(maybeFirst);
        }
        if (!contactTouchedRef.current.lastName && !listingContactLastName.trim() && maybeLast) {
          setListingContactLastName(maybeLast);
        }
        if (!contactTouchedRef.current.contactEmail && !contactEmail.trim() && maybeEmail) {
          setContactEmail(maybeEmail);
        }
        if (!contactTouchedRef.current.contactPhone && !contactPhone.trim() && maybePhone) {
          setContactPhone(maybePhone);
          setContactPhoneMsg("");
        }

        const maybeRole = (data?.sellerRole || data?.role || "").toString().toUpperCase().trim();
        if (
          !contactTouchedRef.current.sellerRole &&
          !sellerRole &&
          (maybeRole === "OWNER" || maybeRole === "BROKER")
        ) {
          setSellerRole(maybeRole);
        }

        const maybeBrokerageName = (data?.brokerageName || data?.company || "").toString().trim();
        const maybeStreet = (data?.brokerageStreet || data?.street || "").toString().trim();
        const maybeCity = (data?.brokerageCity || data?.city || "").toString().trim();
        const maybeState = (data?.brokerageState || data?.state || data?.region || "").toString().trim();

        // ✅ IMPORTANT: brokerageCountry should now be ISO alpha-2 (like account/profile)
        const maybeCountry = (data?.brokerageCountry || "").toString().trim().toUpperCase();

        if (!contactTouchedRef.current.brokerageName && !brokerageName.trim() && maybeBrokerageName) {
          setBrokerageName(maybeBrokerageName);
        }
        if (!contactTouchedRef.current.brokerageStreet && !brokerageStreet.trim() && maybeStreet) {
          setBrokerageStreet(maybeStreet);
        }
        if (!contactTouchedRef.current.brokerageCity && !brokerageCity.trim() && maybeCity) {
          setBrokerageCity(maybeCity);
        }
        if (!contactTouchedRef.current.brokerageState && !brokerageState.trim() && maybeState) {
          setBrokerageState(maybeState);
        }
        if (!contactTouchedRef.current.brokerageCountry && !brokerageCountry && maybeCountry.length === 2) {
          setBrokerageCountry(maybeCountry);
        }
      } catch {
        // ignore
      }
    }

    loadMe();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     DRAFT STORAGE
  ========================================================= */
  const restoringDraftRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const autosaveDisabledUntilRef = useRef(0);

  const showResetMessage = useCallback((msg) => {
    setResetMsg(msg);
    try {
      window.clearTimeout(showResetMessage._t);
      showResetMessage._t = window.setTimeout(() => setResetMsg(""), 4000);
    } catch {}
  }, []);

  const buildDraftSnapshot = useCallback(() => {
    return {
      v: 1,
      savedAt: Date.now(),

      // Basics
      year,
      builderSel,
      builderOther,
      model,
      boatCondition,
      cabins,
      heads,
      loa,
      loaUnit,
      draft,
      draftUnit,
      airDraft,
      airDraftUnit,
      type,
      priceDisplay,
      currency,

      // Location (✅ ISO country code)
      locationCountry,
      locationUsRegion,
      locationState,
      locationCity,

      // Additional info
      engineFuel,
      engineMake,
      engineModel,
      propeller,
      horsepower,
      engineHours,
      leftEngineHours,
      rightEngineHours,

      hasGenerator,
      generatorFuel,
      generatorMake,
      generatorKw,
      generatorHours,

      tankUnit,
      tankFuel,
      tankWater,
      tankHolding,

      hasDinghy,
      dinghyNotes,

      // Description
      description,

      // Equipment
      equipmentSelected: Array.from(equipmentSelected || []),
      additionalEquipmentInput,
      additionalEquipment,

      // Contact
      sellerRole,
      listingContactFirstName,
      listingContactLastName,
      brokerageName,
      brokerageStreet,
      brokerageCity,
      brokerageState,
      brokerageCountry,
      contactEmail,
      contactPhone, // raw string (we normalize to E.164 on submit)

      // Photos: uploaded only
      photoItemsUploaded: (photoItems || [])
        .filter((p) => p?.status === "uploaded" && p?.uploadedKey)
        .map((p) => ({
          id: p.id,
          uploadedKey: p.uploadedKey,
          previewUrl: p.previewUrl || "",
        })),

      brokerHeroUploaded:
        brokerHeroItem?.status === "uploaded" && brokerHeroItem?.uploadedKey
          ? { uploadedKey: brokerHeroItem.uploadedKey, previewUrl: brokerHeroItem.previewUrl || "" }
          : null,
    };
  }, [
    year,
    builderSel,
    builderOther,
    model,
    boatCondition,
    cabins,
    heads,
    loa,
    loaUnit,
    draft,
    draftUnit,
    airDraft,
    airDraftUnit,
    type,
    priceDisplay,
    currency,
    locationCountry,
    locationUsRegion,
    locationState,
    locationCity,
    engineFuel,
    engineMake,
    engineModel,
    propeller,
    horsepower,
    engineHours,
    leftEngineHours,
    rightEngineHours,
    hasGenerator,
    generatorFuel,
    generatorMake,
    generatorKw,
    generatorHours,
    tankUnit,
    tankFuel,
    tankWater,
    tankHolding,
    hasDinghy,
    dinghyNotes,
    description,
    equipmentSelected,
    additionalEquipmentInput,
    additionalEquipment,
    sellerRole,
    listingContactFirstName,
    listingContactLastName,
    brokerageName,
    brokerageStreet,
    brokerageCity,
    brokerageState,
    brokerageCountry,
    contactEmail,
    contactPhone,
    photoItems,
    brokerHeroItem,
  ]);

  const saveDraftNow = useCallback(() => {
    if (typeof window === "undefined") return;
    if (restoringDraftRef.current) return;
    if (Date.now() < (autosaveDisabledUntilRef.current || 0)) return;

    try {
      const snapshot = buildDraftSnapshot();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
      setLastDraftSavedAt(snapshot.savedAt);
    } catch {
      // ignore storage errors
    }
  }, [buildDraftSnapshot]);

  const clearDraftOnly = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(DRAFT_KEY);
      setLastDraftSavedAt(null);
    } catch {}
  }, []);

  const resetFormToBlank = useCallback(() => {
    // Basics
    setYear("");
    setBuilderSel("");
    setBuilderOther("");
    setModel("");
    setBoatCondition("");
    setCabins("");
    setHeads("");
    setLoa("");
    setLoaUnit("ft");
    setDraft("");
    setDraftUnit("ft");
    setAirDraft("");
    setAirDraftUnit("ft");
    setType("MONOHULL");
    setPriceDisplay("");
    setCurrency("USD");

    // Location
    setLocationCountry("");
    setLocationUsRegion("");
    setLocationState("");
    setLocationCity("");

    // Additional
    setEngineFuel("");
    setEngineMake("");
    setEngineModel("");
    setPropeller("");
    setHorsepower("");
    setEngineHours("");
    setLeftEngineHours("");
    setRightEngineHours("");
    setHasGenerator("NO");
    setGeneratorFuel("");
    setGeneratorMake("");
    setGeneratorKw("");
    setGeneratorHours("");
    setTankUnit("gal");
    setTankFuel("");
    setTankWater("");
    setTankHolding("");
    setHasDinghy("NO");
    setDinghyNotes("");

    // Description
    setDescription("");

    // Equipment
    setEquipmentSelected(new Set());
    setAdditionalEquipmentInput("");
    setAdditionalEquipment([]);

    // Photos
    try {
      (photoItemsRef.current || []).forEach((p) => {
        if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    } catch {}
    setPhotoItems([]);
    setDraggingPhotoId(null);
    setDragOverPhotoId(null);

    // Broker hero
    try {
      if (brokerHeroRef.current?.previewUrl) URL.revokeObjectURL(brokerHeroRef.current.previewUrl);
    } catch {}
    setBrokerHeroItem(null);

    // Contact
    setSellerRole("");
    setListingContactFirstName("");
    setListingContactLastName("");
    setBrokerageName("");
    setBrokerageStreet("");
    setBrokerageCity("");
    setBrokerageState("");
    setBrokerageCountry("");
    setContactEmail("");
    setContactPhone("");
    setContactPhoneMsg("");
    setShowPhonePrivacy(false);

    // UX
    setNeedsEmailVerify(false);
    setResendBusy(false);
    setResendMsg("");
    setFormError("");
    setLastDraftSavedAt(null);
  }, []);

  const clearDraftAndReset = useCallback(() => {
    if (typeof window === "undefined") return;
    autosaveDisabledUntilRef.current = Date.now() + 4500;

    try {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    } catch {}

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}

    restoringDraftRef.current = true;
    resetFormToBlank();
    setTimeout(() => {
      restoringDraftRef.current = false;
    }, 0);

    showResetMessage("Draft cleared and form reset.");
  }, [resetFormToBlank, showResetMessage]);

  const applyDraftSnapshot = useCallback((d) => {
    if (!d || typeof d !== "object") return;

    restoringDraftRef.current = true;
    try {
      // Basics
      if (typeof d.year === "string") setYear(d.year);
      if (typeof d.builderSel === "string") setBuilderSel(d.builderSel);
      if (typeof d.builderOther === "string") setBuilderOther(d.builderOther);
      if (typeof d.model === "string") setModel(d.model);
      if (typeof d.boatCondition === "string") setBoatCondition(d.boatCondition);

      if (typeof d.cabins === "string") setCabins(d.cabins);
      if (typeof d.heads === "string") setHeads(d.heads);

      if (typeof d.loa === "string") setLoa(d.loa);
      if (typeof d.loaUnit === "string") setLoaUnit(d.loaUnit);

      if (typeof d.draft === "string") setDraft(d.draft);
      if (typeof d.draftUnit === "string") setDraftUnit(d.draftUnit);

      if (typeof d.airDraft === "string") setAirDraft(d.airDraft);
      if (typeof d.airDraftUnit === "string") setAirDraftUnit(d.airDraftUnit);

      if (typeof d.type === "string") setType(d.type);

      if (typeof d.priceDisplay === "string") setPriceDisplay(d.priceDisplay);
      if (typeof d.currency === "string") setCurrency(d.currency);

      // Location (✅ ISO)
      if (typeof d.locationCountry === "string") setLocationCountry(d.locationCountry);
      if (typeof d.locationUsRegion === "string") setLocationUsRegion(d.locationUsRegion);
      if (typeof d.locationState === "string") setLocationState(d.locationState);
      if (typeof d.locationCity === "string") setLocationCity(d.locationCity);

      // Additional
      if (typeof d.engineFuel === "string") setEngineFuel(d.engineFuel);
      if (typeof d.engineMake === "string") setEngineMake(d.engineMake);
      if (typeof d.engineModel === "string") setEngineModel(d.engineModel);
      if (typeof d.propeller === "string") setPropeller(d.propeller);
      if (typeof d.horsepower === "string") setHorsepower(d.horsepower);

      if (typeof d.engineHours === "string") setEngineHours(d.engineHours);
      if (typeof d.leftEngineHours === "string") setLeftEngineHours(d.leftEngineHours);
      if (typeof d.rightEngineHours === "string") setRightEngineHours(d.rightEngineHours);

      if (typeof d.hasGenerator === "string") setHasGenerator(d.hasGenerator);
      if (typeof d.generatorFuel === "string") setGeneratorFuel(d.generatorFuel);
      if (typeof d.generatorMake === "string") setGeneratorMake(d.generatorMake);
      if (typeof d.generatorKw === "string") setGeneratorKw(d.generatorKw);
      if (typeof d.generatorHours === "string") setGeneratorHours(d.generatorHours);

      if (typeof d.tankUnit === "string") setTankUnit(d.tankUnit);
      if (typeof d.tankFuel === "string") setTankFuel(d.tankFuel);
      if (typeof d.tankWater === "string") setTankWater(d.tankWater);
      if (typeof d.tankHolding === "string") setTankHolding(d.tankHolding);

      if (typeof d.hasDinghy === "string") setHasDinghy(d.hasDinghy);
      if (typeof d.dinghyNotes === "string") setDinghyNotes(d.dinghyNotes);

      // Description
      if (typeof d.description === "string") setDescription(d.description);

      // Equipment
      if (Array.isArray(d.equipmentSelected)) setEquipmentSelected(new Set(d.equipmentSelected));
      if (typeof d.additionalEquipmentInput === "string") setAdditionalEquipmentInput(d.additionalEquipmentInput);
      if (Array.isArray(d.additionalEquipment)) setAdditionalEquipment(d.additionalEquipment);

      // Contact
      if (typeof d.sellerRole === "string") setSellerRole(d.sellerRole);
      if (typeof d.listingContactFirstName === "string") setListingContactFirstName(d.listingContactFirstName);
      if (typeof d.listingContactLastName === "string") setListingContactLastName(d.listingContactLastName);

      if (typeof d.brokerageName === "string") setBrokerageName(d.brokerageName);
      if (typeof d.brokerageStreet === "string") setBrokerageStreet(d.brokerageStreet);
      if (typeof d.brokerageCity === "string") setBrokerageCity(d.brokerageCity);
      if (typeof d.brokerageState === "string") setBrokerageState(d.brokerageState);
      if (typeof d.brokerageCountry === "string") setBrokerageCountry(d.brokerageCountry);

      if (typeof d.contactEmail === "string") setContactEmail(d.contactEmail);
      if (typeof d.contactPhone === "string") setContactPhone(d.contactPhone);

      // Photos (uploaded only)
      if (Array.isArray(d.photoItemsUploaded) && d.photoItemsUploaded.length) {
        setPhotoItems((prev) => {
          const keepLocal = (prev || []).filter((p) => p?.status === "local");
          const restored = d.photoItemsUploaded.map((x) => ({
            id: x.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            file: null,
            previewUrl: x.previewUrl || "",
            status: "uploaded",
            uploadedKey: x.uploadedKey,
          }));
          return [...restored, ...keepLocal];
        });
      }

      if (d.brokerHeroUploaded?.uploadedKey) {
        setBrokerHeroItem({
          file: null,
          previewUrl: d.brokerHeroUploaded.previewUrl || "",
          uploadedKey: d.brokerHeroUploaded.uploadedKey,
          status: "uploaded",
        });
      }

      if (typeof d.savedAt === "number") setLastDraftSavedAt(d.savedAt);
    } finally {
      setTimeout(() => {
        restoringDraftRef.current = false;
      }, 0);
    }
  }, []);

  // Restore draft ONCE
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        applyDraftSnapshot(parsed);
      }
    } catch {
      // ignore
    } finally {
      setDraftLoaded(true);
    }
  }, [applyDraftSnapshot]);

  // Debounced autosave on edits
  useEffect(() => {
    if (!draftLoaded) return;
    if (restoringDraftRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveDraftNow();
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [
    draftLoaded,
    saveDraftNow,
    year,
    builderSel,
    builderOther,
    model,
    boatCondition,
    cabins,
    heads,
    loa,
    loaUnit,
    draft,
    draftUnit,
    airDraft,
    airDraftUnit,
    type,
    priceDisplay,
    currency,
    locationCountry,
    locationUsRegion,
    locationState,
    locationCity,
    engineFuel,
    engineMake,
    engineModel,
    propeller,
    horsepower,
    engineHours,
    leftEngineHours,
    rightEngineHours,
    hasGenerator,
    generatorFuel,
    generatorMake,
    generatorKw,
    generatorHours,
    tankUnit,
    tankFuel,
    tankWater,
    tankHolding,
    hasDinghy,
    dinghyNotes,
    description,
    equipmentSelected,
    additionalEquipmentInput,
    additionalEquipment,
    sellerRole,
    listingContactFirstName,
    listingContactLastName,
    brokerageName,
    brokerageStreet,
    brokerageCity,
    brokerageState,
    brokerageCountry,
    contactEmail,
    contactPhone,
    photoItems,
    brokerHeroItem,
  ]);

  // Interval + visibility/unload saves
  useEffect(() => {
    if (!draftLoaded) return;

    const interval = setInterval(() => {
      saveDraftNow();
    }, AUTOSAVE_MS);

    function onVisibility() {
      if (document.visibilityState === "hidden") saveDraftNow();
    }
    function onBeforeUnload() {
      saveDraftNow();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [draftLoaded, saveDraftNow]);

  /* -------------------------
     DERIVED VALUES + VALIDATION
  ------------------------- */
  const isUSA = String(locationCountry || "").toUpperCase() === "US";

  const effectiveBuilder = builderSel === "Other" ? builderOther.trim() : builderSel.trim();

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
    country: !String(locationCountry || "").trim(),
    city: !locationCity.trim(),
    usRegion: isUSA && !locationUsRegion,
    state: isUSA && !locationState.trim(),

    firstName: !listingContactFirstName.trim(),
    lastName: !listingContactLastName.trim(),
    contactEmail: !contactEmail.trim(),
  };

  const showErrorFor = (key) => Boolean(touched[key] && missing[key]);

  const fieldBorder = (bad) =>
    bad ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-slate-300 bg-white";
  const label = (key) => `${labelBase} ${showErrorFor(key) ? "text-red-700" : ""}`;
  const input = (key) => `${fieldBase} ${fieldBorder(showErrorFor(key))}`;
  const inputSm = (key) => `${fieldSmall} ${fieldBorder(showErrorFor(key))}`;
  const textarea = (key) => `${textareaBase} ${fieldBorder(showErrorFor(key))}`;

  /* -------------------------
     TITLE
  ------------------------- */
  function autoTitle() {
    const parts = [];
    if (yearInt) parts.push(String(yearInt));
    if (effectiveBuilder) parts.push(effectiveBuilder);
    if (model.trim()) parts.push(model.trim());
    const built = parts.join(" ").trim();
    return built || "Sailboat Listing";
  }

  /* -------------------------
     EMAIL VERIFY RESEND
  ------------------------- */
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

  /* -------------------------
     SUBMIT
  ------------------------- */
  async function onSubmit(e) {
    e.preventDefault();
    setFormError("");
    setContactPhoneMsg("");

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
      city: true,
      usRegion: true,
      state: true,

      firstName: true,
      lastName: true,
      contactEmail: true,
    }));

    const anyMissing = Object.values(missing).some(Boolean);
    if (anyMissing) {
      setFormError("Please complete the highlighted required fields.");
      return;
    }

    // ✅ Phone validation (optional, but if present must be valid)
    const { e164: contactPhoneE164, ok: phoneOk } = normalizePhoneToE164(contactPhone);
    if (!phoneOk) {
      setContactPhoneMsg("Please enter a valid phone number (include country code), or leave it blank.");
      setFormError("Please fix the phone number field.");
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }

    const hasLocalPhotos = (photoItems || []).some((p) => p?.status === "local");
    if (photoItems.length > 0 && hasLocalPhotos) {
      setFormError("You selected photos. Please press Upload in the Photos section before submitting.");
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }

    if (sellerRole === "BROKER" && brokerHeroItem && brokerHeroItem.status === "local") {
      setFormError(
        "You selected a Broker / Business Hero Image. Please press Upload in the Listing Contact section before submitting."
      );
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }

    setSubmitting(true);
    try {
      const photosAfterUpload = await uploadAllPhotosIfNeeded(photoItems);
      const brokerAfterUpload = await uploadBrokerHeroIfNeeded(brokerHeroItem);

      const orderedKeys = (photosAfterUpload || []).map((p) => p.uploadedKey).filter(Boolean);

      // ✅ FIX: Use the same countryOptions array everywhere (no COUNTRY_OPTIONS undefined)
      const brokerageCountryLabel =
        countryLabelFromValue(countryOptions, brokerageCountry) || brokerageCountry || "";
      const locationCountryLabel =
        countryLabelFromValue(countryOptions, locationCountry) || locationCountry || "";

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

        // Location (✅ store ISO code)
        locationCountry: String(locationCountry || "").toUpperCase(),
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

        // Generator
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
        hasDinghy: hasDinghy,
        dinghyDetails: hasDinghy === "YES" ? (dinghyNotes || "").trim() || null : null,

        // Equipment
        equipment: installedEquipment,

        // Photos
        heroImageUrl: orderedKeys[0] || null,
        imageUrls: orderedKeys,

        // Contact
        sellerRole,
        listingContactName: `${listingContactFirstName} ${listingContactLastName}`.trim(),
        contactEmail: contactEmail.trim(),

        // ✅ normalized E.164 (or null)
        contactPhone: contactPhoneE164 ? contactPhoneE164 : null,

        // Broker fields
        brokerageName: sellerRole === "BROKER" ? brokerageName.trim() || null : null,
        brokerageAddress:
          sellerRole === "BROKER"
            ? [brokerageStreet, brokerageCity, brokerageState, brokerageCountryLabel]
                .map((s) => (s || "").trim())
                .filter(Boolean)
                .join(", ") || null
            : null,
        brokerLogoUrl: sellerRole === "BROKER" ? brokerAfterUpload?.uploadedKey || null : null,

        // optional display helper
        _locationCountryLabel: locationCountryLabel,
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
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {}
        return;
      }

      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      setNeedsEmailVerify(false);
      setResendMsg("");

      clearDraftOnly();

      router.push(data.previewPath || data.previewUrl || "/listings");
      router.refresh();
    } catch (e2) {
      setFormError(e2?.message || "Failed to create listing.");
      saveDraftNow();
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     SECTION 3 of 3 — RENDER
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
                resendBusy
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-[#0a2230] text-white hover:bg-[#0f2a3b]"
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

      {resetMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
          {resetMsg}
        </div>
      ) : null}

      {lastDraftSavedAt ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div>
            Draft saved{" "}
            <span className="font-semibold">
              {new Date(lastDraftSavedAt).toLocaleString(undefined, {
                month: "short",
                day: "2-digit",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          <button
            type="button"
            className="text-[12px] font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
            onClick={clearDraftAndReset}
          >
            Clear draft / reset form
          </button>
        </div>
      ) : null}

      {/* =====================================================
          1) BOAT BASICS
      ====================================================== */}
      <SectionCard title="Boat Basics">
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-12 items-end">
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
          </div>

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
          </div>

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

          <div className="sm:col-span-12">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4">
                <div className="flex items-center gap-2">
                  <label className={label("loa")}>
                    Length <Asterisk />
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
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="sm:col-span-6">
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="max-w-[180px]">
                <label className={labelBase}># of Cabins</label>
                <input
                  className={`${fieldSmall} border-slate-300 bg-white w-full`}
                  value={cabins}
                  onChange={(e) => setCabins(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="max-w-[180px]">
                <label className={labelBase}># of Heads</label>
                <input
                  className={`${fieldSmall} border-slate-300 bg-white w-full`}
                  value={heads}
                  onChange={(e) => setHeads(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

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
                placeholder={`${curSymbol}`}
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
          {/* Country */}
          <div className="sm:col-span-6">
            <label className={label("country")}>
              Country <Asterisk />
            </label>
            <div className="max-w-[520px]">
              <select
                className={input("country")}
                value={locationCountry}
                onChange={(e) => {
                  const v = String(e.target.value || "").toUpperCase();
                  setLocationCountry(v);
                  touch("country");

                  if (v !== "US") {
                    setLocationUsRegion("");
                    setLocationState("");
                  }
                }}
                onBlur={() => touch("country")}
              >
                {countryOptions.map((o) => (
                  <option key={o.value || "blank"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* City */}
          <div className="sm:col-span-6">
            <label className={label("city")}>
              City <Asterisk />
            </label>
            <div className="max-w-[520px]">
              <input
                className={input("city")}
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                onBlur={() => touch("city")}
                placeholder="Miami"
              />
            </div>
          </div>

          {/* US-only: Region + State aligned */}
          {isUSA && (
            <>
              <div className="sm:col-span-6">
                <label className={label("usRegion")}>
                  USA Region <Asterisk />
                </label>
                <div className="max-w-[520px]">
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
                <div className="max-w-[200px]">
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
          3) DESCRIPTION
      ====================================================== */}
      <SectionCard title="Description">
        <div>
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
        </div>
      </SectionCard>

      {/* =====================================================
        3.5) ADDITIONAL INFORMATION
      ====================================================== */}
      {/* (UNCHANGED — your Additional Information block stays exactly as you pasted it) */}
      {/* ... */}
      {/* =====================================================
          4) EQUIPMENT
      ====================================================== */}
      {/* (UNCHANGED — your Equipment block stays exactly as you pasted it) */}
      {/* ... */}
      {/* =====================================================
          5) PHOTOS
      ====================================================== */}
      {/* (UNCHANGED — your Photos block stays exactly as you pasted it) */}
      {/* ... */}

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
                  contactTouchedRef.current.sellerRole = true;
                  setSellerRole("OWNER");
                  touch("sellerRole");

                  if (brokerHeroItem?.previewUrl) {
                    try {
                      URL.revokeObjectURL(brokerHeroItem.previewUrl);
                    } catch {}
                  }
                  setBrokerHeroItem(null);
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-end">
            <div className="sm:col-span-6">
              <label className={label("firstName")}>
                First Name <Asterisk />
              </label>
              <div className="max-w-[520px]">
                <input
                  className={input("firstName")}
                  value={listingContactFirstName}
                  onChange={(e) => {
                    contactTouchedRef.current.firstName = true;
                    setListingContactFirstName(e.target.value);
                  }}
                  onBlur={() => touch("firstName")}
                  placeholder="John"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className={label("lastName")}>
                Last Name <Asterisk />
              </label>
              <div className="max-w-[520px]">
                <input
                  className={input("lastName")}
                  value={listingContactLastName}
                  onChange={(e) => {
                    contactTouchedRef.current.lastName = true;
                    setListingContactLastName(e.target.value);
                  }}
                  onBlur={() => touch("lastName")}
                  placeholder="Smith"
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
                  onChange={(e) => {
                    contactTouchedRef.current.contactEmail = true;
                    setContactEmail(e.target.value);
                  }}
                  onBlur={() => touch("contactEmail")}
                  inputMode="email"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* ✅ NEW: shared phone UI + message */}
            <div className="sm:col-span-6">
              <div className="max-w-[420px]">
                <PhoneE164Field
                  label="Phone Number (optional)"
                  // prefer boat location country, otherwise brokerage country; component falls back to browser lang
                  preferredCountry={locationCountry || brokerageCountry || ""}
                  value={contactPhone}
                  onChange={(v) => {
                    contactTouchedRef.current.contactPhone = true;
                    setContactPhone(v);
                    setContactPhoneMsg("");
                  }}
                  message={contactPhoneMsg}
                  help="Include country code. We store phone numbers in international format so they display correctly worldwide."
                />

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPhonePrivacy(true)}
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                  >
                    How ST protects your number
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ your BROKER block continues exactly as before */}
            {sellerRole === "BROKER" && (
              <>
                <div className="sm:col-span-6">
                  <label className={labelBase}>Brokerage Name</label>
                  <div className="max-w-[520px]">
                    <input
                      className={`${fieldBase} border-slate-300 bg-white`}
                      value={brokerageName}
                      onChange={(e) => {
                        contactTouchedRef.current.brokerageName = true;
                        setBrokerageName(e.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="sm:col-span-12">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-7">
                      <label className={labelBase}>Street Address</label>
                      <div className="max-w-[720px]">
                        <input
                          className={`${fieldBase} border-slate-300 bg-white`}
                          value={brokerageStreet}
                          onChange={(e) => {
                            contactTouchedRef.current.brokerageStreet = true;
                            setBrokerageStreet(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-5">
                      <label className={labelBase}>City</label>
                      <div className="max-w-[420px]">
                        <input
                          className={`${fieldBase} border-slate-300 bg-white`}
                          value={brokerageCity}
                          onChange={(e) => {
                            contactTouchedRef.current.brokerageCity = true;
                            setBrokerageCity(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <label className={labelBase}>State / Region</label>
                      <div className="max-w-[240px]">
                        <input
                          className={`${fieldSmall} border-slate-300 bg-white w-full`}
                          value={brokerageState}
                          onChange={(e) => {
                            contactTouchedRef.current.brokerageState = true;
                            setBrokerageState(e.target.value);
                          }}
                          placeholder={String(brokerageCountry || "").toUpperCase() === "US" ? "ex: FL" : ""}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <label className={labelBase}>Country</label>
                      <div className="max-w-[320px]">
                        <select
                          className={`${fieldBase} border-slate-300 bg-white`}
                          value={brokerageCountry}
                          onChange={(e) => {
                            const v = String(e.target.value || "").toUpperCase();
                            contactTouchedRef.current.brokerageCountry = true;
                            setBrokerageCountry(v);

                            // ✅ match your API behavior: brokerageState only meaningful for US
                            if (v !== "US") setBrokerageState("");
                          }}
                        >
                          {countryOptions.map((o) => (
                            <option key={o.value || "blank"} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* (rest of broker hero upload UI unchanged) */}
              </>
            )}
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

      {/* ✅ Bottom clear draft / reset banner (same as top) */}
      {lastDraftSavedAt ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div>
            Draft saved{" "}
            <span className="font-semibold">
              {new Date(lastDraftSavedAt).toLocaleString(undefined, {
                month: "short",
                day: "2-digit",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          <button
            type="button"
            className="text-[12px] font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
            onClick={clearDraftAndReset}
          >
            Clear draft / reset form
          </button>
        </div>
      ) : null}

      {/* ✅ Bottom reset confirmation message */}
      {resetMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
          {resetMsg}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button type="button" className={btnGhost} onClick={() => router.push("/listings")}>
          Cancel
        </button>

        <button type="button" className={btnGhost} onClick={saveDraftNow}>
          Save draft
        </button>

        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? "Saving…" : "Create listing"}
        </button>
      </div>
    </form>
  );
}
