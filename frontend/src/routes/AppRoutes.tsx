import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../components/RequireAuth';
import { ProtectedShell } from '../layouts/ProtectedShell';
import { DashboardPage } from '../pages/DashboardPage';
import { CustomersPage } from '../pages/CustomersPage';
import { ProductsPage } from '../pages/ProductsPage';
import { StockPage } from '../pages/StockPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { StatementsPage } from '../pages/StatementsPage';
import { CreditNotesPage } from '../pages/CreditNotesPage';
import { ReportsPage } from '../pages/ReportsPage';
import { PortalPage } from '../pages/PortalPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LoginPage } from '../pages/LoginPage';

export function AppRoutes() {
  return (
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
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/portal" element={<PortalPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
