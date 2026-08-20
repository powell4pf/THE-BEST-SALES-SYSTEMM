import { AppRoutes } from './routes/AppRoutes';
import { UpdatePrompt } from './components/UpdatePrompt';
import { ToastProvider } from './components/ToastProvider';

export default function App() {
  return <ToastProvider><AppRoutes /><UpdatePrompt /></ToastProvider>;
}
