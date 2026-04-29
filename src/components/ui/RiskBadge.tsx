import { cn } from '../../utils';
import { NivelRisco } from '../../types';
import { AlertTriangle, Minus, CheckCircle, Zap } from 'lucide-react';

interface RiskBadgeProps {
  nivel: NivelRisco;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'label' | 'dot';
}

export function RiskBadge({ nivel, size = 'md', variant = 'badge' }: RiskBadgeProps) {
  const configs = {
    [NivelRisco.MUITO_ALTO]: {
      label: 'Muito Alto Risco',
      badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      dot: 'bg-purple-500',
      icon: Zap,
    },
    [NivelRisco.ALTO]: {
      label: 'Alto Risco',
      badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      dot: 'bg-red-500',
      icon: AlertTriangle,
    },
    [NivelRisco.MEDIO]: {
      label: 'Médio Risco',
      badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
      icon: Minus,
    },
    [NivelRisco.BAIXO]: {
      label: 'Baixo Risco',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      icon: CheckCircle,
    },
  };

  const config = configs[nivel] || configs[NivelRisco.BAIXO]; // Fallback para BAIXO se undefined
  const Icon = config.icon;
  
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2',
  };

  if (variant === 'dot') {
    return (
      <div className="flex items-center gap-2">
        <div className={cn("w-2.5 h-2.5 rounded-full", config.dot)} />
        <span className={cn("text-sm font-semibold", config.text)}>{config.label}</span>
      </div>
    );
  }

  if (variant === 'label') {
    return (
      <span className={cn("text-sm font-bold", config.text)}>
        {config.label}
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-bold uppercase tracking-wider border",
      sizes[size],
      config.badge
    )}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
