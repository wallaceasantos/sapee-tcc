import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  illustration?: 'search' | 'no-data' | 'no-results' | 'offline';
}

export function EmptyState({ icon: Icon, title, description, action, illustration }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div className={cn(
        "w-24 h-24 rounded-full flex items-center justify-center mb-6",
        illustration === 'offline' ? "bg-blue-100 dark:bg-blue-500/10" :
        illustration === 'no-results' ? "bg-amber-100 dark:bg-amber-500/10" :
        "bg-gray-100 dark:bg-slate-800"
      )}>
        <Icon className={cn(
          "w-12 h-12",
          illustration === 'offline' ? "text-blue-600 dark:text-blue-400" :
          illustration === 'no-results' ? "text-amber-600 dark:text-amber-400" :
          "text-gray-400 dark:text-slate-500"
        )} />
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-slate-400 max-w-md mb-6">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2",
            action.variant === 'primary' || !action.variant
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
          )}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
