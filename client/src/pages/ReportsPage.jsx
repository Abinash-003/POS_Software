import { useMemo, useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineCalculator,
  HiOutlineCube,
  HiOutlineMinusCircle,
  HiOutlineReceiptPercent,
  HiOutlineTableCells,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { request } from "../lib/apiClient.js";
import { toCsv, downloadCsv } from "../lib/csv.js";
import { money, quantity, formatDate } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { Button } from "../components/ui/Button.jsx";
import { ErrorState } from "../components/ui/States.jsx";
import { SkeletonStatCards, Skeleton } from "../components/ui/Skeleton.jsx";
import { ProgressBar } from "../components/ui/Spinner.jsx";
import { RangeFilter, rangeParams } from "../components/filters/RangeFilter.jsx";
import { cn } from "../lib/cn.js";

/** Each row of the profit waterfall: revenue, minus cost, minus expenses. */
function WaterfallRow({ label, value, icon: Icon, tone, isResult }) {
  const tones = {
    positive: "text-ink-900",
    negative: "text-danger-600",
    result: value >= 0 ? "text-success-700" : "text-danger-600",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        isResult ? "border-t-2 border-brand-200 bg-brand-50/60" : "border-b border-ink-100"
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          tone === "negative" ? "bg-danger-50 text-danger-600" : "bg-brand-50 text-brand-600"
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-semibold",
          isResult ? "text-[15px] text-ink-900" : "text-[13px] text-ink-700"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 font-bold tabular",
          isResult ? "text-xl" : "text-[15px]",
          tones[isResult ? "result" : tone]
        )}
      >
        {tone === "negative" ? "−" : ""}
        {money(Math.abs(value))}
      </span>
    </div>
  );
}

