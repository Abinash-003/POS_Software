import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineCube,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { money, quantity, formatDayLabel, formatHour } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { ProductThumb } from "../components/ui/ImagePicker.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonStatCards, Skeleton } from "../components/ui/Skeleton.jsx";
import { ProgressBar } from "../components/ui/Spinner.jsx";
import { RangeFilter, rangeParams } from "../components/filters/RangeFilter.jsx";

const PAYMENT_COLORS = { cash: "#109d6e", upi: "#0d91e8", card: "#d98600", other: "#7b9abb" };

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #e4e4e4",
  fontSize: 12,
  boxShadow: "0 8px 24px -12px rgba(10,10,10,0.2)",
};

function RankedList({ rows, language, t, emptyTitle, showStock = false }) {
  if (rows.length === 0) {
    return <EmptyState icon={HiOutlineCube} title={emptyTitle} className="py-9" />;
  }

  const max = Math.max(...rows.map((row) => row.units), 1);

  return (
    <ul className="divide-y divide-ink-100">
      {rows.map((row, index) => (
        <li key={row.productId || `${row.sku}-${index}`} className="flex items-center gap-3 p-3">
          <span className="w-5 shrink-0 text-center text-[13px] font-bold tabular text-ink-400">
            {index + 1}
          </span>
          <ProductThumb image={row.image} name={localName(row, language)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink-900">
              {localName(row, language)}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-400 transition-all duration-500"
                style={{ width: `${Math.max((row.units / max) * 100, 2)}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 text-right">
            {showStock ? (
              <Badge tone={row.stock > 0 ? "neutral" : "danger"}>
                {quantity(row.stock)} {t(`units.short.${row.unit}`)}
              </Badge>
            ) : (
              <>
                <p className="text-[13px] font-bold tabular text-ink-900">
                  {quantity(row.units)} {t("stats.sold")}
                </p>
                <p className="text-[11px] font-medium text-ink-500 tabular">{money(row.revenue)}</p>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatisticsPage() {
  const { t, language } = useLanguage();
  const [range, setRange] = useState({ range: "month", from: "", to: "" });

  const params = useMemo(() => rangeParams(range), [range]);

  const {
    data: sales,
    error: salesError,
    isInitialLoading,
    refreshing,
    refetch,
  } = useFetch("/reports/sales", params);
  const { data: products } = useFetch("/reports/products", params);

  if (salesError && !sales) {
    return (
      <>
        <PageHeader title={t("stats.title")} subtitle={t("stats.subtitle")} />
        <Card>
          <ErrorState error={salesError} onRetry={refetch} />
        </Card>
      </>
    );
  }

  const totals = sales?.totals;
  const daily = sales?.daily || [];
  const byPayment = (sales?.byPayment || []).map((row) => ({
    ...row,
    name: t(`payment.${row.method}`),
    fill: PAYMENT_COLORS[row.method] || PAYMENT_COLORS.other,
  }));
  const hourly = sales?.hourly || [];

  return (
    <>
      <PageHeader title={t("stats.title")} subtitle={t("stats.subtitle")}>
        <RangeFilter value={range} onChange={setRange} />
      </PageHeader>

      {refreshing ? <ProgressBar className="mb-3" /> : null}

      {isInitialLoading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t("stats.totalRevenue")}
            value={money(totals.revenue)}
            icon={HiOutlineReceiptPercent}
            tone="brand"
          />
          <StatCard
            label={t("stats.totalProfit")}
            value={money(totals.profit)}
            icon={HiOutlineArrowTrendingUp}
            tone={totals.profit >= 0 ? "success" : "danger"}
          />
          <StatCard label={t("stats.bills")} value={totals.bills} icon={HiOutlineChartBar} tone="neutral" />
          <StatCard
            label={t("stats.unitsSold")}
            value={quantity(totals.units)}
            icon={HiOutlineCube}
            tone="neutral"
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* ------------------------------ sales trend ------------------------------ */}
        <Card className="lg:col-span-3">
          <CardHeader title={t("stats.salesTrend")} icon={HiOutlineArrowTrendingUp} />
          {isInitialLoading ? (
            <div className="p-4">
              <Skeleton className="h-56 w-full" />
            </div>
          ) : daily.length < 2 ? (
            <EmptyState
              icon={HiOutlineArrowTrendingUp}
              title={t("stats.notEnough")}
              description={t("stats.notEnoughSub")}
            />
          ) : (
            <div className="h-64 w-full p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 6, right: 10, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDayLabel(value, language)}
                    tick={{ fontSize: 11, fill: "#577a9e" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => money(value, { compact: true })}
                    tick={{ fontSize: 11, fill: "#577a9e" }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, key) => [money(value), t(`stats.${key}`)]}
                    labelFormatter={(value) => formatDayLabel(value, language)}
                  />
                  <Legend
                    formatter={(key) => t(`stats.${key}`)}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="#0d91e8"
                    strokeWidth={2.75}
                    dot={{ r: 3.5, fill: "#0d91e8", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="profit"
                    stroke="#109d6e"
                    strokeWidth={2.75}
                    strokeDasharray="0"
                    dot={{ r: 3.5, fill: "#109d6e", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ----------------------------- payment split ----------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader title={t("stats.paymentSplit")} icon={HiOutlineCreditCard} />
          {isInitialLoading ? (
            <div className="p-4">
              <Skeleton className="mx-auto size-40 rounded-full" />
            </div>
          ) : byPayment.length === 0 ? (
            <EmptyState icon={HiOutlineCreditCard} title={t("stats.notEnough")} className="py-9" />
          ) : (
            <>
              <div className="h-52 w-full p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byPayment}
                      dataKey="revenue"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="82%"
                      paddingAngle={2}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {byPayment.map((row) => (
                        <Cell key={row.method} fill={row.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => money(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 border-t border-ink-100 p-3.5">
                {byPayment.map((row) => (
                  <li key={row.method} className="flex items-center gap-2 text-xs">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.fill }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 font-medium text-ink-600">{row.name}</span>
                    <span className="font-semibold tabular text-ink-900">{money(row.revenue)}</span>
                    <span className="w-8 text-right tabular text-ink-400">{row.bills}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* ------------------------------ busiest hours ------------------------------ */}
      {hourly.length > 1 ? (
        <Card className="mt-4">
          <CardHeader title={t("stats.busiestHours")} icon={HiOutlineClock} />
          <div className="h-48 w-full p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 6, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  tick={{ fontSize: 11, fill: "#577a9e" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => money(value, { compact: true })}
                  tick={{ fontSize: 11, fill: "#577a9e" }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [money(value), t("stats.revenue")]}
                  labelFormatter={(value) => `${t("stats.hour")} ${formatHour(value)}`}
                />
                <Bar dataKey="revenue" fill="#43b0f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {/* ----------------------------- product ranking ---------------------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("stats.bestSellers")} icon={HiOutlineSparkles} />
          <RankedList
            rows={products?.best || []}
            language={language}
            t={t}
            emptyTitle={t("stats.notEnough")}
          />
        </Card>

        <Card>
          <CardHeader title={t("stats.slowMovers")} icon={HiOutlineArrowTrendingDown} />
          <RankedList
            rows={products?.slow || []}
            language={language}
            t={t}
            emptyTitle={t("stats.notEnough")}
          />
        </Card>
      </div>

      {products?.neverSold?.length > 0 ? (
        <Card className="mt-4">
          <CardHeader
            title={t("stats.neverSold")}
            icon={HiOutlineCube}
            action={<Badge tone="warning">{products.neverSold.length}</Badge>}
          />
          <RankedList
            rows={products.neverSold}
            language={language}
            t={t}
            emptyTitle={t("stats.notEnough")}
            showStock
          />
        </Card>
      ) : null}
    </>
  );
}
