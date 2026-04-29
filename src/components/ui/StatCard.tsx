import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'amber' | 'emerald' | 'purple';
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, color, trend, onClick }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  };

  return (
    <motion.div
      whileHover={onClick ? { y: -4, scale: 1.02 } : undefined}
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800",
        onClick && "cursor-pointer hover:shadow-md transition-shadow"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">{title}</p>
          <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-bold",
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.isPositive ? '+' : '-'}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
