import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type TourStep = { target?: string; title: string; body: string };

const steps: TourStep[] = [
  { title: 'Welcome to your sales workspace', body: 'This short tour introduces the main controls for customers, products, stock, invoices, payments, reports, and administration.' },
  { target: 'navigation', title: 'Move around the system', body: 'Use this navigation menu to open every major area. The active page is highlighted so you always know where you are.' },
  { target: 'page-content', title: 'Your current work area', body: 'Each page keeps its main information and primary actions together. Look for the main action button near the page heading to create or update records.' },
  { target: 'search', title: 'Find records quickly', body: 'Use Search or press Ctrl K to find customers, products, and invoices without manually opening each page.' },
  { target: 'topbar-actions', title: 'Common controls', body: 'Refresh data, switch between light and dark mode, and open notifications from the top bar.' },
  { target: 'notifications', title: 'Stay informed', body: 'The notification bell highlights important activity such as invoices, payments, low stock, overdue accounts, and system updates.' },
  { target: 'connection-status', title: 'Know your connection state', body: 'This indicator shows whether the system is online or offline. Offline drafts are stored safely and synchronize when the connection returns.' },
  { target: 'mobile-actions', title: 'Fast actions on mobile', body: 'On a phone, use these quick actions to add an invoice, record a payment, add stock, check balances, or scan a barcode.' },
  { title: 'You are ready to begin', body: 'Start with Customers and Products, then create your first Invoice. You can reopen this tour later from the Help button in the workspace.' }
];

const TOUR_KEY_PREFIX = 'nurtured-choice.onboarding.completed.';

export function OnboardingTour() {
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const storageKey = useMemo(() => user ? `${TOUR_KEY_PREFIX}${user.id || user.email}` : null, [user]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      if (!window.localStorage.getItem(storageKey)) {
        const timer = window.setTimeout(() => setOpen(true), 700);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
  }, [storageKey]);

  useEffect(() => {
    const reopen = () => { setStepIndex(0); setOpen(true); };
    window.addEventListener('nurtured-choice-open-onboarding', reopen);
    return () => window.removeEventListener('nurtured-choice-open-onboarding', reopen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const targetName = steps[stepIndex].target;
    const measure = () => {
      if (!targetName) { setRect(null); return; }
      const element = Array.from(document.querySelectorAll<HTMLElement>(`[data-onboarding="${targetName}"]`)).find((candidate) => {
        const candidateRect = candidate.getBoundingClientRect();
        return candidateRect.width > 0 && candidateRect.height > 0;
      });
      if (!element) { setRect(null); return; }
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      setRect(element.getBoundingClientRect());
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, stepIndex]);

  if (!open) return null;

  const step = steps[stepIndex];
  const close = (completed: boolean) => {
    if (completed && storageKey) {
      try { window.localStorage.setItem(storageKey, 'true'); } catch { /* onboarding is optional */ }
    }
    setOpen(false);
  };
  const next = () => stepIndex === steps.length - 1 ? close(true) : setStepIndex((value) => value + 1);
  const popupWidth = Math.min(360, window.innerWidth - 32);
  const popupLeft = rect ? Math.max(16, Math.min(window.innerWidth - popupWidth - 16, rect.left + rect.width / 2 - popupWidth / 2)) : Math.max(16, (window.innerWidth - popupWidth) / 2);
  const popupTop = rect && rect.bottom + 18 + 190 < window.innerHeight ? rect.bottom + 18 : rect ? Math.max(16, rect.top - 208) : Math.max(16, window.innerHeight / 2 - 120);

  return <div className="onboarding-layer" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-body">
    {rect && <div className="onboarding-spotlight" style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }} />}
    <div className="onboarding-card" style={{ left: popupLeft, top: popupTop, width: popupWidth }}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">Getting started · {stepIndex + 1}/{steps.length}</p><h2 id="onboarding-title" className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{step.title}</h2></div>
        <button type="button" className="onboarding-close" onClick={() => close(false)} aria-label="Skip onboarding tour"><X className="h-4 w-4" /></button>
      </div>
      <p id="onboarding-body" className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.body}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onClick={() => close(false)}>Skip tour</button>
        <div className="flex items-center gap-2"><button type="button" className="onboarding-secondary" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0}><ArrowLeft className="h-4 w-4" />Back</button><button type="button" className="onboarding-primary" onClick={next}>{stepIndex === steps.length - 1 ? <><Check className="h-4 w-4" />Finish</> : <>Next<ArrowRight className="h-4 w-4" /></>}</button></div>
      </div>
    </div>
  </div>;
}
