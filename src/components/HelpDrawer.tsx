import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Calendar, AlertTriangle, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onResetTour: () => void;
}

export default function HelpDrawer({ isOpen, onClose, onResetTour }: HelpDrawerProps) {
  const [activeTab, setActiveTab] = useState<'ciclo' | 'faq'>('ciclo');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-60"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[90vw] max-w-md bg-white dark:bg-slate-900 shadow-2xl z-70 flex flex-col border-l border-gray-200 dark:border-slate-700"
          >
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-linear-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                <h2 className="text-xl font-bold">Guia do SAPEE</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200 dark:border-slate-700">
              {['ciclo', 'faq'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'ciclo' | 'faq')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab 
                      ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab === 'ciclo' ? '🔄 Ciclo de 6 Meses' : '❓ Perguntas Frequentes'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'ciclo' ? (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">🎯 O que é o Ciclo?</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Toda intervenção dura <strong>6 meses</strong>. O sistema gerencia o prazo automaticamente, 
                      alertando quando é hora de avaliar ou encerrar.
                    </p>
                  </div>

                  <StepCard 
                    icon={<Calendar className="w-5 h-5" />}
                    title="Mês 1-2: Diagnóstico & Plano"
                    description="Aprove a intervenção. Defina metas claras no campo 'Observações'. O sistema inicia o prazo."
                    color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  />
                  <StepCard 
                    icon={<AlertTriangle className="w-5 h-5" />}
                    title="Mês 3: Checkpoint Intermediário"
                    description="Alerta 🟡 aparece. Compare notas e frequência. Atualize o status ou intensifique o apoio."
                    color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  />
                  <StepCard 
                    icon={<CheckCircle className="w-5 h-5" />}
                    title="Mês 6: Fechamento"
                    description="Alerta 🔴 aparece. Decida: ✅ Concluir (Sucesso), 🔄 Prorrogar ou ❌ Registrar Evasão."
                    color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  />

                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <h4 className="font-bold text-gray-800 dark:text-white mb-2">📊 Indicador de Sucesso</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 flex-wrap">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">85%</span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-bold">~60%</span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">&lt;30%</span>
                      <span className="w-full mt-1">O Score deve cair!</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Reiniciar Tour?
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                      Esqueceu como funciona? Clique abaixo para ver o tour interativo novamente.
                    </p>
                    <button
                      onClick={() => {
                        onResetTour();
                        onClose();
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🚀 Reiniciar Tour de Onboarding
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <FaqItem question="Como alimento o sistema com notas?" answer="Vá em 'Importar Dados' e envie o CSV do diário de classe. O sistema recalcula o risco automaticamente." />
                  <FaqItem question="O que acontece se eu não fechar o ciclo?" answer="O sistema manterá o alerta 🔴 'Vencendo'. Recomenda-se sempre registrar uma conclusão ou prorrogação para manter o histórico limpo." />
                  <FaqItem question="Como funciona a Prorrogação?" answer="Ao clicar em 'Prorrogar' (ou criar nova intervenção), uma nova intervenção é criada para os próximos 6 meses, mantendo o histórico da anterior." />
                  <FaqItem question="Posso editar uma intervenção já criada?" answer="Sim! Use o botão '✏️ Atualizar Status' para mudar o tipo, adicionar observações ou encerrar o ciclo." />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StepCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      <div className={`p-3 h-fit rounded-lg ${color}`}>{icon}</div>
      <div>
        <h4 className="font-bold text-gray-800 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
        <span className="font-medium text-sm text-gray-800 dark:text-white">{question}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 bg-gray-50 dark:bg-slate-800/50 text-sm text-gray-600 dark:text-slate-300 border-t border-gray-200 dark:border-slate-700"
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}