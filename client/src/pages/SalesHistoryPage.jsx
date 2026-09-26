import { useMemo, useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineChevronRight,
  HiOutlineClipboardDocumentList,
  HiOutlineMagnifyingGlass,
  HiOutlineReceiptPercent,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useDebounced } from "../hooks/useDebounced.js";
import { request } from "../lib/apiClient.js";
import { toCsv, downloadCsv } from "../lib/csv.js";
import { money, quantity, formatDate, formatDateTime, formatTime } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, Select } from "../components/ui/Field.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { ProgressBar, LoadingPanel } from "../components/ui/Spinner.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { RangeFilter, rangeParams } from "../components/filters/RangeFilter.jsx";

const PAYMENTS = ["cash", "upi", "card", "other"];

function SaleDetailModal({ saleId, open, onClose }) {
  const { t, language } = useLanguage();
  const { data, loading, error } = useFetch(saleId ? `/sales/${saleId}` : null, null, {
    enabled: Boolean(saleId),
  });
  const sale = data?.sale;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("history.details")}
      subtitle={sale?.billNumber}
      size="md"
      footer={
        sale ? (
          <Button className="w-full" icon={HiOutlineReceiptPercent} to={`/billing/${sale._id}`}>
            {t("sale.viewBill")}
          </Button>
        ) : null
      }
    >
      {loading && !sale ? (
        <LoadingPanel label={t("common.loading")} />
      ) : error ? (
        <ErrorState error={error} />
      ) : sale ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl bg-ink-50 p-2.5">
              <p className="text-[10px] font-bold uppercase text-ink-400">{t("common.total")}</p>
              <p className="text-sm font-bold tabular text-ink-900">{money(sale.total)}</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-2.5">
              <p className="text-[10px] font-bold uppercase text-ink-400">{t("stats.profit")}</p>
              <p className="text-sm font-bold tabular text-success-700">{money(sale.profit)}</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-2.5">
              <p className="text-[10px] font-bold uppercase text-ink-400">{t("payment.label")}</p>
              <p className="text-sm font-semibold text-ink-900">
                {t(`payment.${sale.paymentMethod}`)}
              </p>
            </div>
            <div className="rounded-xl bg-ink-50 p-2.5">
              <p className="text-[10px] font-bold uppercase text-ink-400">{t("common.date")}</p>
              <p className="text-[13px] font-semibold text-ink-900">{formatTime(sale.createdAt)}</p>
            </div>
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-400">
            {t("common.items")}
          </p>
          <ul className="mt-1.5 divide-y divide-ink-100 rounded-xl border border-ink-100">
            {sale.items.map((item, index) => (
              <li key={`${item.sku}-${index}`} className="flex items-center gap-3 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink-900">
                    {localName(item, language)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-ink-500 tabular">
                    {money(item.sellingPrice)} × {quantity(item.quantity)}{" "}
                    {t(`units.short.${item.unit}`)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular text-ink-900">
                  {money(item.total)}
                </p>
              </li>
            ))}
          </ul>

          {sale.customerName || sale.customerPhone ? (
            <div className="mt-4 rounded-xl bg-brand-50 p-3">
              <p className="text-[10px] font-bold uppercase text-brand-600">
                {t("billing.billedTo")}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-ink-900">
                {sale.customerName || t("billing.walkIn")}
              </p>
              {sale.customerPhone ? (
                <p className="text-[11px] font-medium text-ink-600 tabular">{sale.customerPhone}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

export function SalesHistoryPage() {
  const { t, language } = useLanguage();
  const toast = useToast();

  const [range, setRange] = useState({ range: "today", from: "", to: "" });
  const [payment, setPayment] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounced(search);
  const params = useMemo(
    () => ({
      ...rangeParams(range),
      limit: 200,
      ...(payment ? { payment } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    }),
    [range, payment, debouncedSearch]
  );

  const { data, error, isInitialLoading, refreshing, refetch } = useFetch("/sales", params);

  const sales = data?.sales || [];
  const summary = data?.summary;

  const exportCsv = async () => {
    if (sales.length === 0) {
      toast.warning(t("reports.nothingToExport"));
      return;
    }

    setExporting(true);
    try {
      // The list endpoint omits line items, so pull details for a full export.
      const detailed = await Promise.all(
        sales.slice(0, 120).map((sale) => request.get(`/sales/${sale._id}`))
      );

      const rows = detailed.flatMap(({ sale }) =>
        sale.items.map((item) => ({
          bill: sale.billNumber,
          date: formatDate(sale.createdAt, language),
          time: formatTime(sale.createdAt),
          payment: (() => {
            const key = `payment.${sale.paymentMethod}`;
            const label = t(key);
            return label === key ? sale.paymentMethod : label;
          })(),
          customer: sale.customerName,
          product: localName(item, language),
          sku: item.sku,
          qty: item.quantity,
          rate: item.sellingPrice,
          amount: item.total,
          profit: item.profit,
          billTotal: sale.total,
        }))
      );

      downloadCsv(
        `sales-${range.range}-${language}.csv`,
        toCsv(rows, [
          { key: "bill", label: t("reports.csv.billNumber") },
          { key: "date", label: t("reports.csv.date") },
          { key: "time", label: t("reports.csv.time") },
          { key: "payment", label: t("reports.csv.payment") },
          { key: "customer", label: t("reports.csv.customer") },
          { key: "product", label: t("reports.csv.product") },
          { key: "sku", label: t("reports.csv.sku") },
          { key: "qty", label: t("reports.csv.quantity") },
          { key: "rate", label: t("reports.csv.rate") },
          { key: "amount", label: t("reports.csv.amount") },
          { key: "profit", label: t("reports.csv.profit") },
          { key: "billTotal", label: t("reports.csv.billTotal") },
        ])
      );
      toast.success(t("reports.exported", { name: t("reports.exportSales") }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t("history.title")}
        subtitle={t("history.subtitle")}
        actions={
          <Button
            variant="outline"
            icon={HiOutlineArrowDownTray}
            loading={exporting}
            onClick={exportCsv}
          >
            <span className="hidden sm:inline">{t("history.exportCsv")}</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        }
      >
        <div className="space-y-2.5">
          <RangeFilter value={range} onChange={setRange} />
          <div className="flex gap-2.5">
            <Input
              className="flex-1"
              icon={HiOutlineMagnifyingGlass}
              placeholder={t("billing.searchPh")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              aria-label={t("common.search")}
            />
            <Select
              className="w-36 shrink-0 sm:w-44"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
              aria-label={t("payment.label")}
            >
              <option value="">{t("filters.allPayments")}</option>
              {PAYMENTS.map((method) => (
                <option key={method} value={method}>
                  {t(`payment.${method}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </PageHeader>

      {summary ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t("stats.totalRevenue")}
            value={money(summary.revenue)}
            icon={HiOutlineReceiptPercent}
            tone="brand"
          />
          <StatCard
            label={t("stats.totalProfit")}
            value={money(summary.profit)}
            icon={HiOutlineClipboardDocumentList}
            tone={summary.profit >= 0 ? "success" : "danger"}
          />
          <StatCard label={t("stats.bills")} value={summary.bills} tone="neutral" />
          <StatCard
            label={t("stats.unitsSold")}
            value={quantity(summary.units)}
            tone="neutral"
          />
        </div>
      ) : null}

      {refreshing ? <ProgressBar className="mb-3" /> : null}

      <Card>
        <CardHeader
          title={t("history.title")}
          subtitle={t("history.tapHint")}
          icon={HiOutlineClipboardDocumentList}
        />

        {isInitialLoading ? (
          <div className="p-3">
            <SkeletonRows count={6} withImage={false} />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={HiOutlineClipboardDocumentList}
            title={t("history.none")}
            description={t("history.noneSub")}
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {sales.map((sale) => (
              <li key={sale._id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(sale._id)}
                  className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-brand-50/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <HiOutlineReceiptPercent className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-900 tabular">
                      {sale.billNumber}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                      {formatDateTime(sale.createdAt, language)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand">{t(`payment.${sale.paymentMethod}`)}</Badge>
                      <span className="text-[11px] font-medium text-ink-400">
                        {sale.customerName || t("billing.walkIn")}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold tabular text-ink-900">{money(sale.total)}</p>
                    <p className="text-[11px] font-medium text-success-600 tabular">
                      +{money(sale.profit)}
                    </p>
                  </div>
                  <HiOutlineChevronRight
                    className="size-4 shrink-0 text-ink-300"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {data && data.total > sales.length ? (
          <p className="border-t border-ink-100 px-4 py-2.5 text-center text-xs font-medium text-ink-400">
            {t("common.showing", { count: sales.length, total: data.total })}
          </p>
        ) : null}
      </Card>

      <SaleDetailModal
        saleId={selectedId}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
