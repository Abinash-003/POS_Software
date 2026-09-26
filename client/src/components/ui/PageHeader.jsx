import { cn } from "../../lib/cn.js";

export function PageHeader({ title, subtitle, actions, className, children }) {
  return (
    <header className={cn("mb-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-ink-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-3.5">{children}</div> : null}
    </header>
  );
}
