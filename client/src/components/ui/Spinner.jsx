import { cn } from "../../lib/cn.js";

const SIZES = { xs: "size-3.5 border", sm: "size-4 border-2", md: "size-6 border-2", lg: "size-9 border-[3px]" };

export function Spinner({ size = "sm", className, label }) {
  return (
    <span
      role="status"
      aria-label={label || "Loading"}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent",
        SIZES[size],
        className
      )}
    />
  );
}

/** Centred spinner with a caption, for full panel loads. */
export function LoadingPanel({ label, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-14 text-ink-500", className)}>
      <Spinner size="lg" className="text-brand-500" />
      {label ? <p className="text-sm font-medium">{label}</p> : null}
    </div>
  );
}

/** Thin indeterminate bar used while a screen refreshes in the background. */
export function ProgressBar({ className }) {
  return (
    <div
      className={cn("h-0.5 w-full overflow-hidden rounded-full bg-brand-100", className)}
      role="progressbar"
      aria-label="Loading"
    >
      <div className="h-full w-full origin-left bg-brand-500 animate-progress" />
    </div>
  );
}

/** Branded first-paint screen shown while the session is verified. */
export function SplashScreen({ label }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink-50">
      <div className="relative grid size-16 place-items-center rounded-2xl bg-brand-500 shadow-float animate-pop">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-400 opacity-20" />
        <svg viewBox="0 0 64 64" className="size-9" aria-hidden="true">
          <path
            d="M16 22h5l3.2 18.4a3 3 0 0 0 3 2.5h16.5a3 3 0 0 0 2.9-2.2L50 27H24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="50" r="3.2" fill="#ffffff" />
          <circle cx="44" cy="50" r="3.2" fill="#ffffff" />
        </svg>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-ink-500">
        <Spinner size="xs" className="text-brand-500" />
        {label}
      </div>
    </div>
  );
}
