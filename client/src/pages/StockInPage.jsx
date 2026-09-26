import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineInboxArrowDown,
  HiOutlinePlusCircle,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useErrorToast } from "../hooks/useApiError.js";
import { sendForm } from "../lib/apiClient.js";
import { money, quantity, formatDateTime, toInputDate } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, MoneyInput, Select, Textarea } from "../components/ui/Field.jsx";
import { ImagePicker, ProductThumb } from "../components/ui/ImagePicker.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";

const EMPTY = { product: "", quantity: "", purchasePrice: "", supplier: "", notes: "" };

export function StockInPage() {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const showError = useErrorToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [form, setForm] = useState({ ...EMPTY, date: toInputDate() });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const { data: productData } = useFetch("/products", { limit: 1000 });
  const {
    data: historyData,
    error: historyError,
    isInitialLoading: historyLoading,
    refetch: refetchHistory,
  } = useFetch("/purchases", { limit: 40 });

  const products = useMemo(() => productData?.products || [], [productData]);

  // Deep link from the low stock alerts: /stock-in?product=<id>
  useEffect(() => {
    const preselected = searchParams.get("product");
    if (!preselected) return;
    setForm((current) => ({ ...current, product: preselected }));
    searchParams.delete("product");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const selected = useMemo(
    () => products.find((product) => product._id === form.product) || null,
    [products, form.product]
  );

  const estimatedCost = useMemo(() => {
    const unitPrice =
      form.purchasePrice !== "" ? Number(form.purchasePrice) : selected?.purchasePrice || 0;
    return (Number(form.quantity) || 0) * (Number(unitPrice) || 0);
  }, [form.purchasePrice, form.quantity, selected]);

  const set = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (!form.product) next.product = t("common.required");
    if (!form.quantity || Number(form.quantity) <= 0) next.quantity = t("errors.invalidQty");
    if (form.purchasePrice !== "" && Number(form.purchasePrice) < 0) {
      next.purchasePrice = t("errors.positive");
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const result = await sendForm("/purchases", {
        fields: {
          product: form.product,
          quantity: Number(form.quantity),
          ...(form.purchasePrice !== "" ? { purchasePrice: Number(form.purchasePrice) } : {}),
          supplier: form.supplier.trim(),
          notes: form.notes.trim(),
          date: form.date,
        },
        file,
      });

      toast.success(
        t("stockIn.success", {
          old: quantity(result.oldStock),
          new: quantity(result.newStock),
        }),
        localName(result.purchase.product || {}, language)
      );

      setForm({ ...EMPTY, date: toInputDate() });
      setFile(null);
      setFormKey((key) => key + 1);
      refetchHistory();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const purchases = historyData?.purchases || [];
  const summary = historyData?.summary;

  return (
    <>
      <PageHeader title={t("stockIn.title")} subtitle={t("stockIn.subtitle")} />

      {summary ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t("stockIn.spend")}
            value={money(summary.cost)}
            icon={HiOutlineBanknotes}
            tone="warning"
          />
          <StatCard
            label={t("stockIn.purchasedUnits")}
            value={quantity(summary.units)}
            icon={HiOutlineCube}
            tone="brand"
          />
          <StatCard
            label={t("stockIn.history")}
            value={summary.count}
            icon={HiOutlineClock}
            tone="neutral"
            className="col-span-2 lg:col-span-2"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* --------------------------------- form --------------------------------- */}
        <div className="lg:col-span-2">
          {isAdmin ? (
            <Card className="lg:sticky lg:top-4">
              <CardHeader title={t("stockIn.title")} icon={HiOutlineInboxArrowDown} />
              <form onSubmit={submit} className="space-y-4 p-4" noValidate>
                <Select
                  label={t("stockIn.product")}
                  value={form.product}
                  onChange={set("product")}
                  error={errors.product}
                  required
                >
                  <option value="">{t("stockIn.selectProduct")}</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {localName(product, language)} · {product.sku}
                    </option>
                  ))}
                </Select>

                {selected ? (
                  <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 animate-slide-down">
                    <ProductThumb image={selected.image} name={localName(selected, language)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink-900">
                        {localName(selected, language)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-ink-500">
                        {t("products.purchasePrice")} {money(selected.purchasePrice)}
                      </p>
                    </div>
                    <Badge tone={selected.stock <= 0 ? "danger" : "brand"}>
                      {quantity(selected.stock)} {t(`units.short.${selected.unit}`)}
                    </Badge>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={t("stockIn.quantity")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.quantity}
                    onChange={set("quantity")}
                    error={errors.quantity}
                    suffix={selected ? t(`units.short.${selected.unit}`) : undefined}
                    required
                  />
                  <MoneyInput
                    label={t("stockIn.purchasePrice")}
                    value={form.purchasePrice}
                    onChange={set("purchasePrice")}
                    error={errors.purchasePrice}
                    help={t("stockIn.priceHint")}
                  />
                </div>

                {estimatedCost > 0 ? (
                  <div className="flex items-baseline justify-between rounded-xl bg-ink-50 px-3 py-2.5 animate-slide-down">
                    <span className="text-[13px] font-semibold text-ink-600">
                      {t("stockIn.totalCost")}
                    </span>
                    <span className="text-lg font-bold tabular text-brand-700">
                      {money(estimatedCost)}
                    </span>
                  </div>
                ) : null}

                <Input
                  label={t("stockIn.supplier")}
                  placeholder={t("stockIn.supplierPh")}
                  value={form.supplier}
                  onChange={set("supplier")}
                />

                <Input
                  label={t("stockIn.date")}
                  type="date"
                  value={form.date}
                  max={toInputDate()}
                  onChange={set("date")}
                />

                <Textarea
                  label={t("common.notes")}
                  placeholder={t("stockIn.notesPh")}
                  value={form.notes}
                  onChange={set("notes")}
                  rows={2}
                />

                <ImagePicker
                  key={formKey}
                  label={t("stockIn.invoice")}
                  onFileChange={setFile}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  icon={HiOutlinePlusCircle}
                  loading={saving}
                >
                  {saving ? t("common.saving") : t("stockIn.submit")}
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={HiOutlineInboxArrowDown}
                title={t("errors.noPermission")}
                description={t("settings.adminOnly")}
              />
            </Card>
          )}
        </div>

        {/* -------------------------------- history -------------------------------- */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader title={t("stockIn.history")} icon={HiOutlineClock} />

            {historyLoading ? (
              <div className="p-3">
                <SkeletonRows count={5} />
              </div>
            ) : historyError ? (
              <ErrorState error={historyError} onRetry={refetchHistory} />
            ) : purchases.length === 0 ? (
              <EmptyState
                icon={HiOutlineInboxArrowDown}
                title={t("stockIn.none")}
                description={t("stockIn.noneSub")}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {purchases.map((purchase) => {
                  const name =
                    localName(purchase.product, language) ||
                    localName(
                      { nameEn: purchase.productNameEn, nameTa: purchase.productNameTa },
                      language
                    );
                  return (
                    <li key={purchase._id} className="flex items-center gap-3 p-3">
                      <ProductThumb image={purchase.product?.image} name={name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-900">{name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                          {formatDateTime(purchase.date, language)}
                          {purchase.supplier ? ` · ${purchase.supplier}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone="success">
                            +{quantity(purchase.quantity)}{" "}
                            {t(`units.short.${purchase.product?.unit || "other"}`)}
                          </Badge>
                          <span className="text-[11px] font-medium text-ink-400">
                            {t("stockIn.stockAfter")} {quantity(purchase.stockAfter)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular text-ink-900">
                          {money(purchase.totalCost)}
                        </p>
                        <p className="text-[11px] font-medium text-ink-400 tabular">
                          {money(purchase.purchasePrice)} / {t("common.units")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
