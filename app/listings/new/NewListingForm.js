// app/listings/new/NewListingForm.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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

/* Small UI */
function Asterisk() {
  return <span className="ml-1 font-extrabold text-[#0a2230]">*</span>;
}

function XIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
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
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
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

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [bottomFormError, setBottomFormError] = useState("");
    // ✅ Client-side auth guard (prevents cached navigation showing this page when logged out)
  const [authChecking, setAuthChecking] = useState(true);
  const [authOk, setAuthOk] = useState(false);

  useEffect(() => {
    let alive = true;

    async function guard() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const uid = data?.user?.uid || data?.uid;

        if (!alive) return;

        if (!uid) {
          window.location.assign(
            `/login?next=${encodeURIComponent("/listings/new")}`,
          );
          return;
        }

        setAuthOk(true);
      } catch {
        if (!alive) return;
        window.location.assign(`/login?next=${encodeURIComponent("/dashboard/listings")}`);

        return;
      } finally {
        if (alive) setAuthChecking(false);
      }
    }

    guard();
    return () => {
      alive = false;
    };
  }, []);




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
     LOCATION
  ------------------------- */
  const [locationCountrySel, setLocationCountrySel] = useState("");
  const [locationCountryOther, setLocationCountryOther] = useState("");
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
      prev.filter((x) => x.toLowerCase() !== String(name).toLowerCase()),
    );
  }

  const installedEquipment = useMemo(() => {
    const presets = Array.from(equipmentSelected);
    return dedupeStrings([...presets, ...additionalEquipment]).sort((a, b) =>
      a.localeCompare(b),
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
  setBottomFormError("");

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
        : p,
    );

    setPhotoItems(next);
    return next;
  } catch (e) {
    const msg = e?.message || "Photo upload failed.";
    setFormError(msg);
    setBottomFormError(msg);
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
  const [brokerageCountry, setBrokerageCountry] = useState("");

  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

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

  // ✅ clear prior errors (top + bottom)
  setFormError("");
  setBottomFormError("");

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

    const next = {
      ...snapshot,
      status: "uploaded",
      uploadedKey: String(data.key),
    };
    setBrokerHeroItem(next);
    return next;
  } catch (e) {
    const msg = e?.message || "Business hero image upload failed.";
    setFormError(msg);
    setBottomFormError(msg);
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

        const maybeFirst = (data?.firstName || data?.nameFirst || "")
          .toString()
          .trim();
        const maybeLast = (data?.lastName || data?.nameLast || "")
          .toString()
          .trim();
        const maybeEmail = (data?.email || "").toString().trim();
        const maybePhone = (data?.phone || data?.phoneNumber || "")
          .toString()
          .trim();

        if (
          !contactTouchedRef.current.firstName &&
          !listingContactFirstName.trim() &&
          maybeFirst
        ) {
          setListingContactFirstName(maybeFirst);
        }
        if (
          !contactTouchedRef.current.lastName &&
          !listingContactLastName.trim() &&
          maybeLast
        ) {
          setListingContactLastName(maybeLast);
        }
        if (
          !contactTouchedRef.current.contactEmail &&
          !contactEmail.trim() &&
          maybeEmail
        ) {
          setContactEmail(maybeEmail);
        }
        if (
          !contactTouchedRef.current.contactPhone &&
          !contactPhone.trim() &&
          maybePhone
        ) {
          setContactPhone(maybePhone);
        }

        const maybeRole = (data?.sellerRole || data?.role || "")
          .toString()
          .toUpperCase()
          .trim();
        if (
          !contactTouchedRef.current.sellerRole &&
          !sellerRole &&
          (maybeRole === "OWNER" || maybeRole === "BROKER")
        ) {
          setSellerRole(maybeRole);
        }

        const maybeBrokerageName = (data?.brokerageName || data?.company || "")
          .toString()
          .trim();
        const maybeStreet = (data?.brokerageStreet || data?.street || "")
          .toString()
          .trim();
        const maybeCity = (data?.brokerageCity || data?.city || "")
          .toString()
          .trim();
        const maybeState = (
          data?.brokerageState ||
          data?.state ||
          data?.region ||
          ""
        )
          .toString()
          .trim();
        const maybeCountry = (data?.brokerageCountry || data?.country || "")
          .toString()
          .trim();

        if (
          !contactTouchedRef.current.brokerageName &&
          !brokerageName.trim() &&
          maybeBrokerageName
        ) {
          setBrokerageName(maybeBrokerageName);
        }
        if (
          !contactTouchedRef.current.brokerageStreet &&
          !brokerageStreet.trim() &&
          maybeStreet
        ) {
          setBrokerageStreet(maybeStreet);
        }
        if (
          !contactTouchedRef.current.brokerageCity &&
          !brokerageCity.trim() &&
          maybeCity
        ) {
          setBrokerageCity(maybeCity);
        }
        if (
          !contactTouchedRef.current.brokerageState &&
          !brokerageState.trim() &&
          maybeState
        ) {
          setBrokerageState(maybeState);
        }
        if (
          !contactTouchedRef.current.brokerageCountry &&
          !brokerageCountry.trim() &&
          maybeCountry
        ) {
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
     DRAFT STORAGE (FIXED)
     - All draft functions live INSIDE the component so they can
       see state (no more "year is not defined" bugs).
     - Restores once, then autosaves (debounced + interval + hide/unload).
     - Stores ONLY uploaded photo keys (never File objects).
  ========================================================= */
  const restoringDraftRef = useRef(false);
  const debounceTimerRef = useRef(null);

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

      // Location
      locationCountrySel,
      locationCountryOther,
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
      contactPhone,

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
          ? {
              uploadedKey: brokerHeroItem.uploadedKey,
              previewUrl: brokerHeroItem.previewUrl || "",
            }
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
    locationCountrySel,
    locationCountryOther,
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
    if (restoringDraftRef.current) return; // don't save while applying draft

    try {
      const snapshot = buildDraftSnapshot();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
      setLastDraftSavedAt(snapshot.savedAt);
    } catch {
      // ignore storage errors
    }
  }, [buildDraftSnapshot]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(DRAFT_KEY);
      setLastDraftSavedAt(null);
    } catch {}
  }, []);

  const applyDraftSnapshot = useCallback((d) => {
    if (!d || typeof d !== "object") return;

    restoringDraftRef.current = true;
    try {
      // Basics
      if (typeof d.year === "string") setYear(d.year);
      if (typeof d.builderSel === "string") setBuilderSel(d.builderSel);
      if (typeof d.builderOther === "string") setBuilderOther(d.builderOther);
      if (typeof d.model === "string") setModel(d.model);
      if (typeof d.boatCondition === "string")
        setBoatCondition(d.boatCondition);

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

      // Location
      if (typeof d.locationCountrySel === "string")
        setLocationCountrySel(d.locationCountrySel);
      if (typeof d.locationCountryOther === "string")
        setLocationCountryOther(d.locationCountryOther);
      if (typeof d.locationUsRegion === "string")
        setLocationUsRegion(d.locationUsRegion);
      if (typeof d.locationState === "string")
        setLocationState(d.locationState);
      if (typeof d.locationCity === "string") setLocationCity(d.locationCity);

      // Additional
      if (typeof d.engineFuel === "string") setEngineFuel(d.engineFuel);
      if (typeof d.engineMake === "string") setEngineMake(d.engineMake);
      if (typeof d.engineModel === "string") setEngineModel(d.engineModel);
      if (typeof d.propeller === "string") setPropeller(d.propeller);
      if (typeof d.horsepower === "string") setHorsepower(d.horsepower);

      if (typeof d.engineHours === "string") setEngineHours(d.engineHours);
      if (typeof d.leftEngineHours === "string")
        setLeftEngineHours(d.leftEngineHours);
      if (typeof d.rightEngineHours === "string")
        setRightEngineHours(d.rightEngineHours);

      if (typeof d.hasGenerator === "string") setHasGenerator(d.hasGenerator);
      if (typeof d.generatorFuel === "string")
        setGeneratorFuel(d.generatorFuel);
      if (typeof d.generatorMake === "string")
        setGeneratorMake(d.generatorMake);
      if (typeof d.generatorKw === "string") setGeneratorKw(d.generatorKw);
      if (typeof d.generatorHours === "string")
        setGeneratorHours(d.generatorHours);

      if (typeof d.tankUnit === "string") setTankUnit(d.tankUnit);
      if (typeof d.tankFuel === "string") setTankFuel(d.tankFuel);
      if (typeof d.tankWater === "string") setTankWater(d.tankWater);
      if (typeof d.tankHolding === "string") setTankHolding(d.tankHolding);

      if (typeof d.hasDinghy === "string") setHasDinghy(d.hasDinghy);
      if (typeof d.dinghyNotes === "string") setDinghyNotes(d.dinghyNotes);

      // Description
      if (typeof d.description === "string") setDescription(d.description);

      // Equipment
      if (Array.isArray(d.equipmentSelected))
        setEquipmentSelected(new Set(d.equipmentSelected));
      if (typeof d.additionalEquipmentInput === "string")
        setAdditionalEquipmentInput(d.additionalEquipmentInput);
      if (Array.isArray(d.additionalEquipment))
        setAdditionalEquipment(d.additionalEquipment);

      // Contact
      if (typeof d.sellerRole === "string") setSellerRole(d.sellerRole);
      if (typeof d.listingContactFirstName === "string")
        setListingContactFirstName(d.listingContactFirstName);
      if (typeof d.listingContactLastName === "string")
        setListingContactLastName(d.listingContactLastName);

      if (typeof d.brokerageName === "string")
        setBrokerageName(d.brokerageName);
      if (typeof d.brokerageStreet === "string")
        setBrokerageStreet(d.brokerageStreet);
      if (typeof d.brokerageCity === "string")
        setBrokerageCity(d.brokerageCity);
      if (typeof d.brokerageState === "string")
        setBrokerageState(d.brokerageState);
      if (typeof d.brokerageCountry === "string")
        setBrokerageCountry(d.brokerageCountry);

      if (typeof d.contactEmail === "string") setContactEmail(d.contactEmail);
      if (typeof d.contactPhone === "string") setContactPhone(d.contactPhone);

      // Photos (uploaded only)
      if (Array.isArray(d.photoItemsUploaded) && d.photoItemsUploaded.length) {
        setPhotoItems((prev) => {
          const keepLocal = (prev || []).filter((p) => p?.status === "local"); // keep what user selected this session
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
      // give React a tick before allowing autosave
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

  // Debounced autosave on edits (after draft has loaded)
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
    // NOTE: intentionally broad deps so *any* edit saves
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
    locationCountrySel,
    locationCountryOther,
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
    city: !locationCity.trim(),
    usRegion: isUSA && !locationUsRegion,
    state: isUSA && !locationState.trim(),

    firstName: !listingContactFirstName.trim(),
    lastName: !listingContactLastName.trim(),
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
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok)
        throw new Error(data?.error || "Could not resend verification email.");
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

  // ✅ clear prior errors (top + bottom)
  setFormError("");
  setBottomFormError("");

  // ✅ belt & suspenders: block submit if not logged in
  // (supports BOTH /api/auth/me shapes: { user: { uid } } and { uid })
  try {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const me = await meRes.json().catch(() => ({}));
    const uid = me?.user?.uid || me?.uid;
    if (!uid) {
      window.location.assign(`/login?next=${encodeURIComponent("/dashboard/listings")}`);
      return;
    }
  } catch {
    window.location.assign(`/login?next=${encodeURIComponent("/dashboard/listings")}`);
    return;
  }

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

  const fail = (msg) => {
    setFormError(msg);
    setBottomFormError(msg);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const anyMissing = Object.values(missing).some(Boolean);
  if (anyMissing) {
    fail("Please complete the highlighted required fields.");
    return;
  }

  const hasLocalPhotos = (photoItems || []).some((p) => p?.status === "local");
  if (photoItems.length > 0 && hasLocalPhotos) {
    fail(
      "You selected photos. Please press Upload in the Photos section before submitting.",
    );
    return;
  }

  if (sellerRole === "BROKER" && brokerHeroItem && brokerHeroItem.status === "local") {
    fail(
      "You selected a Broker / Business Hero Image. Please press Upload in the Listing Contact section before submitting.",
    );
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

      // Dinghy (stored as dinghyModel to avoid schema changes)
      hasDinghy: hasDinghy || null,
      dinghyModel: hasDinghy === "YES" ? (dinghyNotes || "").trim() || null : null,
      dinghyLength: null,
      dinghyLengthUnit: null,
      dinghyMotor: null,

      // Equipment
      equipment: installedEquipment,

      // Photos
      heroImageUrl: orderedKeys[0] || null,
      imageUrls: orderedKeys,

      // Contact
      sellerRole,
      listingContactName: `${listingContactFirstName} ${listingContactLastName}`.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || null,

      // Broker fields
      brokerageName: sellerRole === "BROKER" ? brokerageName.trim() || null : null,
      brokerageAddress:
        sellerRole === "BROKER"
          ? [brokerageStreet, brokerageCity, brokerageState, brokerageCountry]
              .map((s) => (s || "").trim())
              .filter(Boolean)
              .join(", ") || null
          : null,
      brokerLogoUrl: sellerRole === "BROKER" ? brokerAfterUpload?.uploadedKey || null : null,
    };

    const res = await fetch("/api/listings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    // ✅ auth required (supports new route.js responses: error=AUTH_REQUIRED or "Unauthorized")
    if (!res.ok && (data?.error === "AUTH_REQUIRED" || data?.error === "Unauthorized")) {
      window.location.assign(`/login?next=${encodeURIComponent("/dashboard/listings")}`);
      return;
    }

    if (!res.ok && data?.code === "EMAIL_NOT_VERIFIED") {
      setNeedsEmailVerify(true);
      const msg = "Please verify your email before creating a listing.";
      setFormError(msg);
      setBottomFormError(msg);
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }

    // ✅ server-side validation (supports { errors: [...] } OR { missing: [...] })
    if (!res.ok) {
      const label = {
        sellerRole: "Seller role",
        year: "Year",
        builder: "Builder",
        model: "Model",
        boatCondition: "Boat condition",
        type: "Hull type",
        description: "Description",
        price: "Price",
        locationCountry: "Country",
        locationCity: "City",
        locationUsRegion: "USA region",
        locationState: "State",
        listingContactName: "Contact name",
        contactEmail: "Email",
      };

      let msg =
        data?.message ||
        data?.error ||
        `Request failed (${res.status})`;

      if (Array.isArray(data?.errors) && data.errors.length) {
        msg = data.errors.join(" ");
      } else if (Array.isArray(data?.missing) && data.missing.length) {
        msg =
          "Please complete: " +
          data.missing.map((k) => label[k] || k).join(", ") +
          ".";
      }

      setFormError(msg);
      setBottomFormError(msg);
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      saveDraftNow();
      return;
    }

    setNeedsEmailVerify(false);
    setResendMsg("");

    clearDraft();

    router.push(data.previewPath || data.previewUrl || "/listings");
    router.refresh();
  } catch (e2) {
    const msg = e2?.message || "Failed to create listing.";
    setFormError(msg);
    setBottomFormError(msg);
    saveDraftNow(); // keep draft intact on failure
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  } finally {
    setSubmitting(false);
  }
}

/* =========================================================
   SECTION 3 of 3 — RENDER
========================================================= */
  if (authChecking) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-0 py-10 text-slate-600 text-[13px]">
        Loading…
      </div>
    );
  }

  if (!authOk) {
    // redirect already in progress
    return null;
  }

return (
  <form
    onSubmit={onSubmit}
    className="space-y-7 max-w-4xl mx-auto px-4 sm:px-0"
  >
    {needsEmailVerify && (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-[13px] text-amber-900">
        <div className="font-semibold">Verify your email to post listings</div>
        <div className="mt-1 text-amber-900/80">
          We sent you a verification link during registration. Click it, then
          come back and submit again.
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

    {/* ✅ TOP error message */}
    {formError && (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {formError}
      </div>
    )}

    {/* Draft status */}
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
          className="text-[12px] font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
          onClick={clearDraft}
        >
          Clear draft
        </button>
      </div>
    ) : null}

    {/* =====================================================
        1) BOAT BASICS
    ====================================================== */}
    {/* ... your existing form sections remain unchanged ... */}

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
            <div className="text-[14px] font-semibold text-white">
              How ST protects your number
            </div>
          </div>
          <div className="p-5 text-[13px] text-slate-700">
            ST.com values your privacy and will only display a phone number if a
            valid user is logged in.
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setShowPhonePrivacy(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ✅ BOTTOM error message (place directly above submit buttons) */}
    {bottomFormError && (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {bottomFormError}
      </div>
    )}

    {/* Submit buttons */}
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        className={btnGhost}
        onClick={() => router.push("/listings")}
      >
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

