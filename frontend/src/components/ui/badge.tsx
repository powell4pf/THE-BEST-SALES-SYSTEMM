import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:text-slate-200',
        className
      )}
      {...props}
    />
  );
}