export function ReportsPage() {
  const { t, language } = useLanguage();
  const toast = useToast();

  const [range, setRange] = useState({ range: "month", from: "", to: "" });
  const [exporting, setExporting] = useState("");

  const params = useMemo(() => rangeParams(range), [range]);

  const { data, error, isInitialLoading, refreshing, refetch } = useFetch(
    "/reports/profit",
    params
  );
  const { data: productReport } = useFetch("/reports/products", { range: "all" });

  const inventory = productReport?.inventory;

  const runExport = async (kind) => {
    setExporting(kind);
    try {
      if (kind === "products") {
        const { products } = await request.get("/products", { limit: 1000 });
        if (products.length === 0) {
          toast.warning(t("reports.nothingToExport"));
          return;
        }
        downloadCsv(
          `products-${language}.csv`,
          toCsv(products, [
            { label: t("reports.csv.name"), map: (row) => localName(row, language) },
            { key: "sku", label: t("reports.csv.sku") },
            { key: "barcode", label: t("reports.csv.barcode") },
            { key: "brand", label: t("reports.csv.brand") },
            {
              label: t("reports.csv.category"),
              map: (row) => (row.category ? localName(row.category, language) : ""),
            },
            { key: "purchasePrice", label: t("reports.csv.purchasePrice") },
            { key: "sellingPrice", label: t("reports.csv.sellingPrice") },
            { key: "stock", label: t("reports.csv.stock") },
            { key: "minimumStock", label: t("reports.csv.minStock") },
            {
              label: t("reports.csv.unit"),
              map: (row) => {
                const key = `units.${row.unit}`;
                const label = t(key);
                return label === key ? row.unit || "" : label;
              },
            },
            {
              label: t("reports.csv.status"),
              map: (row) => {
                const key = `status.${row.stockStatus}`;
                const label = t(key);
                return label === key ? row.stockStatus || "" : label;
              },
            },
          ])
        );
      }

      if (kind === "expenses") {
        const { expenses } = await request.get("/expenses", { ...params, limit: 500 });
        if (expenses.length === 0) {
          toast.warning(t("reports.nothingToExport"));
          return;
        }
        downloadCsv(
          `expenses-${range.range}-${language}.csv`,
          toCsv(expenses, [
            { label: t("reports.csv.date"), map: (row) => formatDate(row.date, language) },
            { key: "name", label: t("reports.csv.expense") },
            {
              label: t("reports.csv.category"),
              map: (row) => {
                const key = `expenseCats.${row.category}`;
                const label = t(key);
                return label === key ? row.category || "" : label;
              },
            },
            { key: "amount", label: t("reports.csv.amount") },
            { key: "notes", label: t("reports.csv.notes") },
          ])
        );
      }

      if (kind === "purchases") {
        const { purchases } = await request.get("/purchases", { ...params, limit: 500 });
        if (purchases.length === 0) {
          toast.warning(t("reports.nothingToExport"));
          return;
        }
        downloadCsv(
          `purchases-${range.range}-${language}.csv`,
          toCsv(purchases, [
            { label: t("reports.csv.date"), map: (row) => formatDate(row.date, language) },
            {
              label: t("reports.csv.product"),
              map: (row) =>
                localName(row.product, language) ||
                localName(
                  { nameEn: row.productNameEn, nameTa: row.productNameTa },
                  language
                ),
            },
            { label: t("reports.csv.sku"), map: (row) => row.product?.sku || "" },
            { key: "quantity", label: t("reports.csv.quantity") },
            { key: "purchasePrice", label: t("reports.csv.unitPrice") },
            { key: "totalCost", label: t("reports.csv.totalCost") },
            { key: "supplier", label: t("reports.csv.supplier") },
            { key: "stockAfter", label: t("reports.csv.stockAfter") },
            { key: "notes", label: t("reports.csv.notes") },
          ])
        );
      }

      toast.success(
        t("reports.exported", {
          name: t(
            `reports.export${
              kind === "products" ? "Products" : kind === "expenses" ? "Expenses" : "Purchases"
            }`
          ),
        })
      );
    } catch {
      toast.error(t("errors.server"));
    } finally {
      setExporting("");
    }
  };

  if (error && !data) {
    return (
      <>
        <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")} />
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </>
    );
  }

  const profitable = (data?.estimatedProfit || 0) >= 0;

  return (
    <>
      <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")}>
        <RangeFilter value={range} onChange={setRange} />
      </PageHeader>

      {refreshing ? <ProgressBar className="mb-3" /> : null}

      {isInitialLoading ? (
        <SkeletonStatCards count={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={t("reports.revenue")}
              value={money(data.revenue)}
              hint={`${data.bills} ${t("stats.bills")}`}
              icon={HiOutlineReceiptPercent}
              tone="brand"
            />
            <StatCard
              label={t("reports.grossProfit")}
              value={money(data.grossProfit)}
              icon={HiOutlineArrowTrendingUp}
              tone="success"
            />
            <StatCard
              label={t("reports.expenses")}
              value={money(data.expenses)}
              icon={HiOutlineBanknotes}
              tone="warning"
            />
            <StatCard
              label={t("reports.estimatedProfit")}
              value={money(data.estimatedProfit)}
              hint={t(profitable ? "reports.profitPositive" : "reports.profitNegative")}
              icon={profitable ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown}
              tone={profitable ? "success" : "danger"}
            />
          </div>

          {/* ---------------------------- profit waterfall --------------------------- */}
          <Card className="mt-4">
            <CardHeader
              title={t("reports.profitReport")}
              subtitle={t("reports.formula")}
              icon={HiOutlineCalculator}
            />
            <div>
              <WaterfallRow
                label={t("reports.revenue")}
                value={data.revenue}
                icon={HiOutlineReceiptPercent}
                tone="positive"
              />
              <WaterfallRow
                label={t("reports.cost")}
                value={data.soldCost}
                icon={HiOutlineCube}
                tone="negative"
              />
              <WaterfallRow
                label={t("reports.expenses")}
                value={data.expenses}
                icon={HiOutlineMinusCircle}
                tone="negative"
              />
              <WaterfallRow
                label={t("reports.estimatedProfit")}
                value={data.estimatedProfit}
                icon={profitable ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown}
                tone="positive"
                isResult
              />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-ink-100 p-4 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase text-ink-400">
                  {t("reports.stockPurchased")}
                </dt>
                <dd className="text-sm font-bold tabular text-ink-900">
                  {money(data.stockPurchased)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase text-ink-400">
                  {t("reports.discountGiven")}
                </dt>
                <dd className="text-sm font-bold tabular text-ink-900">{money(data.discount)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase text-ink-400">
                  {t("stats.unitsSold")}
                </dt>
                <dd className="text-sm font-bold tabular text-ink-900">{quantity(data.units)}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}

      {/* ----------------------------- inventory value ---------------------------- */}
      <Card className="mt-4">
        <CardHeader title={t("reports.inventoryValue")} icon={HiOutlineCube} />
        {!inventory ? (
          <div className="p-4">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            {[
              { label: t("reports.atCost"), value: money(inventory.atCost) },
              { label: t("reports.atRetail"), value: money(inventory.atRetail) },
              { label: t("reports.potentialProfit"), value: money(inventory.potentialProfit) },
              { label: t("common.units"), value: quantity(inventory.units) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-ink-50 p-3">
                <dt className="text-[11px] font-semibold uppercase text-ink-400">{item.label}</dt>
                <dd className="mt-0.5 text-[15px] font-bold tabular text-ink-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      {/* --------------------------------- exports -------------------------------- */}
      <Card className="mt-4">
        <CardHeader
          title={t("reports.export")}
          subtitle={t("reports.exportHint")}
          icon={HiOutlineTableCells}
        />
        <div className="grid gap-2.5 p-4 sm:grid-cols-3">
          {[
            { kind: "products", label: t("reports.exportProducts") },
            { kind: "expenses", label: t("reports.exportExpenses") },
            { kind: "purchases", label: t("reports.exportPurchases") },
          ].map((item) => (
            <Button
              key={item.kind}
              variant="outline"
              icon={HiOutlineArrowDownTray}
              loading={exporting === item.kind}
              onClick={() => runExport(item.kind)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <p className="border-t border-ink-100 px-4 py-2.5 text-xs text-ink-400">
          {t("reports.salesHint")}
        </p>
      </Card>

      <p className="mt-4 text-center text-xs text-ink-400">{formatDate(new Date(), language)}</p>
    </>
  );
}
