import { HiOutlineLanguage } from "react-icons/hi2";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { cn } from "../../lib/cn.js";

const LANGUAGES = [
  { code: "en", short: "EN", label: "English" },
  { code: "ta", short: "தமிழ்", label: "தமிழ்" },
];

/**
 * Two-state switch kept in the header on every screen so the language can be
 * changed without hunting through settings.
 */
export function LanguageToggle({ variant = "compact", className }) {
  const { language, setLanguage, t } = useLanguage();
  const toast = useToast();

  const choose = (code) => {
    if (code === language) return;
    setLanguage(code);
    // The dictionary swap is synchronous, so read the message from the target.
    toast.success(code === "ta" ? "மொழி தமிழுக்கு மாற்றப்பட்டது" : "Language changed to English");
  };

  if (variant === "full") {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        {LANGUAGES.map((option) => {
          const active = option.code === language;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => choose(option.code)}
              aria-pressed={active}
              className={cn(
                "flex h-14 items-center justify-center gap-2 rounded-xl border-2 text-[15px] font-semibold transition-all active:scale-[0.98]",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-200 bg-white text-ink-600 hover:border-brand-200 hover:bg-brand-50/40"
              )}
            >
              <HiOutlineLanguage className="size-5" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("lang.choose")}
      className={cn("flex items-center gap-0.5 rounded-full bg-ink-100 p-0.5", className)}
    >
      {LANGUAGES.map((option) => {
        const active = option.code === language;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => choose(option.code)}
            aria-pressed={active}
            className={cn(
              "h-8 rounded-full px-2.5 text-xs font-bold transition-all",
              active ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-800"
            )}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
