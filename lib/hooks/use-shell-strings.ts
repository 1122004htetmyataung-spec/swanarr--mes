"use client";

import { useMemo } from "react";

import { getShellStrings, type ShellKey } from "@/lib/i18n/shell";
import { useLocaleStore } from "@/stores/locale-store";

export function useShellStrings() {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(() => getShellStrings(locale), [locale]);
}

export type { ShellKey };
