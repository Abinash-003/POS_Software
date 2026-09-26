import { cn } from "../../lib/cn.js";

const TONES = {
  neutral: "bg-ink-100 text-ink-600",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  success: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-100",
  warning: "bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-100",
  danger: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-100",
  solid: "bg-brand-500 text-white",
};

export function Badge({ tone = "neutral", icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
        className
      )}
    >
      {Icon ? <Icon className="size-3" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export const STOCK_TONES = { in: "success", low: "warning", out: "danger" };
