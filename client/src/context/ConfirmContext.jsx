import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { HiOutlineExclamationTriangle, HiOutlineQuestionMarkCircle } from "react-icons/hi2";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { cn } from "../lib/cn.js";

const ConfirmContext = createContext(null);

/**
 * Replaces `window.confirm` with a themed, translated dialog.
 * Usage: `if (await confirm({ title, message, tone: "danger" })) { ... }`
 */
export function ConfirmProvider({ children }) {
  const { t } = useLanguage();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setDialog({ tone: "danger", ...options });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
    setBusy(false);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);
  const isDanger = dialog?.tone === "danger";
  const Icon = isDanger ? HiOutlineExclamationTriangle : HiOutlineQuestionMarkCircle;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(dialog)}
        onClose={() => !busy && settle(false)}
        size="sm"
        showHeader={false}
      >
        {dialog ? (
          <div className="p-5 text-center sm:p-6">
            <span
              className={cn(
                "mx-auto grid size-14 place-items-center rounded-full animate-pop",
                isDanger ? "bg-danger-50 text-danger-600" : "bg-brand-50 text-brand-600"
              )}
            >
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink-900">{dialog.title}</h2>
            {dialog.message ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{dialog.message}</p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="ghost" className="sm:flex-1" onClick={() => settle(false)} disabled={busy}>
                {dialog.cancelLabel || t("common.cancel")}
              </Button>
              <Button
                variant={isDanger ? "danger" : "primary"}
                className="sm:flex-1"
                loading={busy}
                onClick={() => {
                  setBusy(true);
                  settle(true);
                }}
              >
                {dialog.confirmLabel || t("common.confirm")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return context.confirm;
}
