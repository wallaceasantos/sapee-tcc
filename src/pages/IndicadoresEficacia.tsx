/**
 * Página de Indicadores de Eficácia do Sistema
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 * 
 * Métricas principais:
 * 1. Alunos em risco recuperados
 * 2. Taxa de evasão real vs. predita
 * 3. ROI do sistema (alunos salvos)
 * 4. Impacto das intervenções
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Shield,
  Heart
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface IndicadoresData {
  periodo: {
    inicio: string;
    fim: string;
    dias: number;
  };
  alunos_recuperados: {
    total: number;
    percentual: number;
    lista: Array<{
      matricula: string;
      nome: string;
      curso: string;
      risco_inicial: number;
      risco_final: number;
      variacao: number;
      nivel_inicial: string;
      nivel_final: string;
      intervencoes_recebidas: number;
    }>;
  };
  alunos_em_acompanhamento: {
    total: number;
    percentual: number;
  };
  alunos_sem_melhoria: {
    total: number;
    percentual: number;
  };
  evasao_real_vs_predita: {
    total_risco_alto: number;
    alunos_ativos: number;
    alunos_evasao: number;
    taxa_evasao_real: number;
    taxa_retention: number;
  };
  roi_sistema: {
    alunos_salvos: number;
    total_intervencao: number;
    roi_percentual: number;
    evasao_evitada_estimada: number;
    impacto_percentual: number;
  };
  impacto_intervencoes: {
    por_tipo: Array<{
      tipo: string;
      total_intervencoes: number;
      media_variacao_risco: number;
      taxa_sucesso: number;
    }>;
    total_intervencoes: number;
  };
  resumo_geral: {
    eficacia_geral: number;
    alunos_impactados: number;
    recomendacao: string;
  };
}

export default function IndicadoresEficacia() {
  const { addToast } = useToast();
  const { token } = useAuth();
  
  const [data, setData] = useState<IndicadoresData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'6m' | '1a' | '2a'>('6m');

  useEffect(() => {
    loadIndicadores();
  }, [periodo]);

  const loadIndicadores = async () => {
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
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/indicadores/eficacia-sistema?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
        addToast({
          type: 'success',
          title: 'Indicadores carregados',
          message: `Período: ${result.periodo.dias} dias de análise`
        });
      } else {
        throw new Error('Erro ao carregar indicadores');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Dados para gráfico de impacto por tipo
  const impactoChartData = data?.impacto_intervencoes.por_tipo.map(t => ({
    tipo: t.tipo.length > 20 ? t.tipo.substring(0, 20) + '...' : t.tipo,
    sucesso: t.taxa_sucesso,
    variacao: Math.abs(t.media_variacao_risco)
  })) || [];

  // Cards de métricas principais
  const metricCards = [
    {
      title: 'Alunos Recuperados',
      value: data?.alunos_recuperados.total || 0,
      percent: data?.alunos_recuperados.percentual || 0,
      icon: Heart,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      description: 'Redução > 20% no risco'
    },
    {
      title: 'Taxa de Retention',
      value: `${data?.evasao_real_vs_predita.taxa_retention || 0}%`,
      percent: data?.evasao_real_vs_predita.taxa_retention || 0,
      icon: Shield,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Alunos ativos no curso'
    },
    {
      title: 'ROI do Sistema',
      value: `${data?.roi_sistema.roi_percentual || 0}%`,
      percent: data?.roi_sistema.roi_percentual || 0,
      icon: Target,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Alunos salvos / Total'
    },
    {
      title: 'Evasão Evitada',
      value: Math.round(data?.roi_sistema.evasao_evitada_estimada || 0),
      percent: data?.roi_sistema.impacto_percentual || 0,
      icon: Activity,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      description: 'Estimativa de alunos'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">Carregando indicadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Indicadores de Eficácia</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Métricas de impacto do sistema SAPEE</p>
        </div>

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
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "rounded-2xl p-6",
              card.bgColor,
              "border border-gray-100 dark:border-slate-700"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-3 rounded-xl bg-linear-to-br",
                card.color
              )}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              {card.percent >= 60 ? (
                <ArrowUpRight className="w-6 h-6 text-green-600" />
              ) : card.percent >= 40 ? (
                <Activity className="w-6 h-6 text-orange-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{card.title}</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">{card.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Seção: Evasão Real vs. Predita */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Evasão Real vs. Predita</h2>
        </div>

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-xl">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">Total em Risco ALTO</p>
              <p className="text-4xl font-bold text-gray-800 dark:text-white">{data.evasao_real_vs_predita.total_risco_alto}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Alunos com risco alto no período</p>
            </div>

            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Alunos Ativos</p>
              <p className="text-4xl font-bold text-green-800 dark:text-green-300">{data.evasao_real_vs_predita.alunos_ativos}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                {data.evasao_real_vs_predita.taxa_retention}% de retention
              </p>
            </div>

            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Provável Evasão</p>
              <p className="text-4xl font-bold text-red-800 dark:text-red-300">{data.evasao_real_vs_predita.alunos_evasao}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                {data.evasao_real_vs_predita.taxa_evasao_real}% taxa real
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Seção: ROI do Sistema */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">ROI do Sistema (Alunos Salvos)</h2>
        </div>

        {data && (
          <div className="space-y-6">
            {/* Barra de progresso do ROI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Eficácia do Sistema</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{data.roi_sistema.roi_percentual}%</span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    data.roi_sistema.roi_percentual >= 60 ? "bg-green-500" :
                    data.roi_sistema.roi_percentual >= 40 ? "bg-orange-500" : "bg-red-500"
                  )}
                  style={{ width: `${data.roi_sistema.roi_percentual}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {data.roi_sistema.alunos_salvos} de {data.roi_sistema.total_intervencao} alunos salvos
              </p>
            </div>
            
            {/* Stats adicionais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Evasão Evitada (Estimada)</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-300 mt-1">
                  {Math.round(data.roi_sistema.evasao_evitada_estimada)} alunos
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Impacto Percentual</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-300 mt-1">
                  {data.roi_sistema.impacto_percentual}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção: Alunos Recuperados (Lista) */}
      {data && data.alunos_recuperados.lista.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Alunos Recuperados (Top 10)</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Aluno</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Curso</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Risco Inicial</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Risco Final</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Variação</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Intervenções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {data.alunos_recuperados.lista.map((aluno) => (
                  <tr key={aluno.matricula} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{aluno.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{aluno.matricula}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{aluno.curso}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        aluno.nivel_inicial === 'ALTO' ? 'bg-red-100 text-red-800' :
                        aluno.nivel_inicial === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        {aluno.risco_inicial}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        aluno.nivel_final === 'ALTO' ? 'bg-red-100 text-red-800' :
                        aluno.nivel_final === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        {aluno.risco_final}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-bold">
                          {Math.abs(aluno.variacao).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {aluno.intervencoes_recebidas}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seção: Impacto por Tipo de Intervenção */}
      {impactoChartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Impacto por Tipo de Intervenção</h2>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={impactoChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
              <XAxis dataKey="tipo" stroke="#6b7280" className="dark:stroke-slate-400" fontSize={12} />
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
              <Legend />
              <Bar dataKey="sucesso" name="Taxa de Sucesso (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="variacao" name="Variação Média (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumo Geral */}
      {data && (
        <div className={cn(
          "p-6 rounded-2xl border-2",
          data.resumo_geral.eficacia_geral >= 60 ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" :
          data.resumo_geral.eficacia_geral >= 40 ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" :
          "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Resumo Geral</h3>
              <p className="text-gray-600 dark:text-slate-300 mt-1">
                {data.resumo_geral.recomendacao}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-slate-400">Eficácia Geral</p>
              <p className={cn(
                "text-4xl font-bold",
                data.resumo_geral.eficacia_geral >= 60 ? "text-green-600" :
                data.resumo_geral.eficacia_geral >= 40 ? "text-orange-600" : "text-red-600"
              )}>
                {data.resumo_geral.eficacia_geral}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
