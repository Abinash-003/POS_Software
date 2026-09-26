import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineCreditCard,
  HiOutlineDevicePhoneMobile,
  HiOutlineEllipsisHorizontalCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineReceiptPercent,
  HiOutlineShoppingCart,
  HiOutlineTrash,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useDebounced } from "../hooks/useDebounced.js";
import { useErrorToast } from "../hooks/useApiError.js";
import { request } from "../lib/apiClient.js";
import { money, quantity } from "../lib/format.js";
import { cn } from "../lib/cn.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Input, MoneyInput } from "../components/ui/Field.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { ProductThumb } from "../components/ui/ImagePicker.jsx";
import { EmptyState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { Modal } from "../components/ui/Modal.jsx";

const CART_KEY = "sm_cart";

const PAYMENTS = [
  { value: "cash", icon: HiOutlineBanknotes },
  { value: "upi", icon: HiOutlineDevicePhoneMobile },
  { value: "card", icon: HiOutlineCreditCard },
  { value: "other", icon: HiOutlineEllipsisHorizontalCircle },
];

function readStoredCart() {
  try {
    const raw = window.sessionStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((line) => ({
      ...line,
      catalogPrice: line.catalogPrice ?? line.sellingPrice,
    }));
  } catch {
    return [];
  }
}

/** Search result row: tap anywhere to add one unit. */
function SearchResult({ product, language, t, inCart, onAdd }) {
  const name = localName(product, language);
  const soldOut = product.stock <= 0;
  const remaining = product.stock - inCart;

  return (
    <li>
      <button
        type="button"
        disabled={soldOut || remaining <= 0}
        onClick={() => onAdd(product)}
        className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-ink-50 disabled:opacity-50"
      >
        <ProductThumb image={product.image} name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500 tabular">
            {product.sku}
            {product.brand ? ` · ${product.brand}` : ""}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {soldOut ? (
              <Badge tone="danger">{t("sale.outOfStock")}</Badge>
            ) : (
              <Badge tone={remaining <= 0 ? "warning" : "neutral"}>
                {quantity(remaining)} {t(`units.short.${product.unit}`)}
              </Badge>
            )}
            {inCart > 0 ? (
              <Badge tone="brand">
                {t("sale.inCart")} {quantity(inCart)}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-bold tabular text-ink-900">{money(product.sellingPrice)}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-black text-white shadow-float">
          <HiOutlinePlus className="size-5" aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}

function CartLine({ line, language, t, onStep, onSet, onSetRate, onRemove }) {
  const name = localName(line, language);
  const atLimit = line.quantity >= line.stock;
  const rateChanged =
    Number(line.sellingPrice) !== Number(line.catalogPrice ?? line.sellingPrice);

  return (
    <li className="flex items-start gap-3 p-3">
      <ProductThumb image={line.image} name={name} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink-900">{name}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
              {t("sale.rate")}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={line.sellingPrice}
              onChange={(event) => onSetRate(line.product, event.target.value)}
              aria-label={t("sale.rate")}
              className="h-7 w-16 border-0 bg-transparent text-right text-sm font-bold tabular text-ink-900 focus:outline-none"
            />
          </label>

          <IconButton
            icon={HiOutlineMinus}
            label={t("sale.decrease")}
            variant="outline"
            onClick={() => onStep(line.product, -1)}
          />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={line.quantity}
            onChange={(event) => onSet(line.product, event.target.value)}
            aria-label={t("sale.qty")}
            className="h-9 w-14 rounded-lg border border-ink-200 bg-white text-center text-sm font-semibold text-ink-900 tabular focus:border-ink-900 focus:outline-none focus:ring-4 focus:ring-ink-100"
          />
          <IconButton
            icon={HiOutlinePlus}
            label={t("sale.increase")}
            variant="outline"
            disabled={atLimit}
            onClick={() => onStep(line.product, 1)}
          />
          <IconButton
            icon={HiOutlineTrash}
            label={t("sale.removeItem")}
            variant="dangerGhost"
            className="ml-auto"
            onClick={() => onRemove(line.product)}
          />
        </div>

        {rateChanged ? (
          <p className="mt-1.5 text-[11px] font-medium text-ink-500">
            {t("sale.rateUpdated")} ·{" "}
            {t("sale.catalogRate", { price: money(line.catalogPrice ?? line.sellingPrice) })}
          </p>
        ) : null}

        {atLimit ? (
          <p className="mt-1.5 text-[11px] font-medium text-warn-600">
            {t("sale.insufficient", {
              stock: quantity(line.stock),
              unit: t(`units.short.${line.unit}`),
            })}
          </p>
        ) : null}
      </div>

      <p className="shrink-0 text-sm font-bold tabular text-ink-900">
        {money((Number(line.sellingPrice) || 0) * line.quantity)}
      </p>
    </li>
  );
}

export function QuickSalePage() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
  const showError = useErrorToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState(readStoredCart);
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [customerOpen, setCustomerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(null);

  const debouncedSearch = useDebounced(search, 280);
  const searchParams = useMemo(
    () => (debouncedSearch.trim() ? { q: debouncedSearch.trim(), limit: 24 } : null),
    [debouncedSearch]
  );

  const { data, isInitialLoading, loading } = useFetch("/products", searchParams, {
    enabled: Boolean(searchParams),
  });

  // Survive an accidental refresh mid-sale without leaking a cart across tabs.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage full or blocked */
    }
  }, [cart]);

  const cartQuantities = useMemo(
    () => new Map(cart.map((line) => [line.product, line.quantity])),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const rate = Number(line.sellingPrice);
        if (!Number.isFinite(rate)) return sum;
        return sum + rate * line.quantity;
      }, 0),
    [cart]
  );
  const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const payable = subtotal - discountValue;

  const addToCart = useCallback(
    (product) => {
      setCart((current) => {
        const existing = current.find((line) => line.product === product._id);

        if (existing) {
          if (existing.quantity + 1 > product.stock) {
            toast.warning(
              t("errors.insufficient"),
              t("sale.insufficient", {
                stock: quantity(product.stock),
                unit: t(`units.short.${product.unit}`),
              })
            );
            return current;
          }
          return current.map((line) =>
            line.product === product._id ? { ...line, quantity: line.quantity + 1 } : line
          );
        }

        return [
          ...current,
          {
            product: product._id,
            nameEn: product.nameEn,
            nameTa: product.nameTa,
            sku: product.sku,
            unit: product.unit,
            image: product.image,
            sellingPrice: product.sellingPrice,
            catalogPrice: product.sellingPrice,
            stock: product.stock,
            quantity: 1,
          },
        ];
      });
    },
    [toast, t]
  );

  const step = (productId, delta) => {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.product !== productId) return [line];
        const next = Number((line.quantity + delta).toFixed(3));
        if (next <= 0) return [];
        if (next > line.stock) return [line];
        return [{ ...line, quantity: next }];
      })
    );
  };

  const setQuantity = (productId, value) => {
    const parsed = Number(value);
    setCart((current) =>
      current.map((line) => {
        if (line.product !== productId) return line;
        if (!Number.isFinite(parsed) || parsed < 0) return line;
        return { ...line, quantity: Math.min(parsed, line.stock) };
      })
    );
  };

  const setRate = (productId, value) => {
    const parsed = Number(value);
    setCart((current) =>
      current.map((line) => {
        if (line.product !== productId) return line;
        if (value === "" || !Number.isFinite(parsed) || parsed < 0) {
          return { ...line, sellingPrice: value === "" ? "" : line.sellingPrice };
        }
        return { ...line, sellingPrice: Number(parsed.toFixed(2)) };
      })
    );
  };

  const removeLine = (productId) => {
    setCart((current) => current.filter((line) => line.product !== productId));
  };

  const clearCart = async () => {
    const ok = await confirm({
      title: t("sale.clearCart"),
      message: t("sale.clearCartConfirm", { count: cart.length }),
      confirmLabel: t("common.clear"),
    });
    if (!ok) return;
    setCart([]);
    setDiscount("");
  };

  const resetSale = () => {
    setCart([]);
    setDiscount("");
    setCustomer({ name: "", phone: "" });
    setPayment("cash");
    setSearch("");
    setCompleted(null);
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.warning(t("errors.emptyCart"));
      return;
    }

    const invalidRate = cart.some((line) => {
      const rate = Number(line.sellingPrice);
      return !Number.isFinite(rate) || rate < 0;
    });
    if (invalidRate) {
      toast.warning(t("errors.positive"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await request.post("/sales", {
        items: cart.map((line) => ({
          product: line.product,
          quantity: line.quantity,
          sellingPrice: Number(line.sellingPrice),
        })),
        paymentMethod: payment,
        discount: discountValue,
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
      });

      toast.success(t("sale.success", { bill: result.sale.billNumber }), money(result.sale.total));
      setCompleted(result.sale);
      setCart([]);
      setDiscount("");
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const results = data?.products || [];

  return (
    <>
      <PageHeader
        title={t("sale.title")}
        subtitle={t("sale.subtitle")}
        actions={
          cart.length > 0 ? (
            <Button variant="ghost" size="sm" icon={HiOutlineTrash} onClick={clearCart}>
              {t("common.clear")}
            </Button>
          ) : null
        }
      />

      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-5">
        {/* -------------------------------- search -------------------------------- */}
        <div className={cn("min-w-0 lg:col-span-3", cart.length > 0 && "order-2 lg:order-1")}>
          <Input
            icon={HiOutlineMagnifyingGlass}
            placeholder={t("sale.searchPh")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="search"
            aria-label={t("common.search")}
          />

          <Card className="mt-3 overflow-hidden">
            {!searchParams ? (
              <EmptyState
                icon={HiOutlineMagnifyingGlass}
                title={t("sale.searchHint")}
                className="py-6 sm:py-10"
              />
            ) : isInitialLoading || loading ? (
              <div className="p-3">
                <SkeletonRows count={4} />
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                icon={HiOutlineShoppingCart}
                title={t("products.noMatch")}
                description={t("products.noMatchSub")}
                className="py-6 sm:py-10"
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {results.map((product) => (
                  <SearchResult
                    key={product._id}
                    product={product}
                    language={language}
                    t={t}
                    inCart={cartQuantities.get(product._id) || 0}
                    onAdd={addToCart}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* --------------------------------- cart --------------------------------- */}
        <div className={cn("min-w-0 lg:col-span-2", cart.length > 0 && "order-1 lg:order-2")}>
          <Card className="overflow-hidden lg:sticky lg:top-4">
            <CardHeader
              title={t("sale.cart")}
              subtitle={t("sale.lines", { count: cart.length })}
              icon={HiOutlineShoppingCart}
            />

            {cart.length === 0 ? (
              <EmptyState
                icon={HiOutlineShoppingCart}
                title={t("sale.emptyCart")}
                description={t("sale.emptyCartSub")}
                className="py-6 sm:py-9"
              />
            ) : (
              <>
                <p className="border-b border-ink-100 px-4 py-2 text-[11px] leading-snug text-ink-500">
                  {t("sale.rateHint")}
                </p>
                <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto overscroll-contain">
                  {cart.map((line) => (
                    <CartLine
                      key={line.product}
                      line={line}
                      language={language}
                      t={t}
                      onStep={step}
                      onSet={setQuantity}
                      onSetRate={setRate}
                      onRemove={removeLine}
                    />
                  ))}
                </ul>
              </>
            )}

            <div className="space-y-3 border-t border-ink-100 p-4">
              <SegmentedControl
                ariaLabel={t("sale.paymentMethod")}
                value={payment}
                onChange={setPayment}
                options={PAYMENTS.map((option) => ({
                  value: option.value,
                  label: t(`payment.${option.value}`),
                  icon: option.icon,
                }))}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <MoneyInput
                  label={t("sale.applyDiscount")}
                  placeholder={t("sale.discountPh")}
                  value={discount}
                  max={subtotal || undefined}
                  onChange={(event) => setDiscount(event.target.value)}
                />
                <Button
                  variant="outline"
                  icon={HiOutlineUserCircle}
                  className="mt-[26px]"
                  onClick={() => setCustomerOpen(true)}
                >
                  {customer.name || t("sale.customerDetails")}
                </Button>
              </div>

              <dl className="space-y-1.5 rounded-xl bg-ink-50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-xs font-medium text-ink-500">{t("common.subtotal")}</dt>
                  <dd className="text-sm font-semibold tabular text-ink-800">{money(subtotal)}</dd>
                </div>
                {discountValue > 0 ? (
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-xs font-medium text-ink-500">{t("common.discount")}</dt>
                    <dd className="text-sm font-semibold tabular text-danger-600">
                      −{money(discountValue)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-2 border-t border-ink-200 pt-1.5">
                  <dt className="text-[13px] font-bold text-ink-700">{t("sale.payable")}</dt>
                  <dd className="text-xl font-bold tabular text-ink-900">{money(payable)}</dd>
                </div>
              </dl>

              <Button
                size="lg"
                className="w-full"
                icon={HiOutlineCheckCircle}
                loading={submitting}
                disabled={cart.length === 0}
                onClick={completeSale}
              >
                {submitting ? t("sale.completing") : t("sale.complete")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ---------------------------- customer details ---------------------------- */}
      <Modal
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title={t("sale.customerDetails")}
        size="sm"
        footer={
          <Button className="w-full" onClick={() => setCustomerOpen(false)}>
            {t("common.done")}
          </Button>
        }
      >
        <div className="space-y-4 p-4">
          <Input
            label={t("sale.customerName")}
            placeholder={t("sale.customerNamePh")}
            value={customer.name}
            onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label={t("sale.customerPhone")}
            placeholder={t("sale.customerPhonePh")}
            type="tel"
            inputMode="tel"
            value={customer.phone}
            onChange={(event) =>
              setCustomer((current) => ({ ...current, phone: event.target.value }))
            }
          />
        </div>
      </Modal>

      {/* ------------------------------ success sheet ----------------------------- */}
      <Modal open={Boolean(completed)} onClose={resetSale} size="sm" showHeader={false}>
        {completed ? (
          <div className="p-6 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-50 text-success-600 animate-pop">
              <HiOutlineCheckCircle className="size-9" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink-900">{t("common.success")}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {t("sale.billNo")} <span className="font-semibold tabular">{completed.billNumber}</span>
            </p>
            <p className="mt-3 text-3xl font-bold tabular text-ink-900">{money(completed.total)}</p>
            <p className="mt-1 text-xs font-medium text-ink-400">
              {t(`payment.${completed.paymentMethod}`)} · {t("sale.lines", { count: completed.itemsCount })}
            </p>

            <div className="mt-6 space-y-2.5">
              <Button
                size="lg"
                className="w-full"
                icon={HiOutlineReceiptPercent}
                onClick={() => navigate(`/billing/${completed._id}`)}
              >
                {t("sale.viewBill")}
              </Button>
              <Button variant="outline" size="lg" className="w-full" icon={HiOutlinePlus} onClick={resetSale}>
                {t("sale.newSale")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
