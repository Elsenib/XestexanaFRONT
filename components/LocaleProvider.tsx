"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import az from "../locales/az";
import en from "../locales/en";
import ru from "../locales/ru";
import tr from "../locales/tr";

export const LOCALES = ["az", "en", "ru", "tr"] as const;
export type Locale = (typeof LOCALES)[number];
export type TranslationBundle = typeof az;

const translations = {
  az,
  en,
  ru,
  tr
} as const;

const STORAGE_KEY = "hospital_locale";

function getValue(bundle: unknown, path: string) {
  return path.split(".").reduce((current: any, part) => current?.[part], bundle as any);
}

function interpolate(text: string, params: Record<string, string> = {}) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] ?? match);
}

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, paramsOrFallback?: Record<string, string> | string, fallback?: string) => string;
  bundle: TranslationBundle;
}>({
  locale: "az",
  setLocale: () => undefined,
  t: () => "",
  bundle: az
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("az");

  useEffect(() => {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY) as Locale | null;
    if (saved && LOCALES.includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
  }, []);

  const bundle = translations[locale];

  const t = useCallback(
    (key: string, paramsOrFallback?: Record<string, string> | string, fallback?: string) => {
      const value = getValue(bundle, key);
      if (typeof value === "string") {
        if (typeof paramsOrFallback === "object") {
          return interpolate(value, paramsOrFallback);
        }
        return value;
      }
      if (typeof paramsOrFallback === "string") {
        return paramsOrFallback;
      }
      return fallback ?? key;
    },
    [bundle]
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t, bundle }),
    [locale, setLocale, t, bundle]
  );

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
