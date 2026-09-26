import { HiOutlineShoppingCart } from "react-icons/hi2";
import { assetUrl } from "../../lib/apiClient.js";
import { cn } from "../../lib/cn.js";

/**
 * Shop logo with a raised 3D frame, gloss highlight, and soft float —
 * keeps the mark readable on light chrome and in the entrance reveal.
 */
export function ShopLogo({ logo, className, size = "md", float = true }) {
  const source = assetUrl(logo);
  const sizeClass =
    size === "lg" ? "size-[4.5rem]" : size === "sm" ? "size-9" : size === "xl" ? "size-16" : "size-10";

  return (
    <span
      className={cn(
        "shop-logo-3d relative inline-grid shrink-0 place-items-center",
        sizeClass,
        float && "shop-logo-float",
        className
      )}
      aria-hidden={source ? undefined : true}
    >
      <span className="shop-logo-3d-glow" />
      <span className="shop-logo-3d-face">
        {source ? (
          <img src={source} alt="" className="shop-logo-3d-img" />
        ) : (
          <span className="shop-logo-3d-fallback">
            <HiOutlineShoppingCart className="size-[55%]" aria-hidden="true" />
          </span>
        )}
        <span className="shop-logo-3d-gloss" />
        <span className="shop-logo-3d-rim" />
      </span>
    </span>
  );
}
