import { useEffect, useState } from "react";
import {
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineTrash,
} from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useErrorToast } from "../hooks/useApiError.js";
import { request } from "../lib/apiClient.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { BilingualFields } from "../components/ui/BilingualFields.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { Modal } from "../components/ui/Modal.jsx";

export function CategoriesPage() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
  const showError = useErrorToast();

  const { data, error, isInitialLoading, refetch } = useFetch("/categories");

  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nameEn: "", nameTa: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(editing?._id);

  useEffect(() => {
    if (!open) return;
    setForm({ nameEn: editing?.nameEn || "", nameTa: editing?.nameTa || "" });
    setErrors({});
    setSaving(false);
  }, [open, editing]);

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (!form.nameEn.trim()) next.nameEn = t("common.required");
    if (!form.nameTa.trim()) next.nameTa = t("common.required");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = { nameEn: form.nameEn.trim(), nameTa: form.nameTa.trim() };
      if (isEdit) await request.put(`/categories/${editing._id}`, payload);
      else await request.post("/categories", payload);

      toast.success(t(isEdit ? "categories.updated" : "categories.added"), payload.nameEn);
      setOpen(false);
      refetch();
    } catch (requestError) {
      if (requestError.code === "duplicateCategory") {
        setErrors({ nameEn: t("errors.duplicateCategory") });
      } else {
        showError(requestError);
      }
      setSaving(false);
    }
  };

  const remove = async (category) => {
    const ok = await confirm({
      title: t("common.delete"),
      message: t("categories.deleteConfirm", {
        name: language === "ta" ? category.nameTa : category.nameEn,
        count: category.productCount,
      }),
      confirmLabel: t("common.delete"),
    });
    if (!ok) return;

    try {
      await request.delete(`/categories/${category._id}`);
      toast.success(t("categories.deleted"));
      refetch();
    } catch (requestError) {
      showError(requestError);
    }
  };

  const categories = data?.categories || [];

  return (
    <>
      <PageHeader
        title={t("categories.title")}
        subtitle={t("categories.subtitle")}
        actions={
          <Button
            icon={HiOutlinePlus}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <span className="hidden sm:inline">{t("categories.add")}</span>
            <span className="sm:hidden">{t("common.add")}</span>
          </Button>
        }
      />

      {isInitialLoading ? (
        <SkeletonRows count={6} withImage={false} />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={HiOutlineSquares2X2}
            title={t("categories.none")}
            description={t("categories.noneSub")}
            action={
              <Button
                icon={HiOutlinePlus}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                {t("categories.add")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category._id} className="flex items-center gap-3 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <HiOutlineSquares2X2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-900">
                  {language === "ta" ? category.nameTa : category.nameEn}
                </p>
                <p className="truncate text-[11px] font-medium text-ink-400">
                  {language === "ta" ? category.nameEn : category.nameTa}
                </p>
              </div>
              <Badge tone="neutral">{category.productCount}</Badge>
              <div className="flex shrink-0 gap-0.5">
                <IconButton
                  icon={HiOutlinePencilSquare}
                  label={t("common.edit")}
                  onClick={() => {
                    setEditing(category);
                    setOpen(true);
                  }}
                />
                <IconButton
                  icon={HiOutlineTrash}
                  label={t("common.delete")}
                  variant="dangerGhost"
                  onClick={() => remove(category)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={saving ? undefined : () => setOpen(false)}
        title={t(isEdit ? "categories.edit" : "categories.add")}
        size="sm"
        footer={
          <div className="flex gap-2.5">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="category-form" className="flex-[2]" loading={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }
      >
        <form id="category-form" onSubmit={submit} className="space-y-4 p-4" noValidate>
          <BilingualFields
            enLabel={t("categories.nameEn")}
            taLabel={t("categories.nameTa")}
            enValue={form.nameEn}
            taValue={form.nameTa}
            onEnChange={(value) => {
              setForm((current) => ({ ...current, nameEn: value }));
              setErrors((current) => ({ ...current, nameEn: undefined }));
            }}
            onTaChange={(value) => {
              setForm((current) => ({ ...current, nameTa: value }));
              setErrors((current) => ({ ...current, nameTa: undefined }));
            }}
            enError={errors.nameEn}
            taError={errors.nameTa}
            required
            className="sm:grid-cols-1"
          />
        </form>
      </Modal>
    </>
  );
}
