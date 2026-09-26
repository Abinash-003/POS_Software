import { useCallback } from "react";
import { useLanguage } from "../i18n/LanguageProvider.jsx";
import { useToast } from "../context/ToastContext.jsx";

/**
 * Turns a `RequestError` code into a translated sentence, enriching the
 * "insufficient stock" case with the product name and available quantity.
 */
export function useErrorMessage() {
  const { t, language } = useLanguage();

  return useCallback(
    (error) => {
      const code = error?.code || "server";

      if (code === "insufficient" && error.details) {
        const name = language === "ta" ? error.details.nameTa : error.details.nameEn;
        return {
          title: t("errors.insufficient"),
          description: `${name || ""} — ${t("sale.insufficient", {
            stock: error.details.available ?? 0,
            unit: "",
          })}`.trim(),
        };
      }

      const message = t(`errors.${code}`);
      return {
        title: message === `errors.${code}` ? t("common.somethingWrong") : message,
        description: undefined,
      };
    },
    [t, language]
  );
}

/** Shows any request failure as an error toast. */
export function useErrorToast() {
  const toast = useToast();
  const describe = useErrorMessage();

  return useCallback(
    (error) => {
      const { title, description } = describe(error);
      toast.error(title, description);
    },
    [toast, describe]
  );
}
