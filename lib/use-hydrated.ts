"use client";

import { useEffect, useState } from "react";

/** Avoids SSR/client mismatch when reading persisted Zustand state. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
