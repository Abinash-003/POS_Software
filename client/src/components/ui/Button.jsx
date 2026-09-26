import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";
import { Spinner } from "./Spinner.jsx";

const VARIANTS = {
  primary:
    "bg-black text-white shadow-float hover:bg-ink-800 active:bg-ink-900 disabled:bg-ink-300 disabled:shadow-none",
  secondary:
    "bg-ink-100 text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-200 active:bg-ink-300",
  outline:
    "bg-white text-ink-800 ring-1 ring-inset ring-ink-300 hover:bg-ink-50 hover:text-ink-900 active:bg-ink-100",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200",
  danger:
    "bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 disabled:bg-danger-500/50",
  dangerGhost: "bg-transparent text-danger-600 hover:bg-danger-50 active:bg-danger-100",
  success: "bg-success-500 text-white hover:bg-success-600 active:bg-success-700",
};

const SIZES = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-11 gap-2 rounded-xl px-4 text-sm",
  lg: "h-13 gap-2 rounded-xl px-5 text-[15px]",
  icon: "size-11 rounded-xl",
  iconSm: "size-9 rounded-lg",
};

export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    disabled = false,
    className,
    children,
    to,
    type = "button",
    ...props
  },
  ref
) {
  const classes = cn(
    "inline-flex select-none items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    className
  );

  const content = (
    <>
      {loading ? (
        <Spinner size="sm" />
      ) : Icon ? (
        <Icon className={size === "sm" ? "size-4" : "size-5"} aria-hidden="true" />
      ) : null}
      {children}
      {IconRight && !loading ? (
        <IconRight className={size === "sm" ? "size-4" : "size-5"} aria-hidden="true" />
      ) : null}
    </>
  );

  if (to && !disabled && !loading) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
});

/** Circular action button used in card corners and list rows. */
export function IconButton({ icon: Icon, label, variant = "ghost", size = "iconSm", ...props }) {
  return (
    <Button variant={variant} size={size} aria-label={label} title={label} {...props}>
      <Icon className={size === "icon" ? "size-5" : "size-4"} aria-hidden="true" />
    </Button>
  );
}
