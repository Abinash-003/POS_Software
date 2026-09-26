import { HiOutlineArrowPath, HiOutlineExclamationTriangle, HiOutlineInbox } from "react-icons/hi2";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { useErrorMessage } from "../../hooks/useApiError.js";
import { Button } from "./Button.jsx";
import { cn } from "../../lib/cn.js";

export function EmptyState({ icon: Icon = HiOutlineInbox, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-400">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink-800">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  const { t } = useLanguage();
  const describe = useErrorMessage();
  const { title, description } = describe(error);

  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-danger-50 text-danger-500">
        <HiOutlineExclamationTriangle className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink-800">{title}</p>
      {description ? <p className="mt-1.5 max-w-xs text-sm text-ink-500">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" icon={HiOutlineArrowPath} className="mt-5" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
