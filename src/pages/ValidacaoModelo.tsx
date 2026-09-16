/**
 * Página de Validação do Modelo de Predição
 * SAPEE DEWAS - Métricas de eficácia: Accuracy, Precision, Recall, F1
 *
 * Responde:
 * - "Dos alunos classificados como ALTO, quantos realmente evadiram?"
 * - "Qual a precisão do modelo?"
 * - "Quais foram os falsos negativos? (alunos que o modelo não alertou mas evadiram)"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, Activity, Target, BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../services/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FalsoNegativo {
  matricula: string;
  nome: string;
  curso: string;
  motivo_saida: string;
  nivel_predito: string;
  data_saida: string | null;
  recebeu_intervencao: boolean;
  ano_ingresso: number;
}

interface MetricasBloco {
  total: number;
  vp: number;
  vn: number;
  fp: number;
  fn: number;
  acuracia: number | null;
  precisao: number | null;
  recall: number | null;
  f1_score: number | null;
}

interface ValidacaoResponse {
  metricas_globais: MetricasBloco;
  matriz_confusao: { vp: number; vn: number; fp: number; fn: number };
  detalhes_por_nivel: Record<string, MetricasBloco>;
  detalhes_por_coorte: Record<string, MetricasBloco>;
  falsos_negativos: FalsoNegativo[];
  total_egressos: number;
  total_evadidos: number;
  total_concluintes: number;
}

const CORES_NIVEL: Record<string, string> = {
  BAIXO: '#10B981',
  MEDIO: '#F59E0B',
  ALTO: '#EF4444',
  MUITO_ALTO: '#7C3AED',
};

export default function ValidacaoModelo() {
  const { token } = useAuth();
  const [data, setData] = useState<ValidacaoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'geral' | 'coortes' | 'falsos-negativos'>('geral');

  const loadMetricas = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/metricas/validacao-modelo`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 404) {
        setData(null);
      } else {
        throw new Error('Erro ao carregar metricas');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMetricas();
  }, [token, loadMetricas]);

  const metricas = data?.metricas_globais;
  const mc = data?.matriz_confusao;

  const interpretacaoAcuracia = (acc: number | null): { texto: string; cor: string } => {
    if (!acc) return { texto: 'Dados insuficientes', cor: 'text-gray-500' };
    if (acc >= 80) return { texto: 'Excelente', cor: 'text-green-600' };
    if (acc >= 70) return { texto: 'Bom', cor: 'text-blue-600' };
    if (acc >= 60) return { texto: 'Regular', cor: 'text-yellow-600' };
    return { texto: 'Precisa melhorar', cor: 'text-red-600' };
  };

  const dadosMatriz = mc ? [
    { nome: 'VP', valor: mc.vp, label: 'Acertou Risco', cor: '#10B981' },
    { nome: 'VN', valor: mc.vn, label: 'Acertou Sem Risco', cor: '#3B82F6' },
    { nome: 'FP', valor: mc.fp, label: 'Falso Alarme', cor: '#F59E0B' },
    { nome: 'FN', valor: mc.fn, label: 'Perdeu Caso', cor: '#EF4444' },
  ] : [];

  const dadosPorNivel = data?.detalhes_por_nivel
    ? Object.entries(data.detalhes_por_nivel)
        .filter(([, d]) => d.total > 0)
        .map(([nivel, d]) => ({
          nivel,
          taxa_acerto: d.acuracia || 0,
          vp: d.vp, vn: d.vn, fp: d.fp, fn: d.fn,
          total: d.total,
        }))
    : [];

  const dadosPorCoorte = data?.detalhes_por_coorte
    ? Object.entries(data.detalhes_por_coorte)
        .filter(([, d]) => d.total > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([coorte, d]) => ({
          coorte,
          acuracia: d.acuracia || 0,
          precisao: d.precisao || 0,
          recall: d.recall || 0,
          total: d.total,
        }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">Carregando metricas...</span>
      </div>
    );
  }

  if (!data || !metricas || metricas.total === 0) {
    return (
      <div className="text-center py-16">
        <Target className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 dark:text-slate-300 mb-2">
          Dados de Validacao Insuficientes
        </h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-lg mx-auto">
          As metricas de validacao do modelo sao calculadas automaticamente quando alunos se tornam egressos.
          Cadastre egressos em <strong>Egressos</strong> para comecar a medir a precisao do modelo.
        </p>
      </div>
    );
  }

  const interp = interpretacaoAcuracia(metricas.acuracia);
  const evasaoPct = data.total_egressos > 0 ? Math.round(data.total_evadidos / data.total_egressos * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
            Validacao do Modelo de Predicao
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {data.total_egressos} egressos analisados &middot; {data.total_evadidos} evadidos &middot; {evasaoPct}% taxa de evasao
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          {(['geral', 'coortes', 'falsos-negativos'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-bold transition-all',
                aba === a
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              )}
            >
              {a === 'geral' ? 'Geral' : a === 'coortes' ? 'Por Coorte' : 'Falsos Negativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta de falsos negativos */}
      {mc && mc.fn > 0 && aba === 'geral' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800 dark:text-red-300">
                Atencao: {mc.fn} Falso{mc.fn > 1 ? 's' : ''} Negativo{mc.fn > 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                O modelo classificou como BAIXO/MEDIO mas o aluno evadiu.
                Estes sao os casos mais criticos para ajuste do modelo.
              </p>
            </div>
          </div>
        </div>
      )}
      {aba === 'geral' && metricas && mc && (
        <>
          {/* Metricas Principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Acuracia</span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">{metricas.acuracia ?? '-'}%</div>
              <div className={cn("text-xs font-bold mt-1", interp.cor)}>{interp.texto}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Precisao</span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">{metricas.precisao ?? '-'}%</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">VP / (VP + FP)</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Recall</span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">{metricas.recall ?? '-'}%</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">VP / (VP + FN)</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">F1-Score</span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">{metricas.f1_score ?? '-'}%</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Media harmonica</div>
            </div>
          </div>

          {/* Resumo Geral */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">Resumo da Validacao</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div><div className="text-2xl font-bold text-green-600">{mc.vp}</div><div className="text-xs text-gray-500 dark:text-slate-400 mt-1"><CheckCircle className="w-3 h-3 inline mr-1" />VP</div></div>
              <div><div className="text-2xl font-bold text-blue-600">{mc.vn}</div><div className="text-xs text-gray-500 dark:text-slate-400 mt-1"><CheckCircle className="w-3 h-3 inline mr-1" />VN</div></div>
              <div><div className="text-2xl font-bold text-yellow-600">{mc.fp}</div><div className="text-xs text-gray-500 dark:text-slate-400 mt-1"><AlertTriangle className="w-3 h-3 inline mr-1" />FP</div></div>
              <div><div className="text-2xl font-bold text-red-600">{mc.fn}</div><div className="text-xs text-gray-500 dark:text-slate-400 mt-1"><XCircle className="w-3 h-3 inline mr-1" />FN</div></div>
            </div>
          </div>

          {/* Graficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">Matriz de Confusao</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dadosMatriz}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {dadosMatriz.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.cor} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">Acuracia por Nivel de Risco</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dadosPorNivel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="nivel" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="taxa_acerto" radius={[4, 4, 0, 0]}>
                    {dadosPorNivel.map((entry, index) => (<Cell key={`cell-${index}`} fill={CORES_NIVEL[entry.nivel] || '#6B7280'} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-4">
                {dadosPorNivel.map(d => (
                  <div key={d.nivel} className="flex items-center justify-between text-xs">
                    <span className="font-bold" style={{ color: CORES_NIVEL[d.nivel] }}>{d.nivel}</span>
                    <span className="text-gray-600 dark:text-slate-400">VP={d.vp} VN={d.vn} FP={d.fp} FN={d.fn} ({d.taxa_acerto}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interpretacao */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
            <h3 className="text-base font-bold text-indigo-800 dark:text-indigo-300 mb-2">Interpretacao das Metricas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-700 dark:text-indigo-400">
              <div><strong>Acuracia ({metricas.acuracia ?? '-'}%):</strong> De {metricas.total} casos, o modelo acertou {mc.vp + mc.vn}.</div>
              <div><strong>Precisao ({metricas.precisao ?? '-'}%):</strong> Quando alertou risco, acertou {mc.vp} de {mc.vp + mc.fp} vezes.</div>
              <div><strong>Recall ({metricas.recall ?? '-'}%):</strong> Dos {mc.vp + mc.fn} alunos que evadiram, detectou {mc.vp}.</div>
              <div><strong>F1-Score ({metricas.f1_score ?? '-'}%):</strong> Media harmonica entre precisao e recall.</div>
            </div>
          </div>
        </>
      )}

      {/* Aba: Coortes */}
      {aba === 'coortes' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">Metricas por Ano de Ingresso</h3>
          {dadosPorCoorte.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados de coorte disponiveis.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="py-2 font-bold text-gray-500">Coorte</th>
                    <th className="py-2 font-bold text-gray-500">Egressos</th>
                    <th className="py-2 font-bold text-gray-500">Acuracia</th>
                    <th className="py-2 font-bold text-gray-500">Precisao</th>
                    <th className="py-2 font-bold text-gray-500">Recall</th>
                    <th className="py-2 font-bold text-gray-500">F1</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPorCoorte.map((c) => (
                    <tr key={c.coorte} className="border-b border-gray-100 dark:border-slate-800">
                      <td className="py-2 font-bold text-gray-900 dark:text-white">{c.coorte}</td>
                      <td className="py-2 text-gray-600 dark:text-slate-400">{c.total}</td>
                      <td className="py-2">{c.acuracia}%</td>
                      <td className="py-2">{c.precisao}%</td>
                      <td className="py-2">{c.recall}%</td>
                      <td className="py-2 font-bold text-indigo-600">{data.detalhes_por_coorte[c.coorte]?.f1_score ?? '-'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Aba: Falsos Negativos */}
      {aba === 'falsos-negativos' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-base font-bold text-gray-800 dark:text-white">
              Alunos que Evadiram sem Alerta do Modelo
            </h3>
            <span className="text-sm text-gray-500">({data.falsos_negativos.length} casos)</span>
          </div>
          {data.falsos_negativos.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-slate-400 font-bold">Nenhum falso negativo!</p>
              <p className="text-sm text-gray-500">O modelo detectou todos os casos de evasao.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="py-2 font-bold text-gray-500">Aluno</th>
                    <th className="py-2 font-bold text-gray-500">Matricula</th>
                    <th className="py-2 font-bold text-gray-500">Curso</th>
                    <th className="py-2 font-bold text-gray-500">Risco Predito</th>
                    <th className="py-2 font-bold text-gray-500">Motivo</th>
                    <th className="py-2 font-bold text-gray-500">Data Saida</th>
                    <th className="py-2 font-bold text-gray-500">Intervencao</th>
                  </tr>
                </thead>
                <tbody>
                  {data.falsos_negativos.map((fn) => (
                    <tr key={fn.matricula} className="border-b border-gray-100 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10">
                      <td className="py-2 font-bold text-gray-900 dark:text-white">{fn.nome}</td>
                      <td className="py-2 text-gray-600 dark:text-slate-400 font-mono text-xs">{fn.matricula}</td>
                      <td className="py-2 text-gray-600 dark:text-slate-400">{fn.curso}</td>
                      <td className="py-2"><span className={cn("px-2 py-0.5 rounded text-xs font-bold", fn.nivel_predito === 'BAIXO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{fn.nivel_predito}</span></td>
                      <td className="py-2 text-gray-600 dark:text-slate-400">{fn.motivo_saida}</td>
                      <td className="py-2 text-gray-600 dark:text-slate-400">{fn.data_saida ? new Date(fn.data_saida).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="py-2">{fn.recebeu_intervencao ? <span className="text-green-600 font-bold text-xs">Sim</span> : <span className="text-red-500 text-xs">Nao</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
