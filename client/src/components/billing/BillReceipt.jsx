import { forwardRef } from "react";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { useSettings, shopDisplayName } from "../../context/SettingsContext.jsx";
import { assetUrl } from "../../lib/apiClient.js";
import { money, quantity, formatDate, formatTime } from "../../lib/format.js";

/**
 * A4-friendly bill. Colors are declared as plain hex because this node is
 * rasterised for the PDF export, and print styles strip the surrounding chrome.
 */
export const BillReceipt = forwardRef(function BillReceipt({ sale }, ref) {
  const { t, language } = useLanguage();
  const { settings } = useSettings();

  if (!sale) return null;

  const shopName = shopDisplayName(settings, language);
  const address = (language === "ta" ? settings.addressTa : settings.addressEn) || "";
  const footer = (language === "ta" ? settings.billFooterTa : settings.billFooterEn) || "";
  const logo = assetUrl(settings.logo);

  return (
    <div
      ref={ref}
      className="print-area mx-auto w-full max-w-2xl bg-white p-6 sm:p-8"
      style={{ color: "#0a0a0a" }}
    >
      {/* --------------------------------- header -------------------------------- */}
      <header
        className="flex items-start gap-4 pb-4"
        style={{ borderBottom: "2px solid #0d91e8" }}
      >
        {logo ? (
          <img
            src={logo}
            alt=""
            crossOrigin="anonymous"
            className="size-16 shrink-0 rounded-lg object-cover"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl" style={{ color: "#0a0a0a" }}>
            {shopName}
          </h1>
          {address ? (
            <p className="mt-1 text-xs leading-snug" style={{ color: "#6b6b6b" }}>
              {address}
            </p>
          ) : null}
          <p className="mt-0.5 text-xs" style={{ color: "#6b6b6b" }}>
            {settings.phone ? `${t("settings.phone")}: ${settings.phone}` : ""}
            {settings.phone && settings.gstin ? " · " : ""}
            {settings.gstin ? `GSTIN: ${settings.gstin}` : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: "#dfeffe", color: "#045ca0" }}
          >
            {t("billing.bill")}
          </p>
          <p className="mt-1.5 text-sm font-bold tabular">{sale.billNumber}</p>
          <p className="text-[11px]" style={{ color: "#6b6b6b" }}>
            {formatDate(sale.createdAt, language)}
          </p>
          <p className="text-[11px]" style={{ color: "#6b6b6b" }}>
            {formatTime(sale.createdAt)}
          </p>
        </div>
      </header>

      {/* ------------------------------ customer meta ---------------------------- */}
      <section className="grid grid-cols-2 gap-4 py-3.5 text-xs sm:grid-cols-3">
        <div>
          <p className="font-semibold uppercase tracking-wide" style={{ color: "#8a8a8a" }}>
            {t("billing.billedTo")}
          </p>
          <p className="mt-0.5 font-semibold">{sale.customerName || t("billing.walkIn")}</p>
          {sale.customerPhone ? <p className="tabular">{sale.customerPhone}</p> : null}
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide" style={{ color: "#8a8a8a" }}>
            {t("payment.label")}
          </p>
          <p className="mt-0.5 font-semibold">{t(`payment.${sale.paymentMethod}`)}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide" style={{ color: "#8a8a8a" }}>
            {t("billing.servedBy")}
          </p>
          <p className="mt-0.5 font-semibold">
            {sale.createdBy?.name || sale.createdBy?.username || "—"}
          </p>
        </div>
      </section>

      {/* --------------------------------- items --------------------------------- */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th className="px-2 py-2 text-left font-bold" style={{ color: "#0a0a0a" }}>
              #
            </th>
            <th className="px-2 py-2 text-left font-bold" style={{ color: "#0a0a0a" }}>
              {t("common.items")}
            </th>
            <th className="px-2 py-2 text-right font-bold" style={{ color: "#0a0a0a" }}>
              {t("common.quantity")}
            </th>
            <th className="px-2 py-2 text-right font-bold" style={{ color: "#0a0a0a" }}>
              {t("common.price")}
            </th>
            <th className="px-2 py-2 text-right font-bold" style={{ color: "#0a0a0a" }}>
              {t("common.amount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {(sale.items || []).map((item, index) => (
            <tr key={`${item.sku}-${index}`} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td className="px-2 py-2 tabular" style={{ color: "#6b6b6b" }}>
                {index + 1}
              </td>
              <td className="px-2 py-2">
                <p className="font-semibold">{language === "ta" ? item.nameTa : item.nameEn}</p>
                {item.sku ? (
                  <p className="text-[10px] tabular" style={{ color: "#8a8a8a" }}>
                    {item.sku}
                  </p>
                ) : null}
              </td>
              <td className="px-2 py-2 text-right tabular">
                {quantity(item.quantity)} {t(`units.short.${item.unit}`)}
              </td>
              <td className="px-2 py-2 text-right tabular">{money(item.sellingPrice, { decimals: true })}</td>
              <td className="px-2 py-2 text-right font-semibold tabular">
                {money(item.total, { decimals: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* -------------------------------- totals --------------------------------- */}
      <section className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <dt style={{ color: "#6b6b6b" }}>{t("common.subtotal")}</dt>
            <dd className="font-semibold tabular">{money(sale.subtotal, { decimals: true })}</dd>
          </div>
          {sale.discount > 0 ? (
            <div className="flex justify-between gap-4">
              <dt style={{ color: "#6b6b6b" }}>{t("common.discount")}</dt>
              <dd className="font-semibold tabular" style={{ color: "#91201a" }}>
                −{money(sale.discount, { decimals: true })}
              </dd>
            </div>
          ) : null}
          <div
            className="flex justify-between gap-4 pt-2"
            style={{ borderTop: "2px solid #0d91e8" }}
          >
            <dt className="text-sm font-bold">{t("common.total")}</dt>
            <dd className="text-lg font-bold tabular" style={{ color: "#045ca0" }}>
              {money(sale.total, { decimals: true })}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt style={{ color: "#8a8a8a" }}>{t("billing.itemsCount")}</dt>
            <dd className="tabular" style={{ color: "#6b6b6b" }}>
              {sale.itemsCount} · {quantity(sale.unitsCount)} {t("common.units")}
            </dd>
          </div>
        </dl>
      </section>

      {/* -------------------------------- footer --------------------------------- */}
      <footer className="mt-6 pt-3 text-center" style={{ borderTop: "1px dashed #d4d4d4" }}>
        {footer ? (
          <p className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>
            {footer}
          </p>
        ) : null}
        <p className="mt-1 text-[10px]" style={{ color: "#8a8a8a" }}>
          {t("billing.internalNote")}
        </p>
      </footer>
    </div>
  );
});
