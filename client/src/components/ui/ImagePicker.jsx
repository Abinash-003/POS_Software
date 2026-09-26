import { useEffect, useRef, useState } from "react";
import { HiOutlineCamera, HiOutlinePhoto, HiOutlineTrash } from "react-icons/hi2";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { assetUrl } from "../../lib/apiClient.js";
import { Label } from "./Field.jsx";
import { cn } from "../../lib/cn.js";

const MAX_MB = 4;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/**
 * Photo field used for products, expense receipts, supplier invoices and the
 * shop logo. Reports the chosen `File` upwards and previews it locally, so the
 * parent form can send everything as one multipart request.
 *
 * @param {object} props
 * @param {string} props.value        existing image path stored on the record
 * @param {(file: File | null) => void} props.onFileChange
 * @param {(removed: boolean) => void} props.onRemoveChange
 */
export function ImagePicker({
  label,
  value = "",
  onFileChange,
  onRemoveChange,
  shape = "square",
  className,
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    // Revoke the object URL when the component swaps or unmounts.
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview || assetUrl(value);

  const accept = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("image.invalid"));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(t("image.tooLarge", { size: MAX_MB }));
      return;
    }

    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    onFileChange?.(file);
    onRemoveChange?.(false);
  };

  const clear = () => {
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
    onFileChange?.(null);
    onRemoveChange?.(true);
  };

  return (
    <div className={className}>
      {label ? <Label hint={t("image.hint", { size: MAX_MB })}>{label}</Label> : null}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative grid size-20 shrink-0 place-items-center overflow-hidden border-2 border-dashed border-ink-200 bg-ink-50",
            shape === "circle" ? "rounded-full" : "rounded-2xl"
          )}
        >
          {shown ? (
            <img
              src={shown}
              alt={t("image.preview")}
              className="size-full object-cover animate-fade-in"
            />
          ) : (
            <HiOutlinePhoto className="size-7 text-ink-300" aria-hidden="true" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-50 px-3 text-[13px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100"
          >
            <HiOutlinePhoto className="size-4" aria-hidden="true" />
            {shown ? t("image.change") : t("image.gallery")}
          </button>

          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-ink-50 sm:hidden"
          >
            <HiOutlineCamera className="size-4" aria-hidden="true" />
            {t("image.camera")}
          </button>

          {shown ? (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-danger-600 transition hover:bg-danger-50"
            >
              <HiOutlineTrash className="size-4" aria-hidden="true" />
              {t("image.remove")}
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => accept(event.target.files?.[0])}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => accept(event.target.files?.[0])}
      />
    </div>
  );
}

/** Square product thumbnail with a graceful fallback to initials. */
export function ProductThumb({ image, name, size = "md", className }) {
  const [failed, setFailed] = useState(false);
  const source = assetUrl(image);
  const sizes = { sm: "size-10 text-xs", md: "size-12 text-sm", lg: "size-16 text-base" };

  if (!source || failed) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-500",
          sizes[size],
          className
        )}
        aria-hidden="true"
      >
        {(name || "?").trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={source}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-xl bg-ink-100 object-cover", sizes[size], className)}
    />
  );
}
