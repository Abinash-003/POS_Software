import { Link } from "react-router-dom";
import {
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
  HiOutlineInboxArrowDown,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { money, quantity } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { IconButton } from "../components/ui/Button.jsx";
import { ProductThumb } from "../components/ui/ImagePicker.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { ProgressBar } from "../components/ui/Spinner.jsx";

function AlertList({ products, tone, t, language }) {
  return (
    <ul className="divide-y divide-ink-100">
      {products.map((product) => {
        const name = localName(product, language);
        return (
          <li key={product._id}>
            <Link
              to={`/stock-in?product=${product._id}`}
              className="flex items-center gap-3 p-3 transition hover:bg-brand-50/50"
            >
              <ProductThumb image={product.image} name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-900">{name}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500 tabular">
                  {product.sku}
                  {product.category ? ` · ${localName(product.category, language)}` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={tone}>
                    {tone === "danger"
                      ? t("status.out")
                      : t("alerts.remaining", {
                          qty: quantity(product.stock),
                          unit: t(`units.short.${product.unit}`),
                        })}
                  </Badge>
                  <span className="text-[11px] font-medium text-ink-400">
                    {t("alerts.alertAt", { qty: quantity(product.minimumStock) })}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold tabular text-ink-700">
                  {money(product.purchasePrice)}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">
                  <HiOutlineInboxArrowDown className="size-3.5" aria-hidden="true" />
                  {t("alerts.restock")}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AlertsPage() {
  const { t, language } = useLanguage();
  const { data, error, isInitialLoading, refreshing, refetch } = useFetch(
    "/products/alerts/low-stock"
  );

  const low = data?.low || [];
  const out = data?.out || [];
  const nothingToRestock = !isInitialLoading && low.length === 0 && out.length === 0;

  return (
    <>
      <PageHeader
        title={t("alerts.title")}
        subtitle={t("alerts.subtitle")}
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
        <SkeletonRows count={5} />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : nothingToRestock ? (
        <Card>
          <EmptyState
            icon={HiOutlineCheckBadge}
            title={t("alerts.allGood")}
            description={t("alerts.allGoodSub")}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {out.length > 0 ? (
            <Card>
              <CardHeader
                title={t("alerts.outSection")}
                icon={HiOutlineXCircle}
                action={<Badge tone="danger">{data.outCount}</Badge>}
              />
              <AlertList products={out} tone="danger" t={t} language={language} />
            </Card>
          ) : null}

          {low.length > 0 ? (
            <Card>
              <CardHeader
                title={t("alerts.lowSection")}
                icon={HiOutlineExclamationTriangle}
                action={<Badge tone="warning">{data.lowCount}</Badge>}
              />
              <AlertList products={low} tone="warning" t={t} language={language} />
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
