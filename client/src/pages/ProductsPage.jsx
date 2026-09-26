import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  HiOutlineArchiveBox,
  HiOutlineInboxArrowDown,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import { useLanguage, localName } from "../i18n/LanguageProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useDebounced } from "../hooks/useDebounced.js";
import { useErrorToast } from "../hooks/useApiError.js";
import { request } from "../lib/apiClient.js";
import { money, quantity } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge, STOCK_TONES } from "../components/ui/Badge.jsx";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Input, Select } from "../components/ui/Field.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { ProductThumb } from "../components/ui/ImagePicker.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { ProgressBar } from "../components/ui/Spinner.jsx";
import { ProductFormModal } from "../components/products/ProductFormModal.jsx";

const STATUS_FILTERS = ["", "in", "low", "out"];

function ProductRow({ product, language, t, canManage, onEdit, onDelete }) {
  const name = localName(product, language);
  const status = product.stockStatus;

  return (
    <li className="flex items-center gap-3 p-3">
      <ProductThumb image={product.image} name={name} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 truncate text-[11px] font-medium text-ink-500">
          <span className="tabular">{product.sku}</span>
          {product.brand ? <span>· {product.brand}</span> : null}
          {product.category ? <span>· {localName(product.category, language)}</span> : null}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={STOCK_TONES[status]}>
            {status === "out"
              ? t("status.out")
              : `${quantity(product.stock)} ${t(`units.short.${product.unit}`)}`}
          </Badge>
          <span className="text-[11px] font-medium text-ink-400">
            {t("products.margin")} {money(product.marginPerUnit)}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[15px] font-bold tabular text-ink-900">{money(product.sellingPrice)}</p>
        <p className="text-[11px] font-medium text-ink-400 tabular">
          {money(product.purchasePrice)}
        </p>
      </div>

      {canManage ? (
        <div className="flex shrink-0 flex-col gap-1">
          <IconButton
            icon={HiOutlinePencilSquare}
            label={t("common.edit")}
            onClick={() => onEdit(product)}
          />
          <IconButton
            icon={HiOutlineTrash}
            label={t("common.delete")}
            variant="dangerGhost"
            onClick={() => onDelete(product)}
          />
        </div>
      ) : (
        <Link
          to={`/stock-in?product=${product._id}`}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
          aria-label={t("products.restock")}
          title={t("products.restock")}
        >
          <HiOutlineInboxArrowDown className="size-4" aria-hidden="true" />
        </Link>
      )}
    </li>
  );
}

export function ProductsPage() {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const showError = useErrorToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const debouncedSearch = useDebounced(search);

  const params = useMemo(
    () => ({
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
    }),
    [debouncedSearch, status, categoryId]
  );

  const { data, error, isInitialLoading, refreshing, refetch } = useFetch("/products", params);
  const { data: categoryData } = useFetch("/categories");
  const categories = categoryData?.categories || [];

  // Deep link from the dashboard quick action: /products?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1" && isAdmin) {
      setEditing(null);
      setFormOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const remove = async (product) => {
    const name = localName(product, language);
    const ok = await confirm({
      title: t("common.delete"),
      message: t("products.deleteConfirm", { name }),
      confirmLabel: t("common.delete"),
    });
    if (!ok) return;

    try {
      await request.delete(`/products/${product._id}`);
      toast.success(t("products.deleted"), name);
      refetch();
    } catch (requestError) {
      showError(requestError);
    }
  };

  const products = data?.products || [];
  const hasFilters = Boolean(debouncedSearch || status || categoryId);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setCategoryId("");
  };

  return (
    <>
      <PageHeader
        title={t("products.title")}
        subtitle={
          data ? t("products.count", { count: data.total }) : t("products.subtitle")
        }
        actions={
          isAdmin ? (
            <Button icon={HiOutlinePlus} onClick={openCreate}>
              <span className="hidden sm:inline">{t("products.addProduct")}</span>
              <span className="sm:hidden">{t("common.add")}</span>
            </Button>
          ) : null
        }
      >
        <div className="space-y-2.5">
          <div className="flex gap-2.5">
            <Input
              className="flex-1"
              icon={HiOutlineMagnifyingGlass}
              placeholder={t("products.searchPh")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              aria-label={t("common.search")}
            />
            <Select
              className="w-36 shrink-0 sm:w-48"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              aria-label={t("products.category")}
            >
              <option value="">{t("products.allCategories")}</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {localName(category, language)}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <SegmentedControl
              size="sm"
              className="flex-1"
              ariaLabel={t("common.filter")}
              value={status}
              onChange={setStatus}
              options={STATUS_FILTERS.map((option) => ({
                value: option,
                label: option === "" ? t("common.all") : t(`status.${option}`),
              }))}
            />
            {hasFilters ? (
              <Button variant="ghost" size="sm" icon={HiOutlineXMark} onClick={clearFilters}>
                {t("common.clear")}
              </Button>
            ) : null}
          </div>
        </div>
      </PageHeader>

      {refreshing ? <ProgressBar className="mb-3" /> : null}

      {isInitialLoading ? (
        <SkeletonRows count={6} />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <EmptyState
            icon={HiOutlineArchiveBox}
            title={t(hasFilters ? "products.noMatch" : "products.none")}
            description={t(hasFilters ? "products.noMatchSub" : "products.noneSub")}
            action={
              hasFilters ? (
                <Button variant="outline" icon={HiOutlineXMark} onClick={clearFilters}>
                  {t("common.clear")}
                </Button>
              ) : isAdmin ? (
                <Button icon={HiOutlinePlus} onClick={openCreate}>
                  {t("products.addProduct")}
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-100">
            {products.map((product) => (
              <ProductRow
                key={product._id}
                product={product}
                language={language}
                t={t}
                canManage={isAdmin}
                onEdit={openEdit}
                onDelete={remove}
              />
            ))}
          </ul>
          {data.total > products.length ? (
            <p className="border-t border-ink-100 px-4 py-2.5 text-center text-xs font-medium text-ink-400">
              {t("common.showing", { count: products.length, total: data.total })}
            </p>
          ) : null}
        </Card>
      )}

      {isAdmin ? (
        <ProductFormModal
          open={formOpen}
          product={editing}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={refetch}
        />
      ) : null}
    </>
  );
}
