/**
 * Componente de Termo de Consentimento - Questionário Psicossocial
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 * 
 * Em conformidade com LGPD (Lei 13.709/2018)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TermoConsentimentoProps {
  onAceitar: () => void;
  onRecusar: () => void;
}

export const TermoConsentimento: React.FC<TermoConsentimentoProps> = ({
  onAceitar,
  onRecusar,
}) => {
  const [scrollBottom, setScrollBottom] = useState(false);
  const [checkboxAceite, setCheckboxAceite] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 5;
    if (scrolledToBottom && !scrollBottom) {
      setScrollBottom(true);
    }
  };

  const handleAceitar = () => {
    if (checkboxAceite) {
      onAceitar();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 p-6 sm:p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Termo de Consentimento</h2>
              <p className="text-blue-100 text-sm sm:text-base">Questionário Psicossocial - SAPEE DEWAS</p>
            </div>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div 
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-700 dark:text-slate-300"
          onScroll={handleScroll}
        >
          {/* Finalidade */}
          <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Finalidade</h3>
            </div>
            <p className="text-sm leading-relaxed ml-11">
              Este questionário tem como objetivo identificar fatores que podem impactar seu desempenho 
              e permanência no curso. Suas respostas nos ajudarão a oferecer o melhor apoio possível 
              para seu sucesso acadêmico, incluindo suporte pedagógico, psicológico e social quando necessário.
            </p>
          </section>

          {/* Sigilo */}
          <section className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-100 dark:border-green-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sigilo e Confidencialidade</h3>
            </div>
            <ul className="space-y-2 ml-11 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Suas respostas são <strong>confidenciais</strong> e protegidas por criptografia</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Apenas a <strong>equipe pedagógica</strong> autorizada tem acesso aos resultados</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Os dados são usados <strong>exclusivamente</strong> para apoio estudantil</span>
              </li>
            </ul>
          </section>

          {/* Voluntariedade */}
          <section className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-100 dark:border-amber-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Voluntariedade</h3>
            </div>
            <ul className="space-y-2 ml-11 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>Sua participação é <strong>totalmente voluntária</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>Você pode <strong>interromper</strong> o questionário a qualquer momento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>Não há</strong> respostas certas ou erradas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>Suas respostas <strong>não</strong> afetarão sua avaliação acadêmica</span>
              </li>
            </ul>
          </section>

          {/* LGPD */}
          <section className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 border border-purple-100 dark:border-purple-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Proteção de Dados (LGPD)</h3>
            </div>
            <p className="text-sm leading-relaxed ml-11 mb-3">
              Em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei 13.709/2018)</strong>, 
              seus dados pessoais são tratados de acordo com a legislação vigente.
            </p>
            <div className="ml-11 bg-white dark:bg-slate-700 rounded-lg p-4 text-sm space-y-2">
              <p><strong>Base Legal:</strong> Consentimento do titular (Art. 7º, I)</p>
              <p><strong>Finalidade:</strong> Apoio pedagógico e prevenção de evasão escolar</p>
              <p><strong>Retenção:</strong> Dados mantidos pelo período necessário ao cumprimento da finalidade</p>
              <p><strong>Direitos:</strong> Acesso, correção e exclusão dos dados a qualquer momento</p>
            </div>
          </section>

          {/* Como Responder */}
          <section className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-600">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Como Responder</h3>
            </div>
            <p className="text-sm leading-relaxed ml-11 mb-4">
              Para cada afirmação, selecione uma opção de 1 a 5:
            </p>
            <div className="ml-11 space-y-3">
              {[
                { num: '1', label: 'Discordo Totalmente', color: 'bg-red-500' },
                { num: '2', label: 'Discordo Parcialmente', color: 'bg-orange-500' },
                { num: '3', label: 'Neutro', color: 'bg-yellow-500' },
                { num: '4', label: 'Concordo Parcialmente', color: 'bg-green-500' },
                { num: '5', label: 'Concordo Totalmente', color: 'bg-emerald-600' },
              ].map((item) => (
                <div key={item.num} className="flex items-center gap-3">
                  <span className={`w-8 h-8 ${item.color} text-white rounded-full flex items-center justify-center font-bold text-sm`}>
                    {item.num}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Aviso de scroll */}
          {!scrollBottom && (
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-sm animate-pulse">
              <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>Role até o final para continuar</span>
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/50">
          {/* Checkbox de Aceite */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={checkboxAceite}
                  onChange={(e) => setCheckboxAceite(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-all">
                  {checkboxAceite && (
                    <svg className="w-4 h-4 text-white absolute inset-0 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Li e compreendi as informações acima. Declaro que participo do questionário de forma voluntária e consentida.
              </span>
            </label>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRecusar}
              className="flex-1 px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Não Concordo
              </span>
            </button>
            <button
              onClick={handleAceitar}
              disabled={!checkboxAceite || !scrollBottom}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                checkboxAceite && scrollBottom
                  ? 'bg-linear-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {checkboxAceite && scrollBottom ? 'Li e Concordo' : 'Leia o Termo Primeiro'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TermoConsentimento;
