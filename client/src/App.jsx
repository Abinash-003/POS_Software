import { lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useLanguage } from "./i18n/LanguageProvider.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useToast } from "./context/ToastContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { SplashScreen } from "./components/ui/Spinner.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";

/**
 * Screens load on demand. The shop runs on phones over mobile data, so the
 * first download stays small and the chart/report libraries only arrive when
 * someone actually opens those screens.
 */
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx").then((m) => ({ default: m.DashboardPage })));
const QuickSalePage = lazy(() => import("./pages/QuickSalePage.jsx").then((m) => ({ default: m.QuickSalePage })));
const BillingPage = lazy(() => import("./pages/BillingPage.jsx").then((m) => ({ default: m.BillingPage })));
const SalesHistoryPage = lazy(() => import("./pages/SalesHistoryPage.jsx").then((m) => ({ default: m.SalesHistoryPage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx").then((m) => ({ default: m.ProductsPage })));
const StockInPage = lazy(() => import("./pages/StockInPage.jsx").then((m) => ({ default: m.StockInPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage.jsx").then((m) => ({ default: m.AlertsPage })));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage.jsx").then((m) => ({ default: m.CategoriesPage })));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage.jsx").then((m) => ({ default: m.ExpensesPage })));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage.jsx").then((m) => ({ default: m.StatisticsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx").then((m) => ({ default: m.SettingsPage })));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx").then((m) => ({ default: m.UsersPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx").then((m) => ({ default: m.NotFoundPage })));

function RequireAuth({ children }) {
  const { isReady, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (!isReady) return <SplashScreen label={t("common.loading")} />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

/** Surfaces connectivity changes, which matters on a shop counter tablet. */
function useConnectivityToasts() {
  const toast = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const goOffline = () => toast.warning(t("common.offline"));
    const goOnline = () => toast.success(t("common.backOnline"));

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [toast, t]);
}

export function App() {
  useConnectivityToasts();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <SettingsProvider>
              <AppLayout />
            </SettingsProvider>
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sale" element={<QuickSalePage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/:id" element={<BillingPage />} />
        <Route path="history" element={<SalesHistoryPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="stock-in" element={<StockInPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        <Route
          path="categories"
          element={
            <RequireAdmin>
              <CategoriesPage />
            </RequireAdmin>
          }
        />
        <Route
          path="users"
          element={
            <RequireAdmin>
              <UsersPage />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
