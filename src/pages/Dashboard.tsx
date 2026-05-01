import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, CheckCircle, TrendingUp, ArrowRight, ClipboardList, Clock, Calendar, BookOpen, Award, Target, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { NivelRisco } from '../types';
import { cn } from '../utils';
import { StatCard, RiskBadge, DashboardSkeleton } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useDashboardStats, AlunoRisco } from '../hooks/useDashboardStats';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  const { token } = useAuth();
  const { stats, riscoPorCurso, topAlunosRisco, isLoading: statsLoading, error } = useDashboardStats();
  const [eficaciaStats, setEficaciaStats] = useState<any>(null);
  const [faltasStats, setFaltasStats] = useState<any>(null);

  useEffect(() => {
    // Carregar stats de eficácia
    const loadEficacia = async () => {
      if (!token) return;
      try {
        const data = await api.intervencoes.stats(token);
        setEficaciaStats(data);
      } catch (error) {
        console.error('Erro ao carregar eficácia:', error);
        addToast({
          type: 'error',
          title: 'Erro ao carregar',
          message: 'Não foi possível carregar estatísticas de intervenções',
        });
      }
    };
    loadEficacia();

    // Carregar stats de faltas
    const loadFaltas = async () => {
      if (!token) return;
      try {
        const data = await api.faltas.stats(token);
        setFaltasStats(data);
      } catch (error) {
        console.error('Erro ao carregar faltas:', error);
        addToast({
          type: 'error',
          title: 'Erro ao carregar',
          message: 'Não foi possível carregar estatísticas de faltas',
        });
      }
    };
    loadFaltas();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!statsLoading && stats) {
        addToast({
          type: 'success',
          title: 'Dashboard carregada',
          message: `Dados reais: ${stats.total_alunos} alunos`,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [statsLoading, stats]);

  const pieData = stats ? [
    { name: 'Muito Alto', value: stats.risco_muito_alto || 0, color: '#a855f7' },
    { name: 'Risco Alto', value: stats.risco_alto, color: '#ef4444' },
    { name: 'Risco Médio', value: stats.risco_medio, color: '#f59e0b' },
    { name: 'Risco Baixo', value: stats.risco_baixo, color: '#10b981' },
  ] : [];

  if (isLoading || statsLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 mb-4">
            <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">
              ⚠️ Erro ao Carregar Dashboard
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
          <p className="text-gray-500 dark:text-slate-400">
            Verifique se o backend está rodando em http://localhost:8000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 bg-gray-50 dark:bg-slate-950 min-h-screen">
      <header className="mb-4 md:mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard SAPEE</h2>
        <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 mt-1">Visão geral do alerta de evasão escolar no campus.</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <StatCard
          title="Total de Alunos"
          value={stats?.total_alunos || 0}
          icon={Users}
          color="blue"
          trend={{ value: 12, label: 'vs mês anterior', isPositive: true }}
        />
        <StatCard
          title="Muito Alto Risco"
          value={stats?.risco_muito_alto || 0}
          icon={Zap}
          color="purple"
          trend={{ value: 0, label: 'vs mês anterior', isPositive: true }}
        />
        <StatCard
          title="Risco Alto"
          value={stats?.risco_alto || 0}
          icon={AlertTriangle}
          color="red"
          trend={{ value: 5, label: 'vs mês anterior', isPositive: false }}
        />
        <StatCard
          title="Risco Médio"
          value={stats?.risco_medio || 0}
          icon={TrendingUp}
          color="amber"
          trend={{ value: 2, label: 'vs mês anterior', isPositive: true }}
        />
        <StatCard
          title="Risco Baixo"
          value={stats?.risco_baixo || 0}
          icon={CheckCircle}
          color="emerald"
          trend={{ value: 3, label: 'vs mês anterior', isPositive: true }}
        />
      </div>

      {/* Cards de Eficácia das Intervenções */}
      {eficaciaStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              <span className="truncate">Eficácia das Intervenções</span>
            </h3>
            <Link
              to="/relatorio-eficacia"
              className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              Ver relatório completo <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Intervenções Ativas"
              value={eficaciaStats.ativas || 0}
              icon={Target}
              color="blue"
              trend={eficaciaStats.pendentes ? { value: eficaciaStats.pendentes, label: 'pendentes', isPositive: false } : undefined}
            />
            <StatCard
              title="Taxa de Conclusão"
              value={`${eficaciaStats.taxa_conclusao || 0}%`}
              icon={CheckCircle}
              color="emerald"
              trend={eficaciaStats.concluidas ? { value: eficaciaStats.concluidas, label: 'concluídas', isPositive: true } : undefined}
            />
            <StatCard
              title="Intervenções Urgentes"
              value={eficaciaStats.urgentes || 0}
              icon={AlertTriangle}
              color="red"
              trend={eficaciaStats.urgentes > 0 ? { value: eficaciaStats.urgentes, label: 'requer atenção', isPositive: false } : undefined}
            />
            <StatCard
              title="Total Intervenções"
              value={eficaciaStats.total || 0}
              icon={ClipboardList}
              color="purple"
              trend={eficaciaStats.em_andamento ? { value: eficaciaStats.em_andamento, label: 'em andamento', isPositive: true } : undefined}
            />
          </div>
        </motion.div>
      )}

      {/* Cards de Faltas Consecutivas */}
      {faltasStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              <span className="truncate">Faltas Consecutivas</span>
            </h3>
            <Link
              to="/faltas/alertas"
              className="text-xs md:text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1"
            >
              Ver alertas <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Alertas Pendentes"
              value={faltasStats.total_alertas_pendentes || 0}
              icon={Clock}
              color="amber"
              trend={faltasStats.total_alertas_pendentes > 0 ? { value: faltasStats.total_alertas_pendentes, label: 'requer ação', isPositive: false } : undefined}
            />
            <StatCard
              title="3 Faltas"
              value={faltasStats.total_alertas_3_faltas || 0}
              icon={AlertTriangle}
              color="amber"
              trend={{ value: 1, label: 'baixa prioridade', isPositive: true }}
            />
            <StatCard
              title="5 Faltas"
              value={faltasStats.total_alertas_5_faltas || 0}
              icon={AlertTriangle}
              color="purple"
              trend={{ value: 2, label: 'média prioridade', isPositive: false }}
            />
            <StatCard
              title="10 Faltas"
              value={faltasStats.total_alertas_10_faltas || 0}
              icon={AlertTriangle}
              color="red"
              trend={faltasStats.total_alertas_10_faltas > 0 ? { value: 3, label: 'ação imediata', isPositive: false } : undefined}
            />
          </div>
        </motion.div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Pie Chart - Distribuição de Risco */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <h3 className="text-sm md:text-lg font-semibold mb-4 md:mb-6 text-gray-900 dark:text-white">📊 Distribuição de Risco</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-75 text-gray-400">
              Sem dados disponíveis
            </div>
          )}
        </motion.div>

        {/* Bar Chart - Risco por Curso */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <h3 className="text-sm md:text-lg font-semibold mb-4 md:mb-6 text-gray-900 dark:text-white">📚 Risco por Curso</h3>
          {riscoPorCurso.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riscoPorCurso}>
                <XAxis dataKey="curso" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="muito_alto" name="Muito Alto" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="alto" name="Risco Alto" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="medio" name="Risco Médio" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="baixo" name="Risco Baixo" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-75 text-gray-400">
              Sem dados disponíveis
            </div>
          )}
        </motion.div>
      </div>

      {/* Top 5 Alunos em Risco Crítico */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white truncate">⚠️ Top 5 Alunos em Risco Crítico</h3>
          <Link to="/alunos?nivelRisco=ALTO" className="text-blue-600 text-xs md:text-sm font-medium hover:underline flex items-center gap-1 shrink-0">
            Ver todos <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
          </Link>
        </div>
        {topAlunosRisco.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Aluno</th>
                  <th className="px-6 py-4 font-semibold">Curso</th>
                  <th className="px-6 py-4 font-semibold text-center">Score de Risco</th>
                  <th className="px-6 py-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {topAlunosRisco.map((aluno) => (
                  <tr key={aluno.matricula} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{aluno.nome}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500">Matrícula: {aluno.matricula}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{aluno.curso}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              aluno.nivel_risco === 'MUITO_ALTO' ? 'bg-purple-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${aluno.risco_evasao}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${
                          aluno.nivel_risco === 'MUITO_ALTO' ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'
                        }`}>{aluno.risco_evasao}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/aluno/${aluno.matricula}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            Nenhum aluno em risco crítico encontrado
          </div>
        )}
      </motion.div>
    </div>
  );
}
