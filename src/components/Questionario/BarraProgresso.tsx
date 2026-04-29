/**
 * Componente de Barra de Progresso
 * SAPEE DEWAS - Questionário Psicossocial
 */

import React from 'react';
import { BarraProgressoProps } from '../../types/questionario';

export const BarraProgresso: React.FC<BarraProgressoProps> = ({
  atual,
  total,
  porcentagem,
}) => {
  const percentual = porcentagem || Math.round((atual / total) * 100);

  // Cor baseada no progresso
  const getCorBarra = () => {
    if (percentual < 30) return 'from-red-500 to-red-600';
    if (percentual < 60) return 'from-yellow-500 to-yellow-600';
    if (percentual < 80) return 'from-blue-500 to-blue-600';
    return 'from-green-500 to-green-600';
  };

  // Ícone baseado no progresso
  const getIcone = () => {
    if (percentual < 30) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (percentual < 60) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    if (percentual < 80) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  // Mensagem baseada no progresso
  const getMensagem = () => {
    if (percentual < 30) return 'Iniciando...';
    if (percentual < 60) return 'Continuando...';
    if (percentual < 80) return 'Quase lá!';
    return 'Completo!';
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
      {/* Cabeçalho da barra */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`text-slate-600 dark:text-slate-400 ${percentual >= 100 ? 'text-green-600 dark:text-green-400' : ''}`}>
            {getIcone()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Progresso do Questionário
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getMensagem()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {percentual}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {atual} de {total} questões
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full bg-linear-to-r ${getCorBarra()} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentual}%` }}
        >
          {/* Brilho animado */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>

      {/* Marcos de progresso */}
      <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

export default BarraProgresso;
