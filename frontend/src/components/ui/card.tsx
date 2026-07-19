import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-soft backdrop-blur-md dark:border-white/10 dark:bg-white/6',
        className
      )}
      {...props}
    />
  );
}

