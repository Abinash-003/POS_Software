import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineEllipsisHorizontal,
  HiOutlineXMark,
} from "react-icons/hi2";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSettings, shopDisplayName } from "../../context/SettingsContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useFetch } from "../../hooks/useFetch.js";
import { initials } from "../../lib/format.js";
import { cn } from "../../lib/cn.js";
import { LanguageToggle } from "./LanguageToggle.jsx";
import { BOTTOM_NAV, visibleSections } from "./navigation.js";
import { Modal } from "../ui/Modal.jsx";
import { Button } from "../ui/Button.jsx";
import { LoadingPanel } from "../ui/Spinner.jsx";
import { ShopLogo } from "../ui/ShopLogo.jsx";

function NavItem({ item, lowStockCount, onNavigate }) {
  const { t } = useLanguage();
  const badge = item.badge === "lowStock" && lowStockCount > 0 ? lowStockCount : null;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
          isActive
            ? "bg-ink-900 text-white shadow-float"
            : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
          {badge ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular",
                isActive ? "bg-white/20 text-white" : "bg-warn-100 text-warn-700"
              )}
            >
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function AccountRow({ compact }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const displayName = (user?.name || "").trim() || user?.username || t("auth.account");

  const signOut = async () => {
    const ok = await confirm({
      title: t("auth.logout"),
      message: t("auth.logoutConfirm"),
      confirmLabel: t("auth.logout"),
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    await logout();
    toast.info(t("auth.loggedOut"));
  };

  return (
    <div className={cn("flex items-center gap-2.5", compact ? "px-1" : "rounded-xl bg-ink-50 p-2.5")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-700">
        {initials(displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink-900">{displayName}</p>
        <p className="truncate text-[11px] font-medium text-ink-500">
          {t(user?.role === "admin" ? "auth.admin" : "auth.staff")}
          {user?.username ? ` · @${user.username}` : ""}
        </p>
      </div>
      <Button
        variant="ghost"
        size="iconSm"
        onClick={signOut}
        loading={busy}
        aria-label={t("auth.logout")}
        title={t("auth.logout")}
        className="text-ink-400 hover:text-danger-600"
      >
        {busy ? null : <HiOutlineArrowRightOnRectangle className="size-5" aria-hidden="true" />}
      </Button>
    </div>
  );
}

export function AppLayout() {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: alerts } = useFetch("/products/alerts/low-stock");
  const lowStockCount = (alerts?.lowCount || 0) + (alerts?.outCount || 0);

  const sections = visibleSections(isAdmin);
  const shopName = shopDisplayName(settings, language);
  const shopTagline = (
    (language === "ta"
      ? settings.taglineTa || settings.taglineEn
      : settings.taglineEn || settings.taglineTa) || ""
  ).trim();

  // Close the sheet only — do not window.scrollTo (that was jumping the fixed nav).
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const bottomPaths = new Set(BOTTOM_NAV.map((item) => item.to));
  const moreIsActive = !bottomPaths.has(location.pathname);

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="print-hidden sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <ShopLogo logo={settings.logo} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-ink-900">{shopName}</p>
            {shopTagline ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-ink-500">
                {shopTagline}
              </p>
            ) : null}
          </div>
        </div>

        <nav className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {sections.map((section) => (
            <div key={section.id}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                {t(section.labelKey)}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem key={item.to} item={item} lowStockCount={lowStockCount} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2.5 border-t border-ink-100 p-3">
          <LanguageToggle className="w-full justify-center" />
          <AccountRow />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-hidden sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center gap-2.5 px-3.5">
            <ShopLogo logo={settings.logo} size="sm" />
            <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-tight text-ink-900">{shopName}</p>
            <LanguageToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3.5 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-5 lg:px-7 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<LoadingPanel label={t("common.loading")} />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        {/*
          Labels must sit above the iOS home-indicator. Safe-area is padding on
          the nav — never shrink the icon+label row with a fixed height.
        */}
        <nav className="print-hidden fixed inset-x-0 bottom-0 z-50 border-t border-ink-100 bg-white/95 backdrop-blur lg:hidden safe-bottom">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {BOTTOM_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn("bottom-nav-item", isActive ? "text-brand-700" : "text-ink-400")
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-xl",
                        isActive ? "bg-brand-100 text-brand-700" : "bg-transparent text-current"
                      )}
                    >
                      <item.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="bottom-nav-label">{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn("bottom-nav-item", moreIsActive ? "text-brand-700" : "text-ink-400")}
              aria-label={t("common.openMenu")}
            >
              <span
                className={cn(
                  "relative grid size-8 shrink-0 place-items-center rounded-xl",
                  moreIsActive ? "bg-brand-100 text-brand-700" : "bg-transparent text-current"
                )}
              >
                <HiOutlineEllipsisHorizontal className="size-5" aria-hidden="true" />
                {lowStockCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-warn-500 ring-2 ring-white" />
                ) : null}
              </span>
              <span className="bottom-nav-label">{t("nav.more")}</span>
            </button>
          </div>
        </nav>

        <Modal
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          title={t("nav.more")}
          size="md"
          bodyClassName="p-3.5"
        >
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  {t(section.labelKey)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const badge =
                      item.badge === "lowStock" && lowStockCount > 0 ? lowStockCount : null;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-xl border p-3 text-[13px] font-semibold transition",
                            isActive
                              ? "border-brand-300 bg-brand-50 text-brand-700"
                              : "border-ink-100 bg-white text-ink-700 hover:border-brand-200 hover:bg-brand-50/50"
                          )
                        }
                      >
                        <item.icon className="size-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                        {badge ? (
                          <span className="rounded-full bg-warn-100 px-1.5 py-0.5 text-[10px] font-bold text-warn-700 tabular">
                            {badge}
                          </span>
                        ) : null}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-2.5 border-t border-ink-100 pt-3.5">
              <LanguageToggle variant="full" />
              <AccountRow />
            </div>

            <Button
              variant="ghost"
              icon={HiOutlineXMark}
              className="w-full"
              onClick={() => setMoreOpen(false)}
            >
              {t("common.close")}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
