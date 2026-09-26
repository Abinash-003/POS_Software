import { cn } from "../../lib/cn.js";

/**
 * Horizontally scrollable pill group. Used for date ranges, stock filters and
 * payment methods — thumb friendly on a phone, compact on a desktop.
 */
export function SegmentedControl({ options, value, onChange, size = "md", className, ariaLabel }) {
  const heights = { sm: "h-8 px-3 text-xs", md: "h-10 px-3.5 text-[13px]" };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-all duration-150 active:scale-[0.97]",
              heights[size],
              active
                ? "bg-brand-500 text-white shadow-float"
                : "bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"
            )}
          >
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular",
                  active ? "bg-white/25 text-white" : "bg-ink-100 text-ink-600"
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
