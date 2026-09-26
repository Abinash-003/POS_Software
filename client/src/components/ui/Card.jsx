import { cn } from "../../lib/cn.js";

export function Card({ className, children, as: Tag = "section", ...props }) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-ink-100 bg-white shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action, className }) {
  return (
    <div className={cn("flex items-start gap-3 border-b border-ink-100 px-4 py-3.5", className)}>
      {Icon ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
