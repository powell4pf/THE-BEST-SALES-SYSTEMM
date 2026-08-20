import type React from 'react';
import { cn } from '../../lib/cn';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-700/70', className)} {...props} />;
}

export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return <div className="space-y-3 p-5" aria-label="Loading data">{Array.from({ length: rows }).map((_, row) => <div key={row} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }).map((__, column) => <Skeleton key={column} className="h-5" />)}</div>)}</div>;
}
