import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { request } from "../lib/apiClient.js";
import { useAuth } from "./AuthContext.jsx";

const SettingsContext = createContext(null);

export const DEFAULT_SHOP_NAME_EN = "Mini Supermarket";
export const DEFAULT_SHOP_NAME_TA = "மினி சூப்பர்மார்க்கெட்";

const FALLBACK = {
  shopNameEn: DEFAULT_SHOP_NAME_EN,
  shopNameTa: DEFAULT_SHOP_NAME_TA,
  phone: "",
  addressEn: "",
  addressTa: "",
  gstin: "",
  logo: "",
  taglineEn: "",
  taglineTa: "",
  billFooterEn: "Thank you, visit again",
  billFooterTa: "நன்றி, மீண்டும் வருக",
};

function isStockShopName(value, language) {
  const text = (value || "").trim();
  if (!text) return true;
  if (language === "ta") return text === DEFAULT_SHOP_NAME_TA;
  return text === DEFAULT_SHOP_NAME_EN;
}

/**
 * Header / bill shop title from Settings → கடை பெயர்.
 * Prefers the active language, but skips the unused stock default when the
 * other language already has a custom name (e.g. English "MNB Mini Mart").
 */
export function shopDisplayName(settings, language = "en") {
  const en = (settings?.shopNameEn || "").trim();
  const ta = (settings?.shopNameTa || "").trim();
  const enStock = isStockShopName(en, "en");
  const taStock = isStockShopName(ta, "ta");

  if (language === "ta") {
    if (!taStock) return ta;
    if (!enStock) return en;
    return ta || en || DEFAULT_SHOP_NAME_EN;
  }

  if (!enStock) return en;
  if (!taStock) return ta;
  return en || ta || DEFAULT_SHOP_NAME_EN;
}

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(FALLBACK);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request.get("/settings");
      setSettings({ ...FALLBACK, ...data.settings });
    } catch {
      setSettings(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const applySettings = useCallback((next) => {
    setSettings((current) => ({ ...FALLBACK, ...current, ...next }));
  }, []);

  const value = useMemo(
    () => ({ settings, loading, reload: load, applySettings }),
    [settings, loading, load, applySettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside <SettingsProvider>");
  return context;
}

/** Shop name / address in the language currently selected. */
export function useShopIdentity() {
  const { settings } = useSettings();
  return settings;
}
