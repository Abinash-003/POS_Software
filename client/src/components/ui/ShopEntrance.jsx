import { useEffect, useState } from "react";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { useSettings, shopDisplayName } from "../../context/SettingsContext.jsx";
import { cn } from "../../lib/cn.js";
import { ShopLogo } from "./ShopLogo.jsx";

const ENTRANCE_KEY = "sm_shop_entrance";
const ENTRANCE_MS = 2200;

/** Call right after a successful login so the next screen can play the reveal. */
export function markShopEntrance({ name = "" } = {}) {
  try {
    sessionStorage.setItem(
      ENTRANCE_KEY,
      JSON.stringify({ name, at: Date.now() })
    );
  } catch {
    /* private mode / quota */
  }
}

function readEntrance() {
  try {
    const raw = sessionStorage.getItem(ENTRANCE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ENTRANCE_KEY);
    const data = JSON.parse(raw);
    if (!data?.at || Date.now() - data.at > 12_000) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Soft “shop doors opening” overlay. Plays once after login, then fades away.
 * Honours prefers-reduced-motion with a short fade only.
 */
export function ShopEntrance({ guestName, onDone }) {
  const { t, language } = useLanguage();
  const { settings } = useSettings();
  const [phase, setPhase] = useState("enter"); // enter → leave → done

  const shopName = shopDisplayName(settings, language) || t("app.name");
  const displayName = (guestName || "").trim();

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const leaveAt = reduced ? 500 : ENTRANCE_MS - 420;
    const doneAt = reduced ? 780 : ENTRANCE_MS;

    const leaveTimer = window.setTimeout(() => setPhase("leave"), leaveAt);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      onDone?.();
    }, doneAt);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  if (phase === "done") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden",
        phase === "leave" ? "shop-entrance-leave" : "shop-entrance-enter"
      )}
      role="status"
      aria-live="polite"
      aria-label={t("auth.openingShop")}
    >
      {/* Soft shop atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 50% 35%, #dfeffe 0%, #f0f8ff 42%, #ffffff 100%)",
        }}
      />

      {/* Sliding doors */}
      <div
        className="shop-door shop-door-left absolute inset-y-0 left-0 w-1/2"
        style={{
          background:
            "linear-gradient(90deg, #045ca0 0%, #0d91e8 55%, #43b0f6 100%)",
        }}
        aria-hidden="true"
      >
        <span className="shop-door-handle absolute right-4 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-white/70 shadow" />
      </div>
      <div
        className="shop-door shop-door-right absolute inset-y-0 right-0 w-1/2"
        style={{
          background:
            "linear-gradient(270deg, #045ca0 0%, #0d91e8 55%, #43b0f6 100%)",
        }}
        aria-hidden="true"
      >
        <span className="shop-door-handle absolute left-4 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-white/70 shadow" />
      </div>

      {/* Centre reveal */}
      <div className="shop-entrance-content relative z-10 flex max-w-sm flex-col items-center px-6 text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-[1.35rem] bg-brand-300/35" />
          <ShopLogo logo={settings.logo} size="lg" />
        </div>

        <p className="shop-entrance-title mt-5 font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
          {shopName}
        </p>
        <p className="shop-entrance-sub mt-1.5 text-sm font-medium text-ink-500">
          {displayName
            ? t("auth.welcomeBack", { name: displayName })
            : t("auth.openingShop")}
        </p>

        <div className="shop-entrance-bar mt-6 h-1 w-36 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full w-full origin-left rounded-full bg-brand-500 shop-entrance-progress" />
        </div>
      </div>
    </div>
  );
}

/** Wraps the authenticated app and plays the entrance once after login. */
export function ShopEntranceGate({ children }) {
  const [payload, setPayload] = useState(() => readEntrance());

  if (!payload) return children;

  return (
    <>
      {children}
      <ShopEntrance
        guestName={payload.name}
        onDone={() => setPayload(null)}
      />
    </>
  );
}
