"use client";

import { PhoneInput } from "react-international-phone";
import { usePhoneDefaultCountry } from "@/lib/usePhoneDefaultCountry";

export default function PhoneE164Field({
  label,
  value,
  onChange,
  preferredCountry, // "US" / "CA" etc (optional)
  message,
  help,
  size = "md", // "md" (account) or "sm" (listing form)
}) {
  const defaultCountry = usePhoneDefaultCountry(preferredCountry);

  const inputText =
    size === "sm" ? "!text-[13px]" : "!text-sm";

  const wrapperPad =
    size === "sm" ? "px-3 py-1.5" : "px-3 py-2";

  return (
    <div>
      {label ? (
        <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
          {label}
        </label>
      ) : null}

      <div
        className={`rounded-xl border border-slate-300 ${wrapperPad} focus-within:ring-2 focus-within:ring-[#c8a44d]/40 bg-white`}
      >
        <PhoneInput
          defaultCountry={defaultCountry}
          value={value}
          onChange={onChange}
          inputClassName={`w-full !border-0 !shadow-none !outline-none ${inputText}`}
          countrySelectorStyleProps={{
            buttonClassName: "!border-0 !shadow-none",
          }}
        />
      </div>

      {message ? (
        <div className="mt-2 text-xs font-semibold text-red-600">{message}</div>
      ) : null}

      {help ? (
        <div className="mt-2 text-xs text-slate-600">{help}</div>
      ) : null}
    </div>
  );
}
