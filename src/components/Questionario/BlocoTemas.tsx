/**
 * Componente de Bloco Temático do Questionário
 * SAPEE DEWAS - Questionário Psicossocial
 */

import React from 'react';
import { BlocoTemasProps } from '../../types/questionario';
import Pergunta from './Pergunta';

export const BlocoTemas: React.FC<BlocoTemasProps> = ({
  bloco,
  respostas,
  onResponder,
  erros,
}) => {
  // Ícone baseado no bloco
  const getIconeBloco = () => {
    switch (bloco.bloco) {
      case 'SAÚDE MENTAL':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'INTEGRAÇÃO SOCIAL':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'SATISFAÇÃO COM O CURSO':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
        );
      case 'CONFLITOS':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'INTENÇÃO DE EVASÃO':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Cor baseada no bloco
  const getCorBloco = () => {
    switch (bloco.bloco) {
      case 'SAÚDE MENTAL':
        return 'from-red-500 to-red-600 bg-red-50 dark:bg-red-900/20';
      case 'INTEGRAÇÃO SOCIAL':
        return 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'SATISFAÇÃO COM O CURSO':
        return 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'CONFLITOS':
        return 'from-orange-500 to-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'INTENÇÃO DE EVASÃO':
        return 'from-slate-500 to-slate-600 bg-slate-50 dark:bg-slate-900/20';
      default:
        return 'from-slate-500 to-slate-600 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  // Contar respostas respondidas no bloco
  const respondidasNoBloco = bloco.perguntas.filter(
    (p) => respostas[p.id] !== undefined
  ).length;
  const totalNoBloco = bloco.perguntas.length;
  const completo = respondidasNoBloco === totalNoBloco;

  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg border ${completo ? 'border-green-400 dark:border-green-600' : 'border-slate-200 dark:border-slate-700'}`}>
      {/* Cabeçalho do Bloco */}
      <div className={`bg-linear-to-r ${getCorBloco()} p-4 sm:p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg">
              {getIconeBloco()}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">{bloco.bloco}</h3>
              <p className="text-sm text-white/80">
                {respondidasNoBloco} de {totalNoBloco} questões respondidas
              </p>
            </div>
          </div>
          {completo && (
            <div className="text-green-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Mini barra de progresso do bloco */}
        <div className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${(respondidasNoBloco / totalNoBloco) * 100}%` }}
          />
        </div>
      </div>

      {/* Perguntas do Bloco */}
      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 space-y-4">
        {bloco.perguntas.map((pergunta) => (
          <Pergunta
            key={pergunta.id}
            pergunta={pergunta}
            valor={respostas[pergunta.id]}
            onChange={(valor) => onResponder(pergunta.id, valor)}
            erro={erros[pergunta.id]}
          />
        ))}
      </div>
    </div>
  );
};

export default BlocoTemas;
