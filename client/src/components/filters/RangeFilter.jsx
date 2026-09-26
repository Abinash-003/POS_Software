import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { Input } from "../ui/Field.jsx";

export const RANGE_OPTIONS = ["today", "yesterday", "week", "month", "all", "custom"];

/**
 * Period picker shared by history, expenses, statistics and reports.
 * Custom mode reveals two date inputs and only reports back once a date is set.
 */
export function RangeFilter({ value, onChange, options = RANGE_OPTIONS, className }) {
  const { t } = useLanguage();

  return (
    <div className={className}>
      <SegmentedControl
        ariaLabel={t("filters.range")}
        value={value.range}
        onChange={(range) => onChange({ ...value, range })}
        options={options.map((option) => ({ value: option, label: t(`filters.${option}`) }))}
      />

      {value.range === "custom" ? (
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 animate-slide-down">
          <Input
            type="date"
            label={t("common.from")}
            value={value.from || ""}
            max={value.to || undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
          />
          <Input
            type="date"
            label={t("common.to")}
            value={value.to || ""}
            min={value.from || undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Strips empty custom bounds so the API never receives `from=&to=`. */
export function rangeParams(value) {
  if (value.range !== "custom") return { range: value.range };
  return {
    range: "custom",
    ...(value.from ? { from: value.from } : {}),
    ...(value.to ? { to: value.to } : {}),
  };
}
