import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../components/RequireAuth';
import { ProtectedShell } from '../layouts/ProtectedShell';

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const CustomersPage = lazy(() => import('../pages/CustomersPage').then((module) => ({ default: module.CustomersPage })));
const ProductsPage = lazy(() => import('../pages/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const StockPage = lazy(() => import('../pages/StockPage').then((module) => ({ default: module.StockPage })));
const InvoicesPage = lazy(() => import('../pages/InvoicesPage').then((module) => ({ default: module.InvoicesPage })));
const StatementsPage = lazy(() => import('../pages/StatementsPage').then((module) => ({ default: module.StatementsPage })));
const CreditNotesPage = lazy(() => import('../pages/CreditNotesPage').then((module) => ({ default: module.CreditNotesPage })));
const DeliveryNotesPage = lazy(() => import('../pages/DeliveryNotesPage').then((module) => ({ default: module.DeliveryNotesPage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const PortalPage = lazy(() => import('../pages/PortalPage').then((module) => ({ default: module.PortalPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const PaymentsPage = lazy(() => import('../pages/PaymentsPage').then((module) => ({ default: module.PaymentsPage })));
const CollectionsPage = lazy(() => import('../pages/CollectionsPage').then((module) => ({ default: module.CollectionsPage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const OfflineSyncPage = lazy(() => import('../pages/OfflineSyncPage').then((module) => ({ default: module.OfflineSyncPage })));
const SystemHealthPage = lazy(() => import('../pages/SystemHealthPage').then((module) => ({ default: module.SystemHealthPage })));

function PageLoading() {
  return <div className="flex min-h-[18rem] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />Loading workspace...</div></div>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <ProtectedShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/statements" element={<StatementsPage />} />
        <Route path="/credit-notes" element={<CreditNotesPage />} />
        <Route path="/delivery-notes" element={<DeliveryNotesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/portal" element={<PortalPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/offline-sync" element={<OfflineSyncPage />} />
        <Route path="/system-health" element={<SystemHealthPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
