import { Outlet } from 'react-router-dom';
import { AppShell } from './AppShell';

export function ProtectedShell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

