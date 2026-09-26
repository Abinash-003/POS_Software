import { HiOutlineShoppingCart } from "react-icons/hi2";
import { assetUrl } from "../../lib/apiClient.js";
import { cn } from "../../lib/cn.js";

/** Flat shop mark — border sits outside the logo so the image size stays the same. */
export function ShopLogo({ logo, className, size = "md" }) {
  const source = assetUrl(logo);
  const sizeClass =
    size === "lg" ? "size-[4.5rem]" : size === "sm" ? "size-9" : size === "xl" ? "size-16" : "size-10";

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-xl border border-ink-200 bg-white p-1.5",
        className
      )}
      aria-hidden={source ? undefined : true}
    >
      {source ? (
        <img src={source} alt="" className={cn("rounded-lg object-cover", sizeClass)} />
      ) : (
        <span
          className={cn(
            "grid place-items-center rounded-lg bg-brand-500 text-white",
            sizeClass
          )}
        >
          <HiOutlineShoppingCart className="size-[55%]" />
        </span>
      )}
    </span>
  );
}
