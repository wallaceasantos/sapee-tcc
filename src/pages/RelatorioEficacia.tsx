/**
 * Página de Relatórios de Eficácia das Intervenções
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users, 
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Award,
  FileText,
  Sheet,
  Printer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { exportToCSV, exportToExcel, exportReportToPDF, printReport } from '../utils/export';

interface EficaciaData {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    total_intervencoes: number;
    alunos_atendidos: number;
    concluidas: number;
    canceladas: number;
    pendentes: number;
    em_andamento: number;
    taxa_conclusao_geral: number;
    tempo_medio_resolucao_dias: number | null;
  };
  top_tipos: Array<{
    tipo: string;
    total: number;
    concluidas: number;
    taxa_conclusao: number;
  }>;
  distribuicao_prioridade: Record<string, number>;
}

interface AlunosRecuperadosData {
  periodo: {
    inicio: string;
    fim: string;
  };
  estatisticas: {
    total_alunos_atendidos: number;
    alunos_recuperados: number;
    alunos_com_piora: number;
    taxa_recuperacao: number;
    taxa_piora: number;
  };
  alunos_recuperados: Array<{
    matricula: string;
    nome: string;
    curso: string;
    risco_inicial: number;
    risco_final: number;
    nivel_inicial: string;
    nivel_final: string;
    variacao: number;
  }>;
  alunos_com_piora: Array<{
    matricula: string;
    nome: string;
    curso: string;
    risco_inicial: number;
    risco_final: number;
    nivel_inicial: string;
    nivel_final: string;
    variacao: number;
  }>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function RelatorioEficacia() {
  const { addToast } = useToast();
  const { token } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const [eficaciaData, setEficaciaData] = useState<EficaciaData | null>(null);
  const [recuperadosData, setRecuperadosData] = useState<AlunosRecuperadosData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'6m' | '1a' | '2a'>('6m');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadRelatorios();
  }, [periodo]);

  const loadRelatorios = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      // Calcular datas
      const now = new Date();
      let startDate: string;
      
      if (periodo === '6m') {
        startDate = new Date(now.setMonth(now.getMonth() - 6)).toISOString().split('T')[0];
      } else if (periodo === '1a') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
      } else {
        startDate = new Date(now.setFullYear(now.getFullYear() - 2)).toISOString().split('T')[0];
      }
      
      const endDate = new Date().toISOString().split('T')[0];
      
      // Carregar dados
      const [eficaciaResponse, recuperadosResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/relatorios/eficacia?start_date=${startDate}&end_date=${endDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/relatorios/alunos-recuperados?start_date=${startDate}&end_date=${endDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (eficaciaResponse.ok) {
        const eficacia = await eficaciaResponse.json();
        setEficaciaData(eficacia);
      }
      
      if (recuperadosResponse.ok) {
        const recuperados = await recuperadosResponse.json();
        setRecuperadosData(recuperados);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar relatórios',
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funções de Exportação
  const handleExportCSV = () => {
    if (!eficaciaData) return;

    // Exportar resumo
    const resumoData = [{
      metrica: 'Total de Intervenções',
      valor: eficaciaData.resumo.total_intervencoes
    }, {
      metrica: 'Alunos Atendidos',
      valor: eficaciaData.resumo.alunos_atendidos
    }, {
      metrica: 'Concluídas',
      valor: eficaciaData.resumo.concluidas
    }, {
      metrica: 'Taxa de Conclusão',
      valor: `${eficaciaData.resumo.taxa_conclusao_geral}%`
    }, {
      metrica: 'Tempo Médio (dias)',
      valor: eficaciaData.resumo.tempo_medio_resolucao_dias || 'N/A'
    }];

    exportToCSV(resumoData, 'resumo_eficacia', { metrica: 'Métrica', valor: 'Valor' });
    addToast({ type: 'success', title: 'Exportado', message: 'Resumo exportado para CSV' });
  };

  const handleExportExcel = () => {
    if (!eficaciaData) return;

    // Exportar top tipos
    const tiposData = eficaciaData.top_tipos.map(t => ({
      Tipo: t.tipo,
      Total: t.total,
      Concluídas: t.concluidas,
      'Taxa de Conclusão': `${t.taxa_conclusao}%`
    }));

    exportToExcel(tiposData, 'tipos_intervencao', 'Tipos');
    addToast({ type: 'success', title: 'Exportado', message: 'Dados exportados para Excel' });
  };

  const handleExportPDF = () => {
    if (!eficaciaData) return;

    const headers = ['Tipo', 'Total', 'Concluídas', 'Taxa'];
    const data = eficaciaData.top_tipos.map(t => [
      t.tipo,
      t.total,
      t.concluidas,
      `${t.taxa_conclusao}%`
    ]);

    exportReportToPDF({
      title: 'Relatório de Eficácia das Intervenções',
      subtitle: `Período: ${new Date(eficaciaData.periodo.inicio).toLocaleDateString('pt-BR')} - ${new Date(eficaciaData.periodo.fim).toLocaleDateString('pt-BR')}`,
      headers,
      data,
      filename: 'relatorio_eficacia',
      stats: [
        { label: 'Total', value: eficaciaData.resumo.total_intervencoes },
        { label: 'Concluídas', value: eficaciaData.resumo.concluidas },
        { label: 'Taxa', value: `${eficaciaData.resumo.taxa_conclusao_geral}%` }
      ]
    });
    addToast({ type: 'success', title: 'Exportado', message: 'Relatório exportado para PDF' });
  };

  const handlePrint = () => {
    printReport('relatorio-eficacia-content', 'Relatório de Eficácia');
  };

  // Dados para gráfico de tipos
  const tiposChartData = eficaciaData?.top_tipos.map(t => ({
    name: t.tipo.length > 20 ? t.tipo.substring(0, 20) + '...' : t.tipo,
    total: t.total,
    concluidas: t.concluidas
  })) || [];

  // Dados para gráfico de prioridade
  const prioridadeChartData = Object.entries(eficaciaData?.distribuicao_prioridade || {}).map(([key, value]) => ({
    name: key.replace('_', ' '),
    value
  })) || [];

  // Stats cards
  const statsCards = [
    {
      title: 'Total de Intervenções',
      value: eficaciaData?.resumo.total_intervencoes || 0,
      icon: Target,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Alunos Atendidos',
      value: eficaciaData?.resumo.alunos_atendidos || 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      title: 'Taxa de Conclusão',
      value: `${eficaciaData?.resumo.taxa_conclusao_geral || 0}%`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Tempo Médio (dias)',
      value: eficaciaData?.resumo.tempo_medio_resolucao_dias || 'N/A',
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    }
  ];

  const recuperacaoCards = [
    {
      title: 'Alunos Recuperados',
      value: recuperadosData?.estatisticas.alunos_recuperados || 0,
      icon: Award,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      subtitle: `Taxa: ${recuperadosData?.estatisticas.taxa_recuperacao || 0}%`
    },
    {
      title: 'Alunos com Piora',
      value: recuperadosData?.estatisticas.alunos_com_piora || 0,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      subtitle: `Taxa: ${recuperadosData?.estatisticas.taxa_piora || 0}%`
    },
    {
      title: 'Total Atendidos',
      value: recuperadosData?.estatisticas.total_alunos_atendidos || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      subtitle: 'Com intervenções'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8" ref={reportRef} id="relatorio-eficacia-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Relatórios de Eficácia</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Acompanhe o impacto das intervenções pedagógicas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro de Período */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setPeriodo('6m')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                periodo === '6m'
                  ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              )}
            >
              6 Meses
            </button>
            <button
              onClick={() => setPeriodo('1a')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                periodo === '1a'
                  ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              )}
            >
              1 Ano
            </button>
            <button
              onClick={() => setPeriodo('2a')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                periodo === '2a'
                  ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              )}
            >
              2 Anos
            </button>
          </div>
          
          {/* Menu de Exportação */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
            >
              <Download className="w-5 h-5" />
              Exportar
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 z-20 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <FileText className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">PDF</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Relatório completo</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Sheet className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">Excel</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Dados completos</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { handleExportCSV(); setShowExportMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">CSV</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Dados resumidos</p>
                      </div>
                    </button>
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                    <button
                      onClick={() => { handlePrint(); setShowExportMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Printer className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">Imprimir</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Imprimir relatório</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats de Eficácia */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Eficácia das Intervenções
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "rounded-2xl p-6",
                stat.bgColor,
                "border border-gray-100 dark:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stat.value}</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl bg-linear-to-br",
                  stat.color
                )}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tipos de Intervenção */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Top Tipos de Intervenção</h3>
          {tiposChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tiposChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-slate-400" fontSize={12} />
                <YAxis stroke="#6b7280" className="dark:stroke-slate-400" fontSize={12} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                          <p className="font-bold text-white text-sm mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-sm font-medium text-slate-300">
                              {entry.name}: <span className="text-white font-bold">{entry.value}</span>
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="concluidas" fill="#10b981" radius={[4, 4, 0, 0]} name="Concluídas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center text-gray-400 dark:text-slate-500">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Distribuição por Prioridade */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Distribuição por Prioridade</h3>
          {prioridadeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prioridadeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    const pct = entry.percent ? Number(entry.percent) * 100 : 0;
                    return `${entry.name}: ${pct.toFixed(0)}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prioridadeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center text-gray-400">
              Sem dados disponíveis
            </div>
          )}
        </div>
      </div>

      {/* Stats de Recuperação */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-emerald-600" />
          Alunos Recuperados
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recuperacaoCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "rounded-2xl p-6",
                stat.bgColor,
                "border border-gray-100 dark:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{stat.subtitle}</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl bg-linear-to-br",
                  stat.color
                )}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Alunos Recuperados (Lista) */}
      {recuperadosData && recuperadosData.alunos_recuperados.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">Alunos com Melhor Significativa</h3>
            <p className="text-sm text-gray-500 mt-1">
              Alunos que reduziram o risco de evasão em mais de 20% ou saíram de ALTO para BAIXO
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aluno</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Curso</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Risco Inicial</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Risco Final</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {recuperadosData.alunos_recuperados.map((aluno) => (
                  <tr key={aluno.matricula} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{aluno.nome}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{aluno.matricula}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{aluno.curso}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        aluno.nivel_inicial === 'ALTO' ? 'bg-red-100 text-red-800' :
                        aluno.nivel_inicial === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        {aluno.nivel_inicial} ({aluno.risco_inicial}%)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        aluno.nivel_final === 'ALTO' ? 'bg-red-100 text-red-800' :
                        aluno.nivel_final === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        {aluno.nivel_final} ({aluno.risco_final}%)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-bold">{Math.abs(aluno.variacao).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Link para intervenções */}
      <div className="flex items-center justify-center gap-4">
        <Link
          to="/intervencoes"
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold"
        >
          <Calendar className="w-5 h-5" />
          Ver todas as intervenções
        </Link>
      </div>
    </div>
  );
}
