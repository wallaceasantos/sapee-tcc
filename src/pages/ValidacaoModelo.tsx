/**
 * Página de Validação do Modelo de Predição
 * SAPEE DEWAS - Métricas de eficácia: Accuracy, Precision, Recall, F1
 *
 * Responde:
 * - "Dos alunos classificados como ALTO, quantos realmente evadiram?"
 * - "Qual a precisão do modelo?"
 * - "Quais foram os falsos negativos? (alunos que o modelo não alertou mas evadiram)"
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, Activity, Target, BarChart3, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { useAuth } from '../services/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface MetricasModelo {
  total_avaliado: number;
  acertos: number;
  erros: number;
  taxa_acerto_geral: number | null;
  acuracia: number | null;
  precisao: number | null;
  recall: number | null;
  f1_score: number | null;
  verdadeiros_positivos: number;
  verdadeiros_negativos: number;
  falsos_positivos: number;
  falsos_negativos: number;
  detalhes_por_nivel: Record<string, { total: number; acertos: number; taxa_acerto: number | null }>;
}

const CORES_NIVEL: Record<string, string> = {
  BAIXO: '#10B981',
  MEDIO: '#F59E0B',
  ALTO: '#EF4444',
  MUITO_ALTO: '#7C3AED',
};

export default function ValidacaoModelo() {
  const { token } = useAuth();
  const [metricas, setMetricas] = useState<MetricasModelo | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('2a');

  useEffect(() => {
    loadMetricas();
  }, [periodo, token]);

  const loadMetricas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string;
      if (periodo === '6m') {
        startDate = new Date(now.setMonth(now.getMonth() - 6)).toISOString().split('T')[0];
      } else if (periodo === '1a') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
      } else {
        startDate = new Date(now.setFullYear(now.getFullYear() - 2)).toISOString().split('T')[0];
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/metricas/fallback-eficacia`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const result = await response.json();
        setMetricas(result);
      } else {
        throw new Error('Erro ao carregar métricas');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const interpretacaoAcuracia = (acc: number | null): { texto: string; cor: string } => {
    if (!acc) return { texto: 'Dados insuficientes', cor: 'text-gray-500' };
    if (acc >= 80) return { texto: 'Excelente', cor: 'text-green-600' };
    if (acc >= 70) return { texto: 'Bom', cor: 'text-blue-600' };
    if (acc >= 60) return { texto: 'Regular', cor: 'text-yellow-600' };
    return { texto: 'Precisa melhorar', cor: 'text-red-600' };
  };

  const dadosMatriz = metricas ? [
    { nome: 'VP', valor: metricas.verdadeiros_positivos, label: 'Acertou Risco', cor: '#10B981' },
    { nome: 'VN', valor: metricas.verdadeiros_negativos, label: 'Acertou Sem Risco', cor: '#3B82F6' },
    { nome: 'FP', valor: metricas.falsos_positivos, label: 'Falso Alarme', cor: '#F59E0B' },
    { nome: 'FN', valor: metricas.falsos_negativos, label: 'Perdeu Caso', cor: '#EF4444' },
  ] : [];

  const dadosPorNivel = metricas?.detalhes_por_nivel ? Object.entries(metricas.detalhes_por_nivel).map(([nivel, dados]) => ({
    nivel,
    taxa_acerto: dados.taxa_acerto || 0,
    acertos: dados.acertos,
    total: dados.total,
  })) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">Carregando métricas...</span>
      </div>
    );
  }

  if (!metricas || metricas.total_avaliado === 0) {
    return (
      <div className="text-center py-16">
        <Target className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 dark:text-slate-300 mb-2">
          Dados de Validação Insuficientes
        </h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-lg mx-auto">
          As métricas de validação do modelo são calculadas automaticamente quando alunos se tornam egressos.
          Cadastre egressos em <strong>Egressos</strong> para começar a medir a precisão do modelo.
        </p>
      </div>
    );
  }

  const interp = interpretacaoAcuracia(metricas.acuracia);

  return (
    <div className="space-y-6">
      {/* Header + Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
            Validação do Modelo de Predição
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Accuracy, Precision, Recall e F1-Score do modelo de evasão
          </p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
        >
          <option value="6m">Últimos 6 meses</option>
          <option value="1a">Último ano</option>
          <option value="2a">Últimos 2 anos</option>
        </select>
      </div>

      {/* Alerta se houver falsos negativos */}
      {metricas.falsos_negativos > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800 dark:text-red-300">
                Atenção: {metricas.falsos_negativos} Falso{metricas.falsos_negativos > 1 ? 's' : ''} Negativo{metricas.falsos_negativos > 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                O modelo classificou como BAIXO/MEDIO mas o aluno evadiu.
                Estes são os casos mais críticos para ajuste do modelo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Métricas Principais (Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Acurácia */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Acurácia</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white">
            {metricas.acuracia ?? '-'}%
          </div>
          <div className={cn("text-xs font-bold mt-1", interp.cor)}>
            {interp.texto}
          </div>
        </div>

        {/* Precisão */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Precisão</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white">
            {metricas.precisao ?? '-'}%
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            VP / (VP + FP)
          </div>
        </div>

        {/* Recall */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Recall</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white">
            {metricas.recall ?? '-'}%
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            VP / (VP + FN)
          </div>
        </div>

        {/* F1-Score */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">F1-Score</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white">
            {metricas.f1_score ?? '-'}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Média harmônica
          </div>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">
          Resumo da Validação
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{metricas.verdadeiros_positivos}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Verdadeiros Positivos
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{metricas.verdadeiros_negativos}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Verdadeiros Negativos
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{metricas.falsos_positivos}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Falsos Positivos
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{metricas.falsos_negativos}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              <XCircle className="w-3 h-3 inline mr-1" />
              Falsos Negativos
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matriz de Confusão */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">
            Matriz de Confusão
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosMatriz}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
              <Tooltip />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {dadosMatriz.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-gray-600 dark:text-slate-400">VP: Alertou e Evadiu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-gray-600 dark:text-slate-400">VN: Não Alertou e Ficou</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-gray-600 dark:text-slate-400">FP: Alertou mas Ficou</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-gray-600 dark:text-slate-400">FN: Não Alertou mas Evadiu</span>
            </div>
          </div>
        </div>

        {/* Taxa de Acerto por Nível */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">
            Acertos por Nível de Risco
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosPorNivel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="nivel" tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6B7280" />
              <Tooltip />
              <Bar dataKey="taxa_acerto" radius={[4, 4, 0, 0]}>
                {dadosPorNivel.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES_NIVEL[entry.nivel] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-4">
            {dadosPorNivel.map(d => (
              <div key={d.nivel} className="flex items-center justify-between text-xs">
                <span className="font-bold" style={{ color: CORES_NIVEL[d.nivel] }}>{d.nivel}</span>
                <span className="text-gray-600 dark:text-slate-400">
                  {d.acertos}/{d.total} acertos ({d.taxa_acerto}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interpretação */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
        <h3 className="text-base font-bold text-indigo-800 dark:text-indigo-300 mb-2">
          📖 Interpretação das Métricas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-700 dark:text-indigo-400">
          <div>
            <strong>Acurácia ({metricas.acuracia ?? '-'}%):</strong> De todos os casos avaliados, o modelo acertou {metricas.acertos} de {metricas.total_avaliado}.
          </div>
          <div>
            <strong>Precisão ({metricas.precisao ?? '-'}%):</strong> Quando o modelo alertou risco, ele acertou {metricas.verdadeiros_positivos} de {metricas.verdadeiros_positivos + metricas.falsos_positivos} vezes.
          </div>
          <div>
            <strong>Recall ({metricas.recall ?? '-'}%):</strong> Dos alunos que realmente evadiram, o modelo detectou {metricas.verdadeiros_positivos} de {metricas.verdadeiros_positivos + metricas.falsos_negativos}.
          </div>
          <div>
            <strong>F1-Score ({metricas.f1_score ?? '-'}):</strong> Média harmônica entre precisão e recall. Ideal &gt; 0.7.
          </div>
        </div>
      </div>
    </div>
  );
}
