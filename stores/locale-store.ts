import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppLocale = "en" | "mm";

type LocaleState = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
      toggleLocale: () =>
        set({ locale: get().locale === "en" ? "mm" : "en" }),
    }),
    {
      name: "swanaar-mes-locale",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
