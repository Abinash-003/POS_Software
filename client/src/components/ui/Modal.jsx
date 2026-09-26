import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HiXMark } from "react-icons/hi2";
import { cn } from "../../lib/cn.js";

const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

/**
 * Bottom sheet on phones, centred dialog from `sm` upwards.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  showHeader = true,
  footer,
  children,
  bodyClassName,
}) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink-900/45 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none animate-slide-up sm:rounded-3xl sm:animate-scale-in",
          SIZES[size]
        )}
      >
        {showHeader ? (
          <header className="flex items-start gap-3 border-b border-ink-100 px-4 py-3.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-ink-900">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-800"
              aria-label="Close"
            >
              <HiXMark className="size-5" aria-hidden="true" />
            </button>
          </header>
        ) : null}

        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <footer className="safe-bottom border-t border-ink-100 bg-ink-50/70 px-4 py-3 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
