"use client";

import { useEffect, useState } from "react";
import { guessDefaultPhoneCountry, toPhoneIso2Lower } from "@/lib/phone";

export function usePhoneDefaultCountry(preferredIso2Upper = "") {
  const [cc, setCc] = useState("us");

  useEffect(() => {
    setCc(guessDefaultPhoneCountry("us"));
  }, []);

  useEffect(() => {
    const next = toPhoneIso2Lower(preferredIso2Upper);
    if (next) setCc(next);
  }, [preferredIso2Upper]);

  return cc;
}
