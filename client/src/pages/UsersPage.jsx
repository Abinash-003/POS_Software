import { useEffect, useState } from "react";
import {
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUsers,
} from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useErrorToast } from "../hooks/useApiError.js";
import { request } from "../lib/apiClient.js";
import { formatDateTime, initials } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Input, PasswordInput, Select, Switch } from "../components/ui/Field.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { Modal } from "../components/ui/Modal.jsx";

const EMPTY = { username: "", name: "", password: "", role: "staff", active: true };

export function UsersPage() {
  const { t, language } = useLanguage();
  const { user: currentUser, refresh } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const showError = useErrorToast();

  const { data, error, isInitialLoading, refetch } = useFetch("/auth/users");

  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(editing?._id);
  const isSelf = isEdit && editing._id === currentUser?._id;

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            username: editing.username,
            name: editing.name || "",
            password: "",
            role: editing.role,
            active: editing.active,
          }
        : EMPTY
    );
    setErrors({});
    setSaving(false);
  }, [open, editing]);

  const set = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (form.username.trim().length < 3) next.username = t("users.usernameHint");
    if (!isEdit && form.password.length < 5) next.password = t("users.passwordHint");
    if (isEdit && form.password && form.password.length < 5) next.password = t("users.passwordHint");
    if (!form.name.trim()) next.name = t("common.required");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      if (isEdit) {
        await request.put(`/auth/users/${editing._id}`, {
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success(t("users.updated"), form.username.trim().toLowerCase());
        if (isSelf) refresh();
      } else {
        await request.post("/auth/users", {
          username: form.username.trim().toLowerCase(),
          name: form.name.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success(t("users.created"), form.username.trim().toLowerCase());
      }

      setOpen(false);
      refetch();
    } catch (requestError) {
      if (requestError.code === "duplicateUsername") {
        setErrors({ username: t("errors.duplicateUsername") });
      } else {
        showError(requestError);
      }
      setSaving(false);
    }
  };

  const remove = async (target) => {
    const ok = await confirm({
      title: t("common.delete"),
      message: t("users.deleteConfirm", { name: target.name || target.username }),
      confirmLabel: t("common.delete"),
    });
    if (!ok) return;

    try {
      await request.delete(`/auth/users/${target._id}`);
      toast.success(t("users.deleted"));
      refetch();
    } catch (requestError) {
      showError(requestError);
    }
  };

  const users = data?.users || [];
  const adminExists = users.some((row) => row.role === "admin" && row.active);
  const editingIsAdmin = isEdit && editing?.role === "admin";
  const canAssignAdmin = !adminExists || editingIsAdmin;

  return (
    <>
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        actions={
          <Button
            icon={HiOutlinePlus}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <span className="hidden sm:inline">{t("users.add")}</span>
            <span className="sm:hidden">{t("common.add")}</span>
          </Button>
        }
      />

      {isInitialLoading ? (
        <SkeletonRows count={3} withImage={false} />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <EmptyState icon={HiOutlineUsers} title={t("common.noData")} />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-100">
            {users.map((row) => {
              const self = row._id === currentUser?._id;
              return (
                <li key={row._id} className="flex items-center gap-3 p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-700">
                    {initials(row.name || row.username)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink-900">
                      {row.name || row.username}
                      {self ? <Badge tone="brand">{t("users.you")}</Badge> : null}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500 tabular">
                      @{row.username}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.role === "admin" ? "brand" : "neutral"}>
                        {t(row.role === "admin" ? "auth.admin" : "auth.staff")}
                      </Badge>
                      <Badge tone={row.active ? "success" : "danger"}>
                        {t(row.active ? "users.active" : "users.inactive")}
                      </Badge>
                      <span className="text-[11px] font-medium text-ink-400">
                        {row.lastLoginAt
                          ? formatDateTime(row.lastLoginAt, language)
                          : t("users.never")}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-0.5">
                    <IconButton
                      icon={HiOutlinePencilSquare}
                      label={t("common.edit")}
                      onClick={() => {
                        setEditing(row);
                        setOpen(true);
                      }}
                    />
                    {self ? null : (
                      <IconButton
                        icon={HiOutlineTrash}
                        label={t("common.delete")}
                        variant="dangerGhost"
                        onClick={() => remove(row)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Modal
        open={open}
        onClose={saving ? undefined : () => setOpen(false)}
        title={t(isEdit ? "users.edit" : "users.add")}
        subtitle={isEdit ? `@${editing.username}` : undefined}
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="user-form" className="flex-[2]" loading={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }
      >
        <form id="user-form" onSubmit={submit} className="space-y-4 p-4" noValidate>
          <Input
            label={t("users.username")}
            help={t("users.usernameHint")}
            value={form.username}
            onChange={set("username")}
            error={errors.username}
            autoCapitalize="none"
            autoComplete="off"
            required
            autoFocus={!isEdit}
          />

          <Input
            label={t("auth.name")}
            value={form.name}
            onChange={set("name")}
            error={errors.name}
            placeholder={t("settings.namePh")}
            required
          />

          <PasswordInput
            label={t(isEdit ? "users.newPassword" : "users.password")}
            help={t(isEdit ? "users.newPasswordHint" : "users.passwordHint")}
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            autoComplete="new-password"
            showLabel={t("auth.showPassword")}
            hideLabel={t("auth.hidePassword")}
            required={!isEdit}
          />

          <Select
            label={t("users.role")}
            value={form.role}
            onChange={set("role")}
            disabled={isSelf || (!canAssignAdmin && form.role !== "admin")}
            help={
              canAssignAdmin
                ? t(form.role === "admin" ? "users.roleHintAdmin" : "users.roleHintStaff")
                : t("users.onlyOneAdmin")
            }
          >
            <option value="staff">{t("auth.staff")}</option>
            {canAssignAdmin ? <option value="admin">{t("auth.admin")}</option> : null}
          </Select>

          {isEdit && !isSelf ? (
            <Switch
              label={t("users.active")}
              description={t("users.roleHintStaff")}
              checked={form.active}
              onChange={(active) => setForm((current) => ({ ...current, active }))}
            />
          ) : null}
        </form>
      </Modal>
    </>
  );
}
