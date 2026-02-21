// components/SpecTable.js
const INK = "#0a2230";

function hullLabel(v) {
  if (!v) return "—";
  const s = String(v).toUpperCase();
  if (s === "MONOHULL") return "Monohull";
  if (s === "CATAMARAN") return "Catamaran";
  if (s === "TRIMARAN") return "Trimaran";
  return String(v);
}

function conditionLabel(v) {
  if (!v) return "—";
  const s = String(v).toUpperCase();
  if (s === "NEW") return "New";
  if (s === "USED") return "Used";
  return String(v);
}

function yesNoLabel(v) {
  if (!v) return "—";
  const s = String(v).toUpperCase();
  if (s === "YES") return "Yes";
  if (s === "NO") return "No";
  return String(v);
}

function money(value, currency) {
  if (value == null || value === "") return "—";
  const cur = String(currency || "USD");
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${Number(value).toLocaleString()} ${cur}`;
  }
}

function fmtNum(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n % 1 === 0 ? String(n) : String(n.toFixed(2)).replace(/\.?0+$/, "");
}

function fmtWithUnit(v, unit) {
  if (v == null || v === "") return "—";
  const u = unit ? String(unit) : "";
  return u ? `${fmtNum(v)} ${u}` : fmtNum(v);
}

function line(label, value) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[14px] font-semibold" style={{ color: INK }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-[13px] font-semibold" style={{ color: INK }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function SpecTable({ listing = {} }) {
  const {
    // Basics
    year,
    builder,
    model,
    type,
    boatCondition,
    cabins,
    heads,

    // Price
    price,
    currency,

    // Dimensions
    loa,
    loaUnit,
    draft,
    draftUnit,
    airDraft,
    airDraftUnit,

    // Engines
    engineFuel,
    engineMake,
    engineModel,
    horsepower,
    propeller,
    engineHours,
    leftEngineHours,
    rightEngineHours,

    // Generator
    hasGenerator,
    generatorFuel,
    generatorMake,
    generatorKw,
    generatorHours,

    // Tanks
    tankUnit,
    tankFuel,
    tankWater,
    tankHolding,

    // Dinghy
    hasDinghy,
    dinghydetails,

    // Location
    locationCity,
    locationState,
    locationCountry,
  } = listing ?? {};

  const location =
    [locationCity, locationState, locationCountry]
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .join(", ") || "—";

  const tankUnitLabel = tankUnit === "L" ? "L" : tankUnit === "gal" ? "gal" : "";

  return (
    <div className="space-y-4">
      <Section title="Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {line("Price", money(price, currency))}
          {line("Location", location)}
          {line("Hull Type", hullLabel(type))}
          {line("Condition", conditionLabel(boatCondition))}
        </div>
      </Section>

      <Section title="Boat Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {line("Year", year ?? "—")}
          {line("Builder", builder || "—")}
          {line("Model", model || "—")}
          {line("Cabins", cabins ?? "—")}
          {line("Heads", heads ?? "—")}
        </div>
      </Section>

      <Section title="Dimensions">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {line("LOA", fmtWithUnit(loa, loaUnit))}
          {line("Draft", fmtWithUnit(draft, draftUnit))}
          {line("Air Draft", fmtWithUnit(airDraft, airDraftUnit))}
        </div>
      </Section>

      <Section title="Engines">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {line("Fuel", engineFuel || "—")}
          {line("Make", engineMake || "—")}
          {line("Model", engineModel || "—")}
          {line("Horsepower", horsepower != null ? `${horsepower} hp` : "—")}
          {line("Propeller", propeller || "—")}

          {/* Hours: show both if present */}
          {type === "CATAMARAN" || type === "TRIMARAN" ? (
            <>
              {line("Left Engine Hours", leftEngineHours ?? "—")}
              {line("Right Engine Hours", rightEngineHours ?? "—")}
            </>
          ) : (
            line("Engine Hours", engineHours ?? "—")
          )}
        </div>
      </Section>

      <Section title="Generator">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {line("Generator?", yesNoLabel(hasGenerator))}
          {hasGenerator === "YES" ? (
            <>
              {line("Fuel", generatorFuel || "—")}
              {line("Make", generatorMake || "—")}
              {line("kW Rating", generatorKw != null ? `${fmtNum(generatorKw)} kW` : "—")}
              {line("Hours", generatorHours ?? "—")}
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Total Tank Capacities">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {line("Fuel", tankFuel != null ? `${fmtNum(tankFuel)}${tankUnitLabel ? ` ${tankUnitLabel}` : ""}` : "—")}
          {line("Water", tankWater != null ? `${fmtNum(tankWater)}${tankUnitLabel ? ` ${tankUnitLabel}` : ""}` : "—")}
          {line(
            "Holding",
            tankHolding != null ? `${fmtNum(tankHolding)}${tankUnitLabel ? ` ${tankUnitLabel}` : ""}` : "—"
          )}
          {line("Tank Units", tankUnitLabel || "—")}
        </div>
      </Section>

      <Section title="Dinghy">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {line("Dinghy Included?", yesNoLabel(hasDinghy))}
          {hasDinghy === "YES" ? (
            <>
              {line("Model", dinghyModel || "—")}
              {line("Length", fmtWithUnit(dinghyLength, dinghyLengthUnit))}
              {line("Motor", yesNoLabel(dinghyMotor))}
            </>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
