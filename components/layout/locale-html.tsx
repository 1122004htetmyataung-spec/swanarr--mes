"use client";

import { useEffect } from "react";

import { useLocaleStore } from "@/stores/locale-store";

/** Keeps `<html lang>` in sync with the MM/EN toggle (accessibility + font hints). */
export function LocaleHtmlAttrs() {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale === "mm" ? "my" : "en";
  }, [locale]);

  return null;
}
