import { cn } from '../../utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded",
        variant === 'circular' && "rounded-full",
        variant === 'rectangular' && "rounded-lg",
        variant === 'rounded' && "rounded-xl",
        className
      )}
    />
  );
}
