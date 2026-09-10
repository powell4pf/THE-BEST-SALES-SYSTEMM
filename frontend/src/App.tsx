import { AppRoutes } from './routes/AppRoutes';
import { UpdatePrompt } from './components/UpdatePrompt';
import { ToastProvider } from './components/ToastProvider';
import { OfflineStatus } from './components/OfflineStatus';

export default function App() {
  return <ToastProvider><AppRoutes /><UpdatePrompt /><OfflineStatus /></ToastProvider>;
}
