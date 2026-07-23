import * as React from 'react';
import { cn } from '../../lib/cn';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
};

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  solid: 'bg-slate-950 text-white shadow-soft hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200',
  primary: 'bg-[#e35345] text-white shadow-[0_12px_28px_rgba(227,83,69,.26)] hover:-translate-y-0.5 hover:bg-[#c9473b]',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
  glass: 'border border-white/20 bg-white/10 text-white backdrop-blur-xl hover:bg-white/15'
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm'
};

export function Button({ className, variant = 'solid', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
