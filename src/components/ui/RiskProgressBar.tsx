import { cn } from '../../utils';
import { NivelRisco } from '../../types';
import { motion } from 'motion/react';

interface RiskProgressBarProps {
  value: number; // 0-100
  nivel: NivelRisco;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string; // Label customizado
  className?: string;
}

export function RiskProgressBar({ value, nivel, size = 'md', showLabel = true, label, className }: RiskProgressBarProps) {
  const colors = {
    [NivelRisco.ALTO]: 'bg-red-500',
    [NivelRisco.MEDIO]: 'bg-amber-500',
    [NivelRisco.BAIXO]: 'bg-emerald-500',
    [NivelRisco.MUITO_ALTO]: 'bg-purple-600',
  };

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {label || 'Progresso'}
          </span>
          <span className={cn(
            "text-sm font-black",
            nivel === NivelRisco.MUITO_ALTO ? "text-purple-600" :
            nivel === NivelRisco.ALTO ? "text-red-600" :
            nivel === NivelRisco.MEDIO ? "text-amber-600" : "text-emerald-600"
          )}>
            {value.toFixed(1)}%
          </span>
        </div>
      )}
      <div className={cn("w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden", heights[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", colors[nivel])}
        />
      </div>
    </div>
  );
}
