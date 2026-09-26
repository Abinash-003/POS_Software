import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  HiOutlineArrowRight,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCube,
  HiOutlineLockClosed,
  HiOutlineShoppingCart,
  HiOutlineUser,
} from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useErrorMessage } from "../hooks/useApiError.js";
import { markShopEntrance } from "../components/ui/ShopEntrance.jsx";
import { LanguageToggle } from "../components/layout/LanguageToggle.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, PasswordInput } from "../components/ui/Field.jsx";

const HIGHLIGHTS = [
  { icon: HiOutlineShoppingCart, key: "auth.highlightSale" },
  { icon: HiOutlineCube, key: "auth.highlightStock" },
  { icon: HiOutlineChartBar, key: "auth.highlightReports" },
  { icon: HiOutlineClipboardDocumentCheck, key: "auth.highlightBills" },
];

export function LoginPage() {
  const { t } = useLanguage();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const describe = useErrorMessage();
  const location = useLocation();

  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = t("common.required");
    if (!form.password) nextErrors.password = t("common.required");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login({
        username: form.username.trim().toLowerCase(),
        password: form.password,
      });
      markShopEntrance({ name: user.name || user.username || "" });
      toast.success(t("auth.loggedIn"), `${t("auth.welcome")}, ${user.name || user.username}`);
    } catch (error) {
      const { title } = describe(error);
      toast.error(title);
      setErrors({ password: error.code === "invalidLogin" ? t("errors.invalidLogin") : undefined });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* --------------------------- brand panel (desktop) -------------------------- */}
      <aside className="relative hidden overflow-hidden bg-ink-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 420px at 12% 8%, rgba(13,145,232,0.45), transparent 60%), radial-gradient(560px 360px at 90% 88%, rgba(255,255,255,0.08), transparent 55%)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="shop-logo-3d shop-logo-float relative inline-grid size-12 shrink-0 place-items-center">
              <span className="shop-logo-3d-glow" />
              <span className="shop-logo-3d-face">
                <span className="shop-logo-3d-fallback">
                  <HiOutlineShoppingCart className="size-[55%]" aria-hidden="true" />
                </span>
                <span className="shop-logo-3d-gloss" />
                <span className="shop-logo-3d-rim" />
              </span>
            </span>
            <div>
              <p className="font-display text-lg font-bold tracking-tight">{t("app.name")}</p>
              <p className="text-sm text-white/65">{t("app.tagline")}</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md font-display text-4xl font-bold leading-tight tracking-tight">
            {t("auth.loginHero")}
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
            {t("auth.loginHeroSub")}
          </p>
        </div>

        <ul className="relative mt-10 grid gap-3">
          {HIGHLIGHTS.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-brand-500/25 text-brand-100">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-white/90">{t(key)}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* -------------------------------- form panel -------------------------------- */}
      <div className="relative flex min-h-dvh flex-col bg-white">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, #045ca0 0%, #0d91e8 48%, transparent 100%)",
          }}
        />

        <div className="relative flex justify-end p-3.5">
          <LanguageToggle />
        </div>

        <div className="relative flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-sm animate-slide-up">
            <div className="text-center lg:text-left">
              <span className="mx-auto inline-flex lg:mx-0">
                <span className="shop-logo-3d shop-logo-float relative inline-grid size-14 shrink-0 place-items-center">
                  <span className="shop-logo-3d-glow" />
                  <span className="shop-logo-3d-face">
                    <span className="shop-logo-3d-fallback">
                      <HiOutlineShoppingCart className="size-[55%]" aria-hidden="true" />
                    </span>
                    <span className="shop-logo-3d-gloss" />
                    <span className="shop-logo-3d-rim" />
                  </span>
                </span>
              </span>
              <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">
                {t("auth.loginTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-ink-500">{t("auth.loginSub")}</p>
            </div>

            <form
              onSubmit={submit}
              className="mt-6 space-y-4 rounded-[1.25rem] border border-ink-100 bg-white p-5 shadow-card"
              noValidate
            >
              <Input
                label={t("auth.username")}
                placeholder={t("auth.usernamePh")}
                icon={HiOutlineUser}
                value={form.username}
                onChange={update("username")}
                error={errors.username}
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
              />

              <PasswordInput
                label={t("auth.password")}
                placeholder={t("auth.passwordPh")}
                icon={HiOutlineLockClosed}
                value={form.password}
                onChange={update("password")}
                error={errors.password}
                autoComplete="current-password"
                showLabel={t("auth.showPassword")}
                hideLabel={t("auth.hidePassword")}
                required
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={submitting}
                iconRight={HiOutlineArrowRight}
              >
                {submitting ? t("auth.loggingIn") : t("auth.loginBtn")}
              </Button>

              <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-center text-xs font-medium text-brand-700">
                {t("auth.defaultHint")}
              </p>
            </form>

            <p className="mt-5 text-center text-xs text-ink-400 lg:text-left">
              {t("app.name")} · {t("app.tagline")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
