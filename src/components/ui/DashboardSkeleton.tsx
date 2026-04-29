import { Skeleton } from './Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-72 h-4" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl space-y-3">
            <Skeleton variant="circular" className="w-10 h-10" />
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-16 h-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton variant="rounded" className="h-96" />
        <Skeleton variant="rounded" className="h-96" />
      </div>
    </div>
  );
}
