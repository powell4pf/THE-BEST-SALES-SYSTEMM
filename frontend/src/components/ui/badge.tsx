import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'success' };

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:text-slate-200',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
        className
      )}
      {...props}
    />
  );
}
