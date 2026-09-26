import { forwardRef, useId, useState } from "react";
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { cn } from "../../lib/cn.js";

const CONTROL =
  "w-full rounded-xl border bg-white px-3.5 text-base text-ink-900 transition placeholder:text-ink-400 focus:outline-none disabled:bg-ink-50 disabled:text-ink-400";
const CONTROL_OK = "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100";
const CONTROL_ERROR = "border-danger-500 focus:border-danger-500 focus:ring-4 focus:ring-danger-100";

export function Label({ htmlFor, children, hint, required, className }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 flex items-baseline gap-1.5", className)}>
      <span className="text-[13px] font-semibold text-ink-700">{children}</span>
      {required ? <span className="text-danger-500">*</span> : null}
      {hint ? <span className="text-[11px] font-medium text-ink-400">{hint}</span> : null}
    </label>
  );
}

function Message({ error, help, id }) {
  if (error) {
    return (
      <p id={id} className="mt-1.5 text-xs font-medium text-danger-600 animate-slide-down">
        {error}
      </p>
    );
  }
  if (help) {
    return (
      <p id={id} className="mt-1.5 text-xs text-ink-500">
        {help}
      </p>
    );
  }
  return null;
}

export const Input = forwardRef(function Input(
  { label, hint, help, error, required, prefix, suffix, icon: Icon, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={inputId} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        ) : null}
        {prefix ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-ink-500">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || help ? messageId : undefined}
          className={cn(
            CONTROL,
            error ? CONTROL_ERROR : CONTROL_OK,
            "h-12",
            Icon || prefix ? "pl-10" : null,
            suffix ? "pr-12" : null
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-500">
            {suffix}
          </span>
        ) : null}
      </div>
      <Message error={error} help={help} id={messageId} />
    </div>
  );
});

export const MoneyInput = forwardRef(function MoneyInput(props, ref) {
  return (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      prefix="₹"
      placeholder="0"
      {...props}
    />
  );
});

export const PasswordInput = forwardRef(function PasswordInput(
  { showLabel, hideLabel, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} {...props} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? hideLabel : showLabel}
        className="absolute right-1.5 top-[30px] grid size-9 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
      >
        {visible ? (
          <HiOutlineEyeSlash className="size-5" aria-hidden="true" />
        ) : (
          <HiOutlineEye className="size-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, help, error, required, children, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const messageId = `${selectId}-message`;

  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={selectId} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || help ? messageId : undefined}
        className={cn(
          CONTROL,
          error ? CONTROL_ERROR : CONTROL_OK,
          "h-12 appearance-none bg-[length:18px] bg-[right_0.9rem_center] bg-no-repeat pr-10",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%23577a9e%22 stroke-width=%222%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')]"
        )}
        {...props}
      >
        {children}
      </select>
      <Message error={error} help={help} id={messageId} />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, help, error, required, className, id, rows = 3, ...props },
  ref
) {
  const generatedId = useId();
  const areaId = id || generatedId;
  const messageId = `${areaId}-message`;

  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={areaId} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || help ? messageId : undefined}
        className={cn(CONTROL, error ? CONTROL_ERROR : CONTROL_OK, "resize-y py-2.5")}
        {...props}
      />
      <Message error={error} help={help} id={messageId} />
    </div>
  );
});

export function Switch({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[13px] font-semibold text-ink-700">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-ink-500">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-brand-500" : "bg-ink-200"
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}
