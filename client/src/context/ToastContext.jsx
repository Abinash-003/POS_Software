import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineXCircle,
  HiXMark,
} from "react-icons/hi2";
import { cn } from "../lib/cn.js";

const ToastContext = createContext(null);

const VARIANTS = {
  success: {
    Icon: HiOutlineCheckCircle,
    shell: "border-success-100 bg-white",
    accent: "bg-success-500",
    icon: "bg-success-50 text-success-600",
  },
  error: {
    Icon: HiOutlineXCircle,
    shell: "border-danger-100 bg-white",
    accent: "bg-danger-500",
    icon: "bg-danger-50 text-danger-600",
  },
  warning: {
    Icon: HiOutlineExclamationTriangle,
    shell: "border-warn-100 bg-white",
    accent: "bg-warn-500",
    icon: "bg-warn-50 text-warn-600",
  },
  info: {
    Icon: HiOutlineInformationCircle,
    shell: "border-brand-100 bg-white",
    accent: "bg-brand-500",
    icon: "bg-brand-50 text-brand-600",
  },
};

const DURATIONS = { success: 3200, info: 3600, warning: 4600, error: 5200 };

function Toast({ toast, onDismiss }) {
  const variant = VARIANTS[toast.variant] || VARIANTS.info;
  const { Icon } = variant;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 shadow-card animate-slide-up",
        variant.shell
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", variant.accent)} aria-hidden="true" />
      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", variant.icon)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-[13px] leading-snug text-ink-600">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
        aria-label="Dismiss"
      >
        <HiXMark className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, title, description) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      // Cap the stack so a burst of errors cannot bury the screen.
      setToasts((current) => [...current.slice(-2), { id, variant, title, description }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATIONS[variant] || 3600)
      );
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      warning: (title, description) => push("warning", title, description),
      info: (title, description) => push("info", title, description),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-3 pt-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:max-w-sm sm:items-end sm:px-0 sm:pt-0">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
