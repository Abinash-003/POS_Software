import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useDebounced } from "../hooks/useDebounced.js";
import { useErrorToast } from "../hooks/useApiError.js";
import { request, sendForm, assetUrl } from "../lib/apiClient.js";
import { money, formatDate, toInputDate } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Input, MoneyInput, Select, Textarea } from "../components/ui/Field.jsx";
import { ImagePicker } from "../components/ui/ImagePicker.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { ProgressBar } from "../components/ui/Spinner.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { RangeFilter, rangeParams } from "../components/filters/RangeFilter.jsx";

const CATEGORIES = ["electricity", "rent", "transport", "staff", "maintenance", "other"];

const EMPTY = { name: "", amount: "", category: "other", notes: "" };

function ExpenseFormModal({ open, expense, onClose, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const showError = useErrorToast();

  const [form, setForm] = useState({ ...EMPTY, date: toInputDate() });
  const [file, setFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(expense?._id);

  useEffect(() => {
    if (!open) return;
    setForm(
      expense
        ? {
            name: expense.name || "",
            amount: String(expense.amount ?? ""),
            category: expense.category || "other",
            notes: expense.notes || "",
            date: toInputDate(expense.date),
          }
        : { ...EMPTY, date: toInputDate() }
    );
    setFile(null);
    setRemoveImage(false);
    setErrors({});
    setSaving(false);
  }, [open, expense]);

  const set = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (!form.name.trim()) next.name = t("common.required");
    if (!form.amount || Number(form.amount) <= 0) next.amount = t("errors.positive");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await sendForm(isEdit ? `/expenses/${expense._id}` : "/expenses", {
        method: isEdit ? "put" : "post",
        fields: {
          name: form.name.trim(),
          amount: Number(form.amount),
          category: form.category,
          date: form.date,
          notes: form.notes.trim(),
          ...(isEdit ? { removeImage } : {}),
        },
        file,
      });

      toast.success(t(isEdit ? "expenses.updated" : "expenses.added"), form.name.trim());
      onSaved?.();
      onClose();
    } catch (error) {
      showError(error);
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={t(isEdit ? "expenses.edit" : "expenses.add")}
      size="md"
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="expense-form" className="flex-[2]" loading={saving}>
            {saving ? t("common.saving") : t(isEdit ? "common.saveChanges" : "common.add")}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4 p-4 sm:p-5" noValidate>
        <Input
          label={t("expenses.name")}
          placeholder={t("expenses.namePh")}
          value={form.name}
          onChange={set("name")}
          error={errors.name}
          required
          autoFocus
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput
            label={t("expenses.amount")}
            value={form.amount}
            onChange={set("amount")}
            error={errors.amount}
            required
          />
          <Select label={t("expenses.category")} value={form.category} onChange={set("category")}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`expenseCats.${category}`)}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label={t("expenses.date")}
          type="date"
          value={form.date}
          onChange={set("date")}
        />

        <Textarea
          label={t("common.notes")}
          placeholder={t("common.notesPh")}
          value={form.notes}
          onChange={set("notes")}
          rows={2}
        />

        <ImagePicker
          label={t("expenses.receipt")}
          value={expense?.receiptImage}
          onFileChange={setFile}
          onRemoveChange={setRemoveImage}
        />
      </form>
    </Modal>
  );
}

