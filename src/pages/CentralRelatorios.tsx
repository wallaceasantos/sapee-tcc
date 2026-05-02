/**
 * Central de Relatórios - Módulo Consolidado
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 * 
 * Consolida: Relatorios, RelatorioEficacia, RelatoriosGerenciais
 */

import React, { useState } from 'react';
import { BarChart3, TrendingUp, FileText, Users, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import Relatorios from './Relatorios';
import RelatorioEficacia from './RelatorioEficacia';
import RelatoriosGerenciais from './RelatoriosGerenciais';

// Definição das abas
const TABS = [
  { id: 'analytics', label: '📊 Analytics & Insights', icon: BarChart3 },
  { id: 'eficacia', label: '✅ Eficácia das Intervenções', icon: Award },
  { id: 'gerencial', label: '📈 Relatórios Gerenciais', icon: FileText },
];

export default function CentralRelatorios() {
  const [abaAtiva, setAbaAtiva] = useState<string>('analytics');

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">📊 Central de Relatórios</h2>
          <p className="text-gray-500 dark:text-slate-400">Análise completa do sistema SAPEE em um só lugar.</p>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-2 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 sm:flex-none justify-center",
                abaAtiva === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={abaAtiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {abaAtiva === 'analytics' && <Relatorios />}
          {abaAtiva === 'eficacia' && <RelatorioEficacia />}
          {abaAtiva === 'gerencial' && <RelatoriosGerenciais />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
