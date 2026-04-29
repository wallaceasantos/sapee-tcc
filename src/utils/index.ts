import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function getRiscoColor(nivel: string) {
  switch (nivel) {
    case 'MUITO_ALTO':
      return 'text-purple-500 bg-purple-50 border-purple-200';
    case 'ALTO':
      return 'text-red-500 bg-red-50 border-red-200';
    case 'MEDIO':
      return 'text-amber-500 bg-amber-50 border-amber-200';
    case 'BAIXO':
      return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    default:
      return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

export function getRiscoBorderColor(nivel: string) {
  switch (nivel) {
    case 'MUITO_ALTO':
      return 'border-purple-500';
    case 'ALTO':
      return 'border-red-500';
    case 'MEDIO':
      return 'border-amber-500';
    case 'BAIXO':
      return 'border-emerald-500';
    default:
      return 'border-gray-200';
  }
}
