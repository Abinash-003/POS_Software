import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowDownTray,
  HiOutlineMagnifyingGlass,
  HiOutlinePrinter,
  HiOutlineReceiptPercent,
  HiOutlineTrash,
} from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useDebounced } from "../hooks/useDebounced.js";
import { useErrorToast } from "../hooks/useApiError.js";
import { request } from "../lib/apiClient.js";
import { elementToPdf } from "../lib/pdf.js";
import { money, formatDateTime } from "../lib/format.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { Card, CardHeader } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Field.jsx";
import { EmptyState, ErrorState } from "../components/ui/States.jsx";
import { SkeletonRows } from "../components/ui/Skeleton.jsx";
import { LoadingPanel } from "../components/ui/Spinner.jsx";
import { BillReceipt } from "../components/billing/BillReceipt.jsx";
import { cn } from "../lib/cn.js";

export function BillingPage() {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const showError = useErrorToast();

  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const receipt = useRef(null);

  const debouncedSearch = useDebounced(search);
  const listParams = useMemo(
    () => ({ limit: 40, ...(debouncedSearch ? { q: debouncedSearch } : {}) }),
    [debouncedSearch]
  );

  const {
    data: list,
    error: listError,
    isInitialLoading: listLoading,
    refetch: refetchList,
  } = useFetch("/sales", listParams);

  const {
    data: detail,
    error: detailError,
    loading: detailLoading,
  } = useFetch(id ? `/sales/${id}` : null, null, { enabled: Boolean(id) });

  const sales = useMemo(() => list?.sales || [], [list]);
  const sale = detail?.sale;

  // Land on the newest bill when the page is opened without an id.
  useEffect(() => {
    if (!id && sales.length > 0) navigate(`/billing/${sales[0]._id}`, { replace: true });
  }, [id, sales, navigate]);

  const print = () => {
    toast.info(t("billing.printing"));
    // Give the browser a tick to settle layout before opening the dialog.
    setTimeout(() => window.print(), 120);
  };

  const download = async () => {
    if (!sale) return;
    setDownloading(true);
    toast.info(t("billing.generating"));
    try {
      await elementToPdf(receipt.current, `${sale.billNumber}.pdf`);
      toast.success(t("billing.downloaded", { bill: sale.billNumber }));
    } catch {
      toast.error(t("billing.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const voidBill = async () => {
    if (!sale) return;
    const ok = await confirm({
      title: t("billing.void"),
      message: t("billing.voidConfirm", { bill: sale.billNumber }),
      confirmLabel: t("billing.void"),
    });
    if (!ok) return;

    try {
      await request.delete(`/sales/${sale._id}`);
      toast.success(t("billing.voided"));
      navigate("/billing", { replace: true });
      refetchList();
    } catch (error) {
      showError(error);
    }
  };

  return (
    <>
      <div className="print-hidden">
        <PageHeader
          title={t("billing.title")}
          subtitle={t("billing.subtitle")}
          actions={
            sale ? (
              <>
                <Button variant="outline" icon={HiOutlinePrinter} onClick={print}>
                  <span className="hidden sm:inline">{t("common.print")}</span>
                </Button>
                <Button icon={HiOutlineArrowDownTray} loading={downloading} onClick={download}>
                  <span className="hidden sm:inline">{t("common.downloadPdf")}</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </>
            ) : null
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ------------------------------- bill list ------------------------------- */}
        <div className="print-hidden lg:col-span-2">
          <Card>
            <CardHeader title={t("billing.recentBills")} icon={HiOutlineReceiptPercent} />

            <div className="border-b border-ink-100 p-3">
              <Input
                icon={HiOutlineMagnifyingGlass}
                placeholder={t("billing.searchPh")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                aria-label={t("common.search")}
              />
            </div>

            {listLoading ? (
              <div className="p-3">
                <SkeletonRows count={5} withImage={false} />
              </div>
            ) : listError ? (
              <ErrorState error={listError} onRetry={refetchList} />
            ) : sales.length === 0 ? (
              <EmptyState
                icon={HiOutlineReceiptPercent}
                title={t("billing.none")}
                description={t("billing.noneSub")}
                className="py-10"
              />
            ) : (
              <ul className="max-h-[32rem] divide-y divide-ink-100 overflow-y-auto overscroll-contain">
                {sales.map((row) => (
                  <li key={row._id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/billing/${row._id}`)}
                      className={cn(
                        "flex w-full items-center gap-3 p-3 text-left transition",
                        row._id === id ? "bg-brand-50" : "hover:bg-brand-50/50"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1 self-stretch rounded-full",
                          row._id === id ? "bg-brand-500" : "bg-transparent"
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-900 tabular">
                          {row.billNumber}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                          {formatDateTime(row.createdAt, language)}
                        </p>
                        <p className="truncate text-[11px] text-ink-400">
                          {row.customerName || t("billing.walkIn")} ·{" "}
                          {t(`payment.${row.paymentMethod}`)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular text-ink-900">
                        {money(row.total)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ------------------------------ bill preview ----------------------------- */}
        <div className="lg:col-span-3">
          {!id ? (
            <Card className="print-hidden">
              <EmptyState
                icon={HiOutlineReceiptPercent}
                title={t("billing.selectBill")}
                description={t("billing.selectBillSub")}
              />
            </Card>
          ) : detailLoading && !sale ? (
            <Card className="print-hidden">
              <LoadingPanel label={t("common.loading")} />
            </Card>
          ) : detailError ? (
            <Card className="print-hidden">
              <ErrorState error={detailError} />
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden animate-fade-in">
                <BillReceipt ref={receipt} sale={sale} />
              </Card>

              <div className="print-hidden mt-3 flex flex-wrap gap-2.5">
                <Button variant="outline" className="flex-1" icon={HiOutlinePrinter} onClick={print}>
                  {t("common.print")}
                </Button>
                <Button
                  className="flex-1"
                  icon={HiOutlineArrowDownTray}
                  loading={downloading}
                  onClick={download}
                >
                  {t("common.downloadPdf")}
                </Button>
                {isAdmin ? (
                  <Button variant="dangerGhost" icon={HiOutlineTrash} onClick={voidBill}>
                    {t("billing.void")}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
