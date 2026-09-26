import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./en.json";
import ta from "./ta.json";

const DICTIONARIES = { en, ta };
const STORAGE_KEY = "sm_lang";

const LanguageContext = createContext(null);

function resolvePath(dictionary, path) {
  return path.split(".").reduce((node, key) => {
    if (node && typeof node === "object" && key in node) return node[key];
    return undefined;
  }, dictionary);
}

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ta") return stored;
  } catch {
    /* private browsing */
  }
  return "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next) => {
    const value = next === "ta" ? "ta" : "en";
    setLanguageState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ta" : "en");
  }, [language, setLanguage]);

  /**
   * Looks a key up in the active language and falls back to English so a
   * missing Tamil string never renders as a raw dotted path.
   */
  const t = useCallback(
    (key, vars) => {
      const value = resolvePath(DICTIONARIES[language], key) ?? resolvePath(DICTIONARIES.en, key);
      if (typeof value !== "string") return key;
      if (!vars) return value;
      return Object.entries(vars).reduce(
        (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
        value
      );
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, isTamil: language === "ta", setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return context;
}

/** Picks the Tamil or English variant of any `{nameEn, nameTa}` shaped record. */
export function localName(record, language) {
  if (!record) return "";
  const english = record.nameEn ?? record.shopNameEn ?? record.taglineEn ?? "";
  const tamil = record.nameTa ?? record.shopNameTa ?? record.taglineTa ?? "";
  return language === "ta" ? tamil || english : english || tamil;
}
