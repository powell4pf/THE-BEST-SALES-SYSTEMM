import type { ReactNode } from 'react';
import { Card } from './ui/card';
import type { TableColumn } from '../lib/types';
import { cn } from '../lib/cn';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './ui/skeleton';

type Props<Row extends Record<string, unknown>> = {
  title: string;
  subtitle: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  emptyMessage?: string;
  actions?: ReactNode;
  isLoading?: boolean;
};

export function DataTable<Row extends Record<string, unknown>>({ title, subtitle, columns, rows, emptyMessage = 'No records found.', actions, isLoading = false }: Props<Row>) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-200/70 px-4 py-4 dark:border-white/10 sm:px-6 sm:py-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        {actions}
      </div>
      {isLoading ? <TableSkeleton columns={columns.length} /> : <div className="data-table-scroll overflow-x-auto">
        <table className="data-table min-w-full divide-y divide-slate-200/70 text-left dark:divide-white/10">
          <thead className="bg-slate-50/70 dark:bg-white/5">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className={cn('px-6 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400', column.align === 'right' && 'text-right', column.align === 'center' && 'text-center')}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  <EmptyState title="Nothing here yet" description={emptyMessage} />
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="transition hover:bg-slate-50/80 dark:hover:bg-white/5">
                  {columns.map((column) => (
                    <td key={String(column.key)} data-label={column.label} className={cn('px-6 py-4 text-sm text-slate-700 dark:text-slate-200', column.align === 'right' && 'text-right', column.align === 'center' && 'text-center')}>
                      {column.render ? column.render(row) : String(row[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>}
    </Card>
  );
}
