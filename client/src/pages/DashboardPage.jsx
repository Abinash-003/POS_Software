import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HiOutlineArrowPath,
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineCheckBadge,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
  HiOutlineInboxArrowDown,
  HiOutlinePlusCircle,
  HiOutlineReceiptPercent,
  HiOutlineShoppingCart,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { money, quantity, formatTime, formatDayLabel, greetingKey } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonStatCards, SkeletonRows, Skeleton } from "../components/ui/Skeleton.jsx";
import { ProgressBar } from "../components/ui/Spinner.jsx";

const QUICK_ACTIONS = [
  { to: "/sale", labelKey: "nav.quickSale", icon: HiOutlineShoppingCart, tone: "brand" },
  { to: "/products?new=1", labelKey: "products.addProduct", icon: HiOutlinePlusCircle, tone: "sky" },
  { to: "/stock-in", labelKey: "nav.stockIn", icon: HiOutlineInboxArrowDown, tone: "sky" },
  { to: "/expenses?new=1", labelKey: "expenses.add", icon: HiOutlineBanknotes, tone: "sky" },
];

function TrendChart({ data, language, t }) {
  if (data.length < 2) {
    return (
      <EmptyState
        icon={HiOutlineArrowTrendingUp}
        title={t("stats.notEnough")}
        description={t("stats.notEnoughSub")}
      />
    );
  }

  return (
    <div className="h-52 w-full px-1 pb-1 pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d91e8" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0d91e8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6eff7" vertical={false} />
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
            width={56}
          />
          <Tooltip
            formatter={(value, name) => [money(value), t(`dashboard.${name}`)]}
            labelFormatter={(value) => formatDayLabel(value, language)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #cfdfee",
              fontSize: 12,
              boxShadow: "0 8px 24px -12px rgba(20,36,52,0.2)",
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#0d91e8"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            dot={{ r: 3, fill: "#0d91e8" }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data, error, isInitialLoading, refreshing, refetch } = useFetch("/dashboard");

  if (error && !data) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }

  const today = data?.today;
  const alerts = data?.alerts;
  const restockList = [...(alerts?.out || []), ...(alerts?.low || [])].slice(0, 5);

  return (
    <>
      <PageHeader
        title={`${t(greetingKey())}, ${user?.name || user?.username || ""}`.trim()}
        subtitle={t("dashboard.subtitle")}
        actions={
          <IconButton
            icon={HiOutlineArrowPath}
            label={t("common.refresh")}
            variant="outline"
            size="icon"
            onClick={refetch}
            loading={refreshing}
          />
        }
      />

      {refreshing ? <ProgressBar className="mb-3" /> : null}

      {isInitialLoading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.todaySales")}
            value={money(today.revenue)}
            hint={t("sale.lines", { count: today.bills })}
            icon={HiOutlineShoppingCart}
            tone="brand"
            to="/history"
          />
          <StatCard
            label={t("dashboard.todayProfit")}
            value={money(today.netProfit)}
            hint={`${t("dashboard.grossProfit")} ${money(today.grossProfit)}`}
            icon={HiOutlineArrowTrendingUp}
            tone={today.netProfit >= 0 ? "brand" : "danger"}
          />
          <StatCard
            label={t("dashboard.todayExpenses")}
            value={money(today.expenses)}
            hint={t("expenses.totalToday")}
            icon={HiOutlineBanknotes}
            tone="warning"
            to="/expenses"
          />
          <StatCard
            label={t("dashboard.unitsSold")}
            value={quantity(today.units)}
            hint={`${today.bills} ${t("dashboard.billsToday")}`}
            icon={HiOutlineReceiptPercent}
            tone="neutral"
            to="/billing"
          />
        </div>
      )}

      {/* ------------------------------ quick actions ------------------------------ */}
      <section className="mt-5">
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-500">
          {t("dashboard.quickActions")}
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-2.5 rounded-card border border-ink-100 bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-float active:translate-y-0"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <action.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 text-[13px] font-semibold leading-tight text-ink-800">
                {t(action.labelKey)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {/* ------------------------------- week trend ------------------------------- */}
        <Card className="lg:col-span-3">
          <CardHeader
            title={t("dashboard.weekTrend")}
            subtitle={t("dashboard.revenue")}
            icon={HiOutlineArrowTrendingUp}
            action={
              isInitialLoading ? null : (
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase text-ink-400">
                    {t("dashboard.thisWeek")}
                  </p>
                  <p className="text-sm font-bold tabular text-ink-900">
                    {money(data.week.revenue, { compact: true })}
                  </p>
                </div>
              )
            }
          />
          {isInitialLoading ? (
            <div className="p-4">
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <TrendChart data={data.trend} language={language} t={t} />
          )}
        </Card>

        {/* ------------------------------ needs restock ----------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("dashboard.needsRestock")}
            subtitle={
              alerts ? t("alerts.subtitle") : undefined
            }
            icon={HiOutlineExclamationTriangle}
            action={
              alerts && alerts.lowCount + alerts.outCount > 0 ? (
                <Badge tone="warning">{alerts.lowCount + alerts.outCount}</Badge>
              ) : null
            }
          />
          {isInitialLoading ? (
            <div className="p-4">
              <SkeletonRows count={3} />
            </div>
          ) : restockList.length === 0 ? (
            <EmptyState
              icon={HiOutlineCheckBadge}
              title={t("dashboard.allStockHealthy")}
              className="py-9"
            />
          ) : (
            <>
              <ul className="divide-y divide-ink-100">
                {restockList.map((product) => (
                  <li key={product._id}>
                    <Link
                      to={`/stock-in?product=${product._id}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-900">
                          {localName(product, language)}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-ink-500">
                          {t("alerts.alertAt", { qty: quantity(product.minimumStock) })}
                        </p>
                      </div>
                      <Badge tone={product.stock <= 0 ? "danger" : "warning"}>
                        {product.stock <= 0
                          ? t("status.out")
                          : t("alerts.remaining", {
                              qty: quantity(product.stock),
                              unit: t(`units.short.${product.unit}`),
                            })}
                      </Badge>
                      <HiOutlineChevronRight className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-ink-100 p-2.5">
                <Button variant="ghost" size="sm" to="/alerts" className="w-full">
                  {t("common.viewAll")}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ------------------------------ recent bills ------------------------------ */}
      <Card className="mt-4">
        <CardHeader
          title={t("dashboard.recentBills")}
          icon={HiOutlineReceiptPercent}
          action={
            <Button variant="ghost" size="sm" to="/history">
              {t("common.viewAll")}
            </Button>
          }
        />
        {isInitialLoading ? (
          <div className="p-4">
            <SkeletonRows count={4} withImage={false} />
          </div>
        ) : data.recentSales.length === 0 ? (
          <EmptyState
            icon={HiOutlineShoppingCart}
            title={t("dashboard.noSalesToday")}
            action={
              <Button to="/sale" icon={HiOutlineShoppingCart}>
                {t("dashboard.startSelling")}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.recentSales.map((sale) => (
              <li key={sale._id}>
                <Link
                  to={`/billing/${sale._id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <HiOutlineReceiptPercent className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-900">
                      {sale.billNumber}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                      {formatTime(sale.createdAt)} ·{" "}
                      {sale.customerName || t("billing.walkIn")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular text-ink-900">{money(sale.total)}</p>
                    <p className="text-[11px] font-medium text-ink-500">
                      {t(`payment.${sale.paymentMethod}`)}
                    </p>
                  </div>
                  <HiOutlineChevronRight className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------------- period roll-up --------------------------- */}
      {isInitialLoading ? null : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { key: "thisWeek", bucket: data.week },
            { key: "thisMonth", bucket: data.month },
            { key: "allTime", bucket: data.allTime },
          ].map(({ key, bucket }) => (
            <Card key={key} className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                {t(`dashboard.${key}`)}
              </p>
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-ink-500">{t("dashboard.revenue")}</span>
                  <span className="text-sm font-bold tabular text-ink-900">
                    {money(bucket.revenue)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-ink-500">{t("dashboard.netProfit")}</span>
                  <span
                    className={`text-sm font-bold tabular ${
                      bucket.netProfit >= 0 ? "text-success-700" : "text-danger-600"
                    }`}
                  >
                    {money(bucket.netProfit)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-ink-500">{t("stats.bills")}</span>
                  <span className="text-sm font-semibold tabular text-ink-700">{bucket.bills}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
