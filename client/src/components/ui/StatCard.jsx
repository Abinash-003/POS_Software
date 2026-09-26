import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";

const TONES = {
  brand: { icon: "bg-brand-50 text-brand-600", value: "text-ink-900" },
  success: { icon: "bg-success-50 text-success-600", value: "text-success-700" },
  warning: { icon: "bg-warn-50 text-warn-600", value: "text-warn-700" },
  danger: { icon: "bg-danger-50 text-danger-600", value: "text-danger-700" },
  neutral: { icon: "bg-ink-100 text-ink-600", value: "text-ink-900" },
};

export function StatCard({ label, value, hint, icon: Icon, tone = "brand", to, className }) {
  const palette = TONES[tone] || TONES.brand;
  const Tag = to ? Link : "div";

  return (
    <Tag
      {...(to ? { to } : {})}
      className={cn(
        "rounded-card border border-ink-100 bg-white p-3.5 shadow-card transition",
        to ? "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-float active:translate-y-0" : null,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <span className={cn("grid size-9 place-items-center rounded-xl", palette.icon)}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn("mt-0.5 truncate text-[21px] font-bold tabular", palette.value)}>{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] font-medium text-ink-400">{hint}</p> : null}
    </Tag>
  );
}
