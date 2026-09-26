import { cn } from "../../lib/cn.js";

export function Skeleton({ className, style }) {
  return (
    <div className={cn("skeleton-shimmer rounded-lg", className)} style={style} aria-hidden="true" />
  );
}

export function SkeletonText({ lines = 2, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-ink-100 bg-white p-4 shadow-card">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="mt-3 h-3 w-20" />
          <Skeleton className="mt-2 h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5, withImage = true }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3 shadow-card"
        >
          {withImage ? <Skeleton className="size-12 shrink-0 rounded-xl" /> : null}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }) {
  return (
    <div className={cn("flex h-56 items-end gap-2 px-2", className)} aria-hidden="true">
      {[45, 70, 35, 85, 55, 95, 60].map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-t-lg" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
