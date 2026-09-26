import {
  HiOutlineArchiveBox,
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineChartPie,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineExclamationTriangle,
  HiOutlineHome,
  HiOutlineInboxArrowDown,
  HiOutlineReceiptPercent,
  HiOutlineShoppingCart,
  HiOutlineSquares2X2,
  HiOutlineUsers,
} from "react-icons/hi2";

/**
 * Single source of truth for the sidebar, the "More" sheet and the bottom bar.
 * `adminOnly` entries are filtered out for staff accounts.
 */
export const NAV_SECTIONS = [
  {
    id: "daily",
    labelKey: "nav.sections.daily",
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: HiOutlineHome, end: true },
      { to: "/sale", labelKey: "nav.quickSale", icon: HiOutlineShoppingCart },
      { to: "/billing", labelKey: "nav.billing", icon: HiOutlineReceiptPercent },
      { to: "/history", labelKey: "nav.history", icon: HiOutlineClipboardDocumentList },
    ],
  },
  {
    id: "inventory",
    labelKey: "nav.sections.inventory",
    items: [
      { to: "/products", labelKey: "nav.products", icon: HiOutlineArchiveBox },
      { to: "/stock-in", labelKey: "nav.stockIn", icon: HiOutlineInboxArrowDown },
      { to: "/alerts", labelKey: "nav.alerts", icon: HiOutlineExclamationTriangle, badge: "lowStock" },
      { to: "/categories", labelKey: "nav.categories", icon: HiOutlineSquares2X2, adminOnly: true },
    ],
  },
  {
    id: "money",
    labelKey: "nav.sections.money",
    items: [
      { to: "/expenses", labelKey: "nav.expenses", icon: HiOutlineBanknotes },
      { to: "/statistics", labelKey: "nav.stats", icon: HiOutlineArrowTrendingUp },
      { to: "/reports", labelKey: "nav.reports", icon: HiOutlineChartPie },
    ],
  },
  {
    id: "admin",
    labelKey: "nav.sections.admin",
    items: [
      { to: "/users", labelKey: "nav.users", icon: HiOutlineUsers, adminOnly: true },
      { to: "/settings", labelKey: "nav.settings", icon: HiOutlineCog6Tooth },
    ],
  },
];

export const BOTTOM_NAV = [
  { to: "/", labelKey: "nav.home", icon: HiOutlineHome, end: true },
  { to: "/sale", labelKey: "nav.sale", icon: HiOutlineShoppingCart },
  { to: "/products", labelKey: "nav.stock", icon: HiOutlineArchiveBox },
  { to: "/billing", labelKey: "nav.bills", icon: HiOutlineReceiptPercent },
];

export function visibleSections(isAdmin) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || isAdmin),
  })).filter((section) => section.items.length > 0);
}
