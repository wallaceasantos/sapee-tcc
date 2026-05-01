/**
 * Página de Relatórios Gerenciais
 * SAPEE DEWAS - Sistema de Relatórios com Exportação
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';

interface RelatorioGeral {
  periodo: { inicio: string; fim: string };
  resumo: {
    total_alunos: number;
    risco_alto: number;
    risco_medio: number;
    risco_baixo: number;
    total_intervencoes: number;
    intervencoes_pendentes: number;
    intervencoes_concluidas: number;
    total_alertas_faltas: number;
    alertas_faltas_pendentes: number;
  };
  indicadores: {
    percentual_risco_alto: number;
    taxa_conclusao_intervencao: number;
    taxa_alertas_resolvidos: number;
  };
}

export default function RelatoriosGerenciais() {
  const { addToast } = useToast();
  const { token } = useAuth();

  const [relatorio, setRelatorio] = useState<RelatorioGeral | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoRelatorio, setTipoRelatorio] = useState('geral');
  const [dadosRelatorio, setDadosRelatorio] = useState<any>(null);

  useEffect(() => {
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
  }, []);

  const carregarRelatorio = async () => {
    if (!token || !dataInicio || !dataFim) {
      addToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Preencha o período do relatório' });
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = getEndpoint(tipoRelatorio);
      const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${endpoint}?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setDadosRelatorio(data);
        
        if (tipoRelatorio === 'geral') {
          setRelatorio(data);
        }

        addToast({ type: 'success', title: 'Relatório carregado', message: 'Dados atualizados com sucesso' });
      } else {
        throw new Error('Erro ao carregar relatório');
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message || 'Erro ao carregar relatório' });
    } finally {
      setIsLoading(false);
    }
  };

  const getEndpoint = (tipo: string) => {
    const endpoints: Record<string, string> = {
      'geral': '/relatorios/geral',
      'alunos-risco': '/relatorios/alunos-risco',
      'intervencoes': '/relatorios/intervencoes',
      'faltas': '/relatorios/faltas-alertas'
    };
    return endpoints[tipo] || endpoints['geral'];
  };

  const handleExportPDF = () => {
    if (!dadosRelatorio) {
      addToast({ type: 'warning', title: 'Sem dados', message: 'Carregue o relatório antes de exportar' });
      return;
    }
    window.print();
    addToast({ type: 'success', title: 'Exportando', message: 'Selecione "Salvar como PDF" no diálogo de impressão' });
  };

  const handleExportExcel = () => {
    if (!dadosRelatorio) {
      addToast({ type: 'warning', title: 'Sem dados', message: 'Carregue o relatório antes de exportar' });
      return;
    }

    const csv = criarCSV(dadosRelatorio);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${tipoRelatorio}_${dataInicio}_${dataFim}.csv`;
    link.click();

    addToast({ type: 'success', title: 'Exportado', message: 'Relatório exportado para Excel/CSV' });
  };

  const criarCSV = (dados: any) => {
    if (tipoRelatorio === 'geral') {
      return [
        ['Métrica', 'Valor'],
        ['Período', `${dados.periodo.inicio} até ${dados.periodo.fim}`],
        ['Total de Alunos', dados.resumo.total_alunos],
        ['Risco Alto', dados.resumo.risco_alto],
        ['Risco Médio', dados.resumo.risco_medio],
        ['Risco Baixo', dados.resumo.risco_baixo],
        ['Total Intervenções', dados.resumo.total_intervencoes],
        ['Intervenções Pendentes', dados.resumo.intervencoes_pendentes],
        ['Intervenções Concluídas', dados.resumo.intervencoes_concluidas],
        ['Total Alertas Faltas', dados.resumo.total_alertas_faltas],
        ['Alertas Pendentes', dados.resumo.alertas_faltas_pendentes],
        ['% Risco Alto', dados.indicadores.percentual_risco_alto + '%'],
        ['Taxa Conclusão', dados.indicadores.taxa_conclusao_intervencao + '%'],
        ['Taxa Alertas Resolvidos', dados.indicadores.taxa_alertas_resolvidos + '%']
      ].map(row => row.join(',')).join('\n');
    }
    return '';
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Relatórios Gerenciais</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-1">Gere e exporte relatórios do sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6"
      >
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Filter className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
          <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">Filtros do Relatório</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo de Relatório</label>
            <select
              value={tipoRelatorio}
              onChange={(e) => setTipoRelatorio(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
            >
              <option value="geral" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Relatório Geral</option>
              <option value="alunos-risco" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Alunos por Risco</option>
              <option value="intervencoes" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Intervenções</option>
              <option value="faltas" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Alertas de Faltas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={carregarRelatorio}
              disabled={isLoading}
              className="w-full py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Carregando...</>
              ) : (
                <><Calendar className="w-5 h-5" /> Gerar Relatório</>
              )}
            </button>
          </div>
        </div>

        {dadosRelatorio && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t dark:border-slate-700">
            <button onClick={handleExportPDF} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2 min-h-11">
              <FileText className="w-4 h-4 md:w-5 md:h-5" /> Exportar PDF
            </button>
            <button onClick={handleExportExcel} className="flex-1 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition-all flex items-center justify-center gap-2 min-h-11">
              <Download className="w-4 h-4 md:w-5 md:h-5" /> Exportar Excel
            </button>
          </div>
        )}
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-slate-400 mt-4">Carregando relatório...</p>
        </div>
      )}

      {/* Conteúdo do Relatório */}
      {!isLoading && relatorio && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 md:space-y-6">
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <StatCard title="Total de Alunos" value={relatorio.resumo.total_alunos} icon={Users} color="blue" />
            <StatCard title="Alunos em Risco Alto" value={relatorio.resumo.risco_alto} icon={AlertTriangle} color="red" trend={`${relatorio.indicadores.percentual_risco_alto}% do total`} />
            <StatCard title="Intervenções Concluídas" value={relatorio.resumo.intervencoes_concluidas} icon={CheckCircle} color="green" trend={`${relatorio.indicadores.taxa_conclusao_intervencao}% de conclusão`} />
          </div>

          {/* Tabela */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Detalhamento do Relatório</h3>
              <p className="text-sm text-gray-500 mt-1">
                Período: {new Date(relatorio.periodo.inicio).toLocaleDateString('pt-BR')} até {new Date(relatorio.periodo.fim).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Métrica</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-medium text-gray-900">Risco Médio</td><td className="px-6 py-4 text-sm text-gray-900">{relatorio.resumo.risco_medio}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-medium text-gray-900">Risco Baixo</td><td className="px-6 py-4 text-sm text-gray-900">{relatorio.resumo.risco_baixo}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-medium text-gray-900">Intervenções Pendentes</td><td className="px-6 py-4 text-sm text-gray-900">{relatorio.resumo.intervencoes_pendentes}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-medium text-gray-900">Alertas de Faltas</td><td className="px-6 py-4 text-sm text-gray-900">{relatorio.resumo.total_alertas_faltas}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-medium text-gray-900">Alertas Pendentes</td><td className="px-6 py-4 text-sm text-gray-900">{relatorio.resumo.alertas_faltas_pendentes}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  trend?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600'
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-xl bg-linear-to-br", colorClasses[color] || colorClasses.blue)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">{trend}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{title}</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
}
