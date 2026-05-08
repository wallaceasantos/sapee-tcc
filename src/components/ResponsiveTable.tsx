/**
 * Componente de Tabela Responsiva
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 * 
 * Exibe dados em formato de tabela em telas maiores (md+)
 * e converte para Cards empilhados em telas pequenas (mobile).
 */

import React from 'react';
import { cn } from '../utils';

interface Column {
  header: string;
  render: (item: any) => React.ReactNode;
  className?: string;
}

interface ResponsiveTableProps {
  data: any[];
  columns: Column[];
  keyExtractor: (item: any, index: number) => string;
  emptyMessage?: string;
  className?: string;
}

export default function ResponsiveTable({
  data,
  columns,
  keyExtractor,
  emptyMessage = "Nenhum dado disponível",
  className
}: ResponsiveTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      
      {/* DESKTOP: Tabela Padrão */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase text-gray-500 dark:text-slate-400">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className={cn("px-4 py-3 whitespace-nowrap", col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {data.map((item, idx) => (
                <tr key={keyExtractor(item, idx)} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  {columns.map((col, i) => (
                    <td key={i} className={cn("px-4 py-3", col.className)}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE: Lista de Cards */}
      <div className="md:hidden space-y-3">
        {data.map((item, idx) => (
          <div
            key={keyExtractor(item, idx)}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            {columns.map((col, i) => (
              <div key={i} className="flex justify-between items-start gap-2">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase shrink-0">
                  {col.header}
                </span>
                <div className="text-sm text-right text-gray-900 dark:text-white flex-1 min-w-0">
                  {col.render(item)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
