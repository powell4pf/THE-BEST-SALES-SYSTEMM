import { ArrowUpRight } from 'lucide-react';
import { Card } from './ui/card';
import type { StatCardData } from '../lib/types';
import { cn } from '../lib/cn';

const accentMap: Record<string, string> = {
  blue: 'from-sky-500 to-cyan-400',
  emerald: 'from-emerald-500 to-teal-400',
  amber: 'from-amber-500 to-orange-400',
  rose: 'from-rose-500 to-pink-400'
};

export function StatCard({ label, value, delta, accent }: StatCardData) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', accentMap[accent] ?? 'from-slate-500 to-slate-300')} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</div>
        </div>
        <div className="rounded-2xl bg-slate-950/5 p-3 text-slate-500 dark:bg-white/10 dark:text-white">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-6 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        {delta}
      </div>
    </Card>
  );
}