export function ExpensesPage() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
  const showError = useErrorToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [range, setRange] = useState({ range: "month", from: "", to: "" });
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const debouncedSearch = useDebounced(search);
  const params = useMemo(
    () => ({
      ...rangeParams(range),
      ...(category ? { category } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    }),
    [range, category, debouncedSearch]
  );

  const { data, error, isInitialLoading, refreshing, refetch } = useFetch("/expenses", params);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const remove = async (expense) => {
    const ok = await confirm({
      title: t("common.delete"),
      message: t("expenses.deleteConfirm", { name: expense.name }),
      confirmLabel: t("common.delete"),
    });
    if (!ok) return;

    try {
      await request.delete(`/expenses/${expense._id}`);
      toast.success(t("expenses.deleted"), expense.name);
      refetch();
    } catch (requestError) {
      showError(requestError);
    }
  };

  const expenses = data?.expenses || [];
  const summary = data?.summary;

  return (
    <>
      <PageHeader
        title={t("expenses.title")}
        subtitle={t("expenses.subtitle")}
        actions={
          <Button
            icon={HiOutlinePlus}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <span className="hidden sm:inline">{t("expenses.add")}</span>
            <span className="sm:hidden">{t("common.add")}</span>
          </Button>
        }
      >
        <div className="space-y-2.5">
          <RangeFilter value={range} onChange={setRange} />
          <div className="flex gap-2.5">
            <Input
              className="flex-1"
              icon={HiOutlineMagnifyingGlass}
              placeholder={t("common.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              aria-label={t("common.search")}
            />
            <Select
              className="w-36 shrink-0 sm:w-44"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label={t("expenses.category")}
            >
              <option value="">{t("common.all")}</option>
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {t(`expenseCats.${option}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </PageHeader>

      {summary ? (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <StatCard
            label={t("expenses.totalToday")}
            value={money(summary.today, { compact: true })}
            icon={HiOutlineCalendarDays}
            tone="warning"
          />
          <StatCard
            label={t("expenses.totalMonth")}
            value={money(summary.month, { compact: true })}
            icon={HiOutlineBanknotes}
            tone="brand"
          />
          <StatCard
            label={t("expenses.totalPeriod")}
            value={money(summary.filtered, { compact: true })}
            tone="neutral"
          />
        </div>
      ) : null}

      {summary && summary.byCategory.length > 0 ? (
        <Card className="mb-4">
          <CardHeader title={t("expenses.byCategory")} icon={HiOutlineBanknotes} />
          <div className="flex flex-wrap gap-2 p-3.5">
            {summary.byCategory.map((row) => (
              <span
                key={row.category}
                className="inline-flex items-center gap-2 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-700"
              >
                {t(`expenseCats.${row.category}`)}
                <span className="tabular text-brand-700">{money(row.amount)}</span>
                <span className="rounded-full bg-white px-1.5 text-[10px] tabular text-ink-500">
                  {row.count}
                </span>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {refreshing ? <ProgressBar className="mb-3" /> : null}

      {isInitialLoading ? (
        <SkeletonRows count={6} withImage={false} />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={HiOutlineBanknotes}
            title={t("expenses.none")}
            description={t("expenses.noneSub")}
            action={
              <Button
                icon={HiOutlinePlus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                {t("expenses.add")}
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-100">
            {expenses.map((expense) => (
              <li key={expense._id} className="flex items-center gap-3 p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warn-50 text-warn-600">
                  <HiOutlineBanknotes className="size-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink-900">{expense.name}</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                    {formatDate(expense.date, language)}
                    {expense.notes ? ` · ${expense.notes}` : ""}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge tone="neutral">{t(`expenseCats.${expense.category}`)}</Badge>
                    {expense.receiptImage ? (
                      <button
                        type="button"
                        onClick={() => setReceipt(expense)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
                      >
                        <HiOutlinePhoto className="size-3.5" aria-hidden="true" />
                        {t("expenses.receipt")}
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="shrink-0 text-[15px] font-bold tabular text-ink-900">
                  {money(expense.amount)}
                </p>

                <div className="flex shrink-0 flex-col gap-1">
                  <IconButton
                    icon={HiOutlinePencilSquare}
                    label={t("common.edit")}
                    onClick={() => {
                      setEditing(expense);
                      setFormOpen(true);
                    }}
                  />
                  <IconButton
                    icon={HiOutlineTrash}
                    label={t("common.delete")}
                    variant="dangerGhost"
                    onClick={() => remove(expense)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ExpenseFormModal
        open={formOpen}
        expense={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title={receipt?.name}
        subtitle={t("expenses.receipt")}
        size="md"
      >
        {receipt ? (
          <div className="p-4">
            <img
              src={assetUrl(receipt.receiptImage)}
              alt={t("expenses.receipt")}
              className="mx-auto max-h-[70vh] w-auto rounded-xl border border-ink-100"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
