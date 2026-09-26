import { useId, useRef, useState } from "react";
import { HiOutlineLanguage } from "react-icons/hi2";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useErrorToast } from "../../hooks/useApiError.js";
import { request } from "../../lib/apiClient.js";
import { cn } from "../../lib/cn.js";
import { Label } from "./Field.jsx";

/**
 * English + Tamil pair with a small translate button inside each field.
 * The icon fills the field you tap, using the other language as the source:
 * - Tamil button → translate English → fill Tamil
 * - English button → translate Tamil → fill English
 * Translation only runs when the button is tapped — never while typing.
 */
export function BilingualFields({
  enLabel,
  taLabel,
  enValue,
  taValue,
  onEnChange,
  onTaChange,
  enError,
  taError,
  enPlaceholder,
  taPlaceholder,
  enHelp,
  taHelp,
  required = false,
  multiline = false,
  rows = 2,
  className,
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const showError = useErrorToast();
  const [busy, setBusy] = useState(null); // "en" | "ta" | null

  // Keep latest values in refs so a tap always uses what is on screen now.
  const enRef = useRef(enValue);
  const taRef = useRef(taValue);
  enRef.current = enValue;
  taRef.current = taValue;

  const runFill = async ({ targetLang, sourceLang, sourceText, apply }) => {
    const text = (sourceText || "").trim();
    if (!text) {
      toast.warning(t("translate.needSource"));
      return;
    }

    setBusy(targetLang);
    try {
      const data = await request.post("/translate", {
        text,
        from: sourceLang,
        to: targetLang,
      });
      apply(data?.text || "");
      toast.success(t("translate.done"));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(null);
    }
  };

  /** Icon inside Tamil field → fill Tamil from English */
  const fillTamilFromEnglish = () =>
    runFill({
      targetLang: "ta",
      sourceLang: "en",
      sourceText: enRef.current,
      apply: onTaChange,
    });

  /** Icon inside English field → fill English from Tamil */
  const fillEnglishFromTamil = () =>
    runFill({
      targetLang: "en",
      sourceLang: "ta",
      sourceText: taRef.current,
      apply: onEnChange,
    });

  const Field = multiline ? TextareaWithTranslate : InputWithTranslate;

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <Field
        label={enLabel}
        value={enValue}
        onChange={(event) => onEnChange(event.target.value)}
        error={enError}
        placeholder={enPlaceholder}
        help={enHelp}
        required={required}
        rows={rows}
        translateLabel={t("translate.toEnglish")}
        translating={busy === "en"}
        disabledTranslate={busy !== null}
        onTranslate={fillEnglishFromTamil}
      />
      <Field
        label={taLabel}
        value={taValue}
        onChange={(event) => onTaChange(event.target.value)}
        error={taError}
        placeholder={taPlaceholder}
        help={taHelp}
        required={required}
        rows={rows}
        translateLabel={t("translate.toTamil")}
        translating={busy === "ta"}
        disabledTranslate={busy !== null}
        onTranslate={fillTamilFromEnglish}
        tamil
      />
    </div>
  );
}

function InputWithTranslate({
  label,
  value,
  onChange,
  error,
  placeholder,
  help,
  required,
  translateLabel,
  translating,
  disabledTranslate,
  onTranslate,
  tamil,
}) {
  const id = useId();

  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-12 w-full rounded-xl border bg-white py-2 pl-3.5 pr-12 text-base text-ink-900 transition placeholder:text-ink-400 focus:outline-none",
            error
              ? "border-danger-500 focus:border-danger-500 focus:ring-4 focus:ring-danger-100"
              : "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
            tamil ? "font-tamil" : null
          )}
        />
        <TranslateButton
          label={translateLabel}
          busy={translating}
          disabled={disabledTranslate}
          onClick={onTranslate}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger-600">{error}</p>
      ) : help ? (
        <p className="mt-1.5 text-xs text-ink-500">{help}</p>
      ) : null}
    </div>
  );
}

function TextareaWithTranslate({
  label,
  value,
  onChange,
  error,
  placeholder,
  help,
  required,
  rows = 2,
  translateLabel,
  translating,
  disabledTranslate,
  onTranslate,
  tamil,
}) {
  const id = useId();

  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full resize-y rounded-xl border bg-white py-2.5 pl-3.5 pr-12 text-base text-ink-900 transition placeholder:text-ink-400 focus:outline-none",
            error
              ? "border-danger-500 focus:border-danger-500 focus:ring-4 focus:ring-danger-100"
              : "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
            tamil ? "font-tamil" : null
          )}
        />
        <TranslateButton
          label={translateLabel}
          busy={translating}
          disabled={disabledTranslate}
          onClick={onTranslate}
          className="top-2"
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger-600">{error}</p>
      ) : help ? (
        <p className="mt-1.5 text-xs text-ink-500">{help}</p>
      ) : null}
    </div>
  );
}

function TranslateButton({ label, busy, disabled, onClick, className }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "absolute right-1.5 grid size-9 place-items-center rounded-lg text-brand-600 transition",
        "hover:bg-brand-50 active:bg-brand-100 disabled:pointer-events-none disabled:opacity-40",
        className || "top-1/2 -translate-y-1/2"
      )}
    >
      {busy ? (
        <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      ) : (
        <HiOutlineLanguage className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
