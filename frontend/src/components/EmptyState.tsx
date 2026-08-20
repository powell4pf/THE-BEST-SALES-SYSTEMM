import type { ReactNode } from 'react';
import { FileSearch } from 'lucide-react';

type Props = { title: string; description: string; action?: ReactNode };

export function EmptyState({ title, description, action }: Props) {
  return <div className="flex flex-col items-center justify-center px-6 py-14 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500"><FileSearch className="h-7 w-7" /></div><h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div>;
}
