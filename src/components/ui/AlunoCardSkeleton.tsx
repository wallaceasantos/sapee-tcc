import { Skeleton } from './Skeleton';

export function AlunoCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-40 h-4" />
          <Skeleton className="w-24 h-3" />
        </div>
        <Skeleton className="w-20 h-6" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="rounded" className="h-14" />
        <Skeleton variant="rounded" className="h-14" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-full h-2" />
        <Skeleton className="w-3/4 h-2" />
      </div>
      <Skeleton variant="rounded" className="w-full h-9" />
    </div>
  );
}
