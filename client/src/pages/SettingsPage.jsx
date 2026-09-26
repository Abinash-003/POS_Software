import { useEffect, useState } from "react";
import {
  HiOutlineBuildingStorefront,
  HiOutlineCheck,
  HiOutlineInformationCircle,
  HiOutlineKey,
  HiOutlineLanguage,
  HiOutlineLockClosed,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useErrorToast } from "../hooks/useApiError.js";
import { request, sendForm } from "../lib/apiClient.js";
import { formatDateTime, initials } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, PasswordInput } from "../components/ui/Field.jsx";
import { BilingualFields } from "../components/ui/BilingualFields.jsx";
import { ImagePicker } from "../components/ui/ImagePicker.jsx";
import { LanguageToggle } from "../components/layout/LanguageToggle.jsx";

const APP_VERSION = "1.0.0";

export function SettingsPage() {
  const { t, language } = useLanguage();
  const { user, isAdmin, refresh } = useAuth();
  const { settings, applySettings } = useSettings();
  const toast = useToast();
  const showError = useErrorToast();

  const [form, setForm] = useState(settings);
  const [file, setFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  const [account, setAccount] = useState({
    name: "",
    username: "",
    password: "",
    confirm: "",
  });
  const [accountErrors, setAccountErrors] = useState({});
  const [accountSaving, setAccountSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (!user) return;
    setAccount({
      name: user.name || "",
      username: user.username || "",
      password: "",
      confirm: "",
    });
    setAccountErrors({});
  }, [user]);

  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const setAccountField = (field) => (event) => {
    setAccount((current) => ({ ...current, [field]: event.target.value }));
    setAccountErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await sendForm("/settings", {
        method: "put",
        fields: {
          shopNameEn: form.shopNameEn,
          shopNameTa: form.shopNameTa,
          phone: form.phone,
          addressEn: form.addressEn,
          addressTa: form.addressTa,
          gstin: form.gstin,
          taglineEn: form.taglineEn,
          taglineTa: form.taglineTa,
          billFooterEn: form.billFooterEn,
          billFooterTa: form.billFooterTa,
          removeLogo,
        },
        file,
      });

      applySettings(data.settings);
      setFile(null);
      setRemoveLogo(false);
      toast.success(t("settings.saved"));
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    if (!isAdmin || !user?._id) return;

    const next = {};
    if (!account.name.trim()) next.name = t("common.required");
    if (account.username.trim().length < 3) next.username = t("users.usernameHint");
    if (account.password) {
      if (account.password.length < 5) next.password = t("users.passwordHint");
      if (account.password !== account.confirm) next.confirm = t("settings.passwordMismatch");
    }
    setAccountErrors(next);
    if (Object.keys(next).length > 0) return;

    setAccountSaving(true);
    try {
      await request.put(`/auth/users/${user._id}`, {
        name: account.name.trim(),
        username: account.username.trim().toLowerCase(),
        ...(account.password ? { password: account.password } : {}),
      });
      await refresh();
      setAccount((current) => ({ ...current, password: "", confirm: "" }));
      toast.success(t("settings.accountSaved"));
    } catch (error) {
      if (error.code === "duplicateUsername") {
        setAccountErrors({ username: t("errors.duplicateUsername") });
      } else {
        showError(error);
      }
    } finally {
      setAccountSaving(false);
    }
  };

  const displayName = (user?.name || "").trim() || user?.username || t("auth.account");

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader
              title={t("settings.language")}
              subtitle={t("settings.languageHint")}
              icon={HiOutlineLanguage}
            />
            <div className="p-4">
              <LanguageToggle variant="full" />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t("settings.shop")}
              subtitle={t("settings.shopHint")}
              icon={HiOutlineBuildingStorefront}
            />
            <form onSubmit={submit} className="space-y-4 p-4">
              {!isAdmin ? (
                <p className="rounded-xl bg-ink-50 px-3 py-2.5 text-xs font-medium text-ink-600">
                  {t("settings.adminOnly")}
                </p>
              ) : null}

              <fieldset disabled={!isAdmin} className="space-y-4 disabled:opacity-70">
                <BilingualFields
                  enLabel={t("settings.shopNameEn")}
                  taLabel={t("settings.shopNameTa")}
                  enValue={form.shopNameEn || ""}
                  taValue={form.shopNameTa || ""}
                  onEnChange={(value) => setForm((current) => ({ ...current, shopNameEn: value }))}
                  onTaChange={(value) => setForm((current) => ({ ...current, shopNameTa: value }))}
                />

                <BilingualFields
                  enLabel={t("settings.taglineEn")}
                  taLabel={t("settings.taglineTa")}
                  enValue={form.taglineEn || ""}
                  taValue={form.taglineTa || ""}
                  onEnChange={(value) => setForm((current) => ({ ...current, taglineEn: value }))}
                  onTaChange={(value) => setForm((current) => ({ ...current, taglineTa: value }))}
                  enPlaceholder={t("settings.taglineEnPh")}
                  taPlaceholder={t("settings.taglineTaPh")}
                  enHelp={t("settings.taglineHint")}
                  taHelp={t("settings.taglineHint")}
                />

                <Input label={t("settings.phone")} value={form.phone || ""} onChange={set("phone")} />

                <BilingualFields
                  enLabel={t("settings.addressEn")}
                  taLabel={t("settings.addressTa")}
                  enValue={form.addressEn || ""}
                  taValue={form.addressTa || ""}
                  onEnChange={(value) => setForm((current) => ({ ...current, addressEn: value }))}
                  onTaChange={(value) => setForm((current) => ({ ...current, addressTa: value }))}
                  multiline
                  rows={2}
                />

                <Input label={t("settings.gstin")} value={form.gstin || ""} onChange={set("gstin")} />

                <ImagePicker
                  label={t("settings.logo")}
                  value={removeLogo ? null : form.logo}
                  file={file}
                  onFileChange={setFile}
                  onRemoveChange={setRemoveLogo}
                />

                <BilingualFields
                  enLabel={t("settings.billFooterEn")}
                  taLabel={t("settings.billFooterTa")}
                  enValue={form.billFooterEn || ""}
                  taValue={form.billFooterTa || ""}
                  onEnChange={(value) => setForm((current) => ({ ...current, billFooterEn: value }))}
                  onTaChange={(value) => setForm((current) => ({ ...current, billFooterTa: value }))}
                />
              </fieldset>

              {isAdmin ? (
                <Button type="submit" icon={HiOutlineCheck} loading={saving} className="w-full sm:w-auto">
                  {saving ? t("common.saving") : t("common.saveChanges")}
                </Button>
              ) : null}
            </form>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={t("settings.account")} icon={HiOutlineUserCircle} />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-700">
                  {initials(displayName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink-900">{displayName}</p>
                  <p className="truncate text-xs font-medium text-ink-500 tabular">
                    @{user?.username}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-medium text-ink-500">{t("auth.role")}</dt>
                  <dd>
                    <Badge tone={isAdmin ? "brand" : "neutral"} icon={HiOutlineLockClosed}>
                      {t(isAdmin ? "auth.admin" : "auth.staff")}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-medium text-ink-500">{t("users.lastLogin")}</dt>
                  <dd className="text-xs font-semibold text-ink-800">
                    {user?.lastLoginAt
                      ? formatDateTime(user.lastLoginAt, language)
                      : t("users.never")}
                  </dd>
                </div>
              </dl>

              {isAdmin ? (
                <form onSubmit={saveAccount} className="mt-5 space-y-3 border-t border-ink-100 pt-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-800">
                    <HiOutlineKey className="size-4 text-brand-600" aria-hidden="true" />
                    {t("settings.editCredentials")}
                  </div>
                  <p className="text-[11px] leading-snug text-ink-500">
                    {t("settings.credentialsHint")}
                  </p>

                  <Input
                    label={t("auth.name")}
                    value={account.name}
                    onChange={setAccountField("name")}
                    error={accountErrors.name}
                    placeholder={t("settings.namePh")}
                    required
                  />
                  <Input
                    label={t("auth.username")}
                    value={account.username}
                    onChange={setAccountField("username")}
                    error={accountErrors.username}
                    autoCapitalize="none"
                    autoComplete="username"
                    required
                  />
                  <PasswordInput
                    label={t("users.newPassword")}
                    help={t("users.newPasswordHint")}
                    value={account.password}
                    onChange={setAccountField("password")}
                    error={accountErrors.password}
                    autoComplete="new-password"
                    showLabel={t("auth.showPassword")}
                    hideLabel={t("auth.hidePassword")}
                  />
                  {account.password ? (
                    <PasswordInput
                      label={t("settings.confirmPassword")}
                      value={account.confirm}
                      onChange={setAccountField("confirm")}
                      error={accountErrors.confirm}
                      autoComplete="new-password"
                      showLabel={t("auth.showPassword")}
                      hideLabel={t("auth.hidePassword")}
                    />
                  ) : null}

                  <Button type="submit" className="w-full" loading={accountSaving}>
                    {accountSaving ? t("common.saving") : t("settings.saveAccount")}
                  </Button>
                </form>
              ) : (
                <p className="mt-4 rounded-xl bg-ink-50 px-3 py-2.5 text-xs font-medium text-ink-600">
                  {t("settings.staffAccountHint")}
                </p>
              )}

              {isAdmin ? (
                <Button variant="outline" className="mt-4 w-full" to="/users">
                  {t("users.title")}
                </Button>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.about")} icon={HiOutlineInformationCircle} />
            <div className="p-4">
              <p className="text-sm leading-relaxed text-ink-600">{t("settings.aboutText")}</p>
              <dl className="mt-3.5 flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
                <dt className="text-xs font-medium text-ink-500">{t("settings.version")}</dt>
                <dd className="text-xs font-bold tabular text-ink-800">{APP_VERSION}</dd>
              </dl>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
