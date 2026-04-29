/**
 * Componente de Pergunta do Questionário
 * SAPEE DEWAS - Questionário Psicossocial
 */

import React from 'react';
import { PerguntaProps } from '../../types/questionario';

export const Pergunta: React.FC<PerguntaProps> = ({
  pergunta,
  valor,
  onChange,
  erro,
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-md border-l-4 ${
      erro ? 'border-red-500' : 'border-blue-500'
    } transition-all hover:shadow-lg`}>
      {/* Texto da pergunta */}
      <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
        {pergunta.texto}
        {pergunta.invertida && (
          <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
            *
          </span>
        )}
      </p>

      {/* Opções de resposta */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => onChange(opcao as 1 | 2 | 3 | 4 | 5)}
            className={`
              relative py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base
              transition-all duration-200 transform hover:scale-105
              ${
                valor === opcao
                  ? getClasseBotaoSelecionado(opcao)
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }
            `}
          >
            {opcao}
            {valor === opcao && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
            )}
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="text-red-600 dark:text-red-400 font-medium">
          1 - Discordo Totalmente
        </span>
        <span className="text-green-600 dark:text-green-400 font-medium">
          5 - Concordo Totalmente
        </span>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {erro}
        </div>
      )}
    </div>
  );
};

// Função auxiliar para classes do botão selecionado
const getClasseBotaoSelecionado = (opcao: number) => {
  switch (opcao) {
    case 1:
      return 'bg-linear-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30';
    case 2:
      return 'bg-linear-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30';
    case 3:
      return 'bg-linear-to-br from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/30';
    case 4:
      return 'bg-linear-to-br from-lime-500 to-lime-600 text-white shadow-lg shadow-lime-500/30';
    case 5:
      return 'bg-linear-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30';
    default:
      return '';
  }
};

export default Pergunta;
