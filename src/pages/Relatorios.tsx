/**
 * Página de Relatórios e Insights
 * SAPEE DEWAS - Análise baseada em dados reais do sistema
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, Filter, Lightbulb, TrendingUp, Users, Calendar, ChevronDown, Share2, Printer, Loader2, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import { NivelRisco } from '../types';
import { cn } from '../utils';
import { RiskBadge, StatCard } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Relatorios() {
  const { token } = useAuth();
  const { addToast } = useToast();
  
  const [periodo, setPeriodo] = useState('todos');
  const [curso, setCurso] = useState('Todos');
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dados reais do sistema
  const [stats, setStats] = useState<any>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [intervencoes, setIntervencoes] = useState<any>(null);
  const [eficacia, setEficacia] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, [token]);

  const carregarDados = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Carregar estatísticas gerais
      const statsData = await api.dashboard.stats(token);
      setStats(statsData);
      
      // Carregar todos os alunos
      const alunosData = await api.alunos.list(token, 0, 1000);
      setAlunos(alunosData);
      
      // Carregar estatísticas de intervenções
      try {
        const intervencoesData = await api.intervencoes.stats(token);
        setIntervencoes(intervencoesData);
      } catch (e) {
        console.warn('Erro ao carregar intervenções:', e);
        addToast({
          type: 'error',
          title: 'Erro ao carregar',
          message: 'Não foi possível carregar estatísticas de intervenções',
        });
      }
      
      // Carregar eficácia do sistema
      try {
        const eficaciaData = await api.intervencoes.eficacia(token);
        setEficacia(eficaciaData);
      } catch (e) {
        console.warn('Erro ao carregar eficácia:', e);
        addToast({
          type: 'error',
          title: 'Erro ao carregar',
          message: 'Não foi possível carregar dados de eficácia',
        });
      }
      
      addToast({
        type: 'success',
        title: 'Dados carregados',
        message: 'Relatórios atualizados com dados reais do sistema',
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: 'Não foi possível carregar os dados dos relatórios',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar alunos por curso
  const alunosFiltrados = curso === 'Todos' 
    ? alunos 
    : alunos.filter((a: any) => {
        const cursoNome = a.curso?.nome || a.curso_nome || '';
        return cursoNome.includes(curso);
      });

  // Calcular distribuição de risco
  const totalAlunos = alunosFiltrados.length;
  const riscoAlto = alunosFiltrados.filter((a: any) => {
    const pred = a.predicao_atual || a.predicao;
    return pred?.nivel_risco === NivelRisco.ALTO || pred?.nivel_risco === NivelRisco.MUITO_ALTO;
  }).length;
  
  const riscoMedio = alunosFiltrados.filter((a: any) => {
    const pred = a.predicao_atual || a.predicao;
    return pred?.nivel_risco === NivelRisco.MEDIO;
  }).length;
  
  const riscoBaixo = alunosFiltrados.filter((a: any) => {
    const pred = a.predicao_atual || a.predicao;
    return pred?.nivel_risco === NivelRisco.BAIXO;
  }).length;

  const percRiscoAlto = totalAlunos > 0 ? ((riscoAlto / totalAlunos) * 100).toFixed(1) : '0';

  // Dados para gráfico de pizza
  const pieData = [
    { name: 'Baixo Risco', value: riscoBaixo },
    { name: 'Médio Risco', value: riscoMedio },
    { name: 'Alto Risco', value: riscoAlto },
  ];

  // Risco por Renda (dados reais)
  const rendaData = calcularRiscoPorRenda(alunosFiltrados);

  // Risco por Cidade (dados reais)
  const cidadeData = calcularRiscoPorCidade(alunosFiltrados);

  // Dados para scatter plot (frequência vs média)
  const scatterData = alunosFiltrados
    .filter((a: any) => {
      const pred = a.predicao_atual || a.predicao;
      return pred && a.frequencia && a.media_geral;
    })
    .map((a: any) => {
      const pred = a.predicao_atual || a.predicao;
      return {
        frequencia: parseFloat(a.frequencia) || 0,
        media_geral: parseFloat(a.media_geral) || 0,
        risco_evasao: parseFloat(pred.risco_evasao) || 0,
        nome: a.nome,
        matricula: a.matricula,
      };
    });

  // Risco por curso
  const riscoPorCursoData = calcularRiscoPorCurso(alunos);

  const handleExport = async (format: string) => {
    setIsExporting(true);

    try {
      if (format === 'csv') {
        // Exportação CSV real
        const headers = 'Matrícula;Nome;Curso;Frequência;Média;Risco;Nível de Risco\n';
        const rows = alunos.map((a: any) => {
          const predicao = a.predicao_atual || a.predicao;
          return `${a.matricula};${a.nome};${a.curso?.nome || a.curso || 'N/A'};${a.frequencia || 0}%;${a.media_geral || 0};${predicao?.risco_evasao || 0}%;${predicao?.nivel_risco || 'N/A'}`;
        }).join('\n');

        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_sapee_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'json') {
        // Exportação JSON real
        const data = {
          data_exportacao: new Date().toISOString(),
          total_alunos: alunos.length,
          alunos: alunos.map((a: any) => ({
            matricula: a.matricula,
            nome: a.nome,
            curso: a.curso?.nome || a.curso || 'N/A',
            frequencia: a.frequencia,
            media_geral: a.media_geral,
            predicao: a.predicao_atual || a.predicao,
          })),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_sapee_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      addToast({
        type: 'success',
        title: 'Exportação concluída',
        message: `Relatório exportado em formato ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Erro na exportação:', error);
      addToast({
        type: 'error',
        title: 'Erro na exportação',
        message: 'Não foi possível exportar o relatório',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Relatórios e Insights</h2>
          <p className="text-gray-500 dark:text-slate-400">Análise baseada em dados reais do sistema SAPEE.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 gap-2 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="text-sm font-semibold bg-transparent border-none focus:ring-0 cursor-pointer text-gray-700 dark:text-slate-300"
            >
              <option value="todos">Todos os Períodos</option>
              <option value="2026.1">Semestre 2026.1</option>
              <option value="2025.2">Semestre 2025.2</option>
              <option value="2025.1">Semestre 2025.1</option>
            </select>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 gap-2 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={curso}
              onChange={(e) => setCurso(e.target.value)}
              className="text-sm font-semibold bg-transparent border-none focus:ring-0 cursor-pointer text-gray-700 dark:text-slate-300"
            >
              <option value="Todos">Todos os Cursos</option>
              {cursos.map((c: any) => (
                <option key={c.id || c.nome} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <button onClick={() => handleExport('pdf')} className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50">
                <FileText className="w-4 h-4 text-red-500" /> PDF Document
              </button>
              <button onClick={() => handleExport('xlsx')} className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50">
                <BarChart3 className="w-4 h-4 text-emerald-500" /> Excel Spreadsheet
              </button>
              <button onClick={() => window.print()} className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Printer className="w-4 h-4 text-gray-500" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          title="Alerta Crítico"
          description={`${percRiscoAlto}% dos alunos estão em zona de risco alto. ${riscoAlto} alunos requerem atenção imediata.`}
          icon={TrendingUp}
          color="red"
        />
        <InsightCard
          title="Fator Correlacionado"
          description={`Renda familiar é um fator crítico: ${rendaData[0]?.risco || 0}% de risco médio para renda até 1 SM.`}
          icon={Lightbulb}
          color="amber"
        />
        <InsightCard
          title="Intervenções Ativas"
          description={`${intervencoes?.ativas || 0} intervenções em andamento. Taxa de conclusão: ${intervencoes?.taxa_conclusao?.toFixed(1) || 0}%.`}
          icon={Users}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Distribuição de Risco */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col"
        >
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Distribuição de Risco</h3>
          <ResponsiveContainer width="100%" height={250} aspect={1}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center font-medium">
              Total de {totalAlunos} alunos: {riscoBaixo} baixo risco, {riscoMedio} médio risco, {riscoAlto} alto risco.
            </p>
          </div>
        </motion.div>

        {/* Risco por Renda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Risco Médio por Faixa de Renda</h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250} aspect={2}>
            <BarChart data={rendaData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
              <XAxis type="number" hide />
              <YAxis dataKey="faixa" type="category" axisLine={false} tickLine={false} fontSize={11} width={80} tick={{ fill: '#6b7280', fontWeight: 500 }} />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Bar dataKey="risco" name="Risco Médio %" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risco por Cidade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Risco Médio por Localidade</h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <Share2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250} aspect={2}>
            <BarChart data={cidadeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#6b7280', fontWeight: 500 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#6b7280', fontWeight: 500 }} />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Bar dataKey="risco" name="Risco Médio %" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Análise Avançada: Frequência vs Média */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Correlação: Frequência vs Média</h3>
            <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250} aspect={2}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" dataKey="frequencia" name="Frequência" unit="%" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#6b7280' }} />
              <YAxis type="number" dataKey="media_geral" name="Média" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#6b7280' }} />
              <ZAxis type="number" dataKey="risco_evasao" range={[50, 400]} name="Risco" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Scatter
                name="Alunos"
                data={scatterData}
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="mt-4 text-xs text-gray-400 italic text-center">
            * O tamanho do círculo representa o nível de risco de evasão.
          </p>
        </motion.div>
      </div>

      {/* Risco por Curso */}
      {riscoPorCursoData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Distribuição de Risco por Curso</h3>
            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300} aspect={2}>
            <BarChart data={riscoPorCursoData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="curso" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#6b7280', fontWeight: 500 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#6b7280', fontWeight: 500 }} />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="baixo" name="Baixo Risco" stackId="a" fill="#10b981" />
              <Bar dataKey="medio" name="Médio Risco" stackId="a" fill="#f59e0b" />
              <Bar dataKey="alto" name="Alto Risco" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}

// Funções auxiliares para calcular dados reais

function calcularRiscoPorRenda(alunos: any[]) {
  const faixas = [
    { faixa: 'Até 1 SM', min: 0, max: 1412, risco: 0, count: 0 },
    { faixa: '1-2 SM', min: 1412, max: 2824, risco: 0, count: 0 },
    { faixa: '2-3 SM', min: 2824, max: 4236, risco: 0, count: 0 },
    { faixa: 'Acima de 3 SM', min: 4236, max: Infinity, risco: 0, count: 0 },
  ];

  alunos.forEach((a: any) => {
    const renda = parseFloat(a.renda_familiar) || 0;
    const pred = a.predicao_atual || a.predicao;
    const risco = parseFloat(pred?.risco_evasao) || 0;

    const faixa = faixas.find(f => renda >= f.min && renda < f.max);
    if (faixa) {
      faixa.risco += risco;
      faixa.count += 1;
    }
  });

  return faixas.map(f => ({
    faixa: f.faixa,
    risco: f.count > 0 ? Math.round(f.risco / f.count) : 0,
  }));
}

function calcularRiscoPorCidade(alunos: any[]) {
  const cidadesMap = new Map<string, { risco: number; count: number }>();

  alunos.forEach((a: any) => {
    const cidade = a.cidade || 'Não Informada';
    const pred = a.predicao_atual || a.predicao;
    const risco = parseFloat(pred?.risco_evasao) || 0;

    if (!cidadesMap.has(cidade)) {
      cidadesMap.set(cidade, { risco: 0, count: 0 });
    }

    const data = cidadesMap.get(cidade)!;
    data.risco += risco;
    data.count += 1;
  });

  return Array.from(cidadesMap.entries())
    .map(([name, data]) => ({
      name,
      risco: Math.round(data.risco / data.count),
    }))
    .sort((a, b) => b.risco - a.risco)
    .slice(0, 10); // Top 10 cidades
}

function calcularRiscoPorCurso(alunos: any[]) {
  const cursosMap = new Map<string, { baixo: number; medio: number; alto: number }>();

  alunos.forEach((a: any) => {
    const cursoNome = a.curso?.nome || a.curso_nome || 'Sem Curso';
    const pred = a.predicao_atual || a.predicao;
    const nivel = pred?.nivel_risco?.toLowerCase();

    if (!cursosMap.has(cursoNome)) {
      cursosMap.set(cursoNome, { baixo: 0, medio: 0, alto: 0 });
    }

    const data = cursosMap.get(cursoNome)!;
    if (nivel === 'baixo') data.baixo += 1;
    else if (nivel === 'medio') data.medio += 1;
    else if (nivel === 'alto' || nivel === 'muito_alto') data.alto += 1;
  });

  return Array.from(cursosMap.entries())
    .map(([curso, data]) => ({
      curso,
      ...data,
    }))
    .filter(d => d.baixo + d.medio + d.alto > 0);
}

function InsightCard({ title, description, icon: Icon, color }: { title: string, description: string, icon: any, color: 'red' | 'amber' | 'blue' }) {
  const colors = {
    red: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn("p-6 rounded-3xl border shadow-sm transition-all", colors[color])}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2 rounded-lg", color === 'red' ? 'bg-red-100 dark:bg-red-500/20' : color === 'amber' ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-blue-100 dark:bg-blue-500/20')}>
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="font-bold uppercase tracking-wider text-xs text-gray-900 dark:text-white">{title}</h4>
      </div>
      <p className="text-sm font-semibold leading-relaxed opacity-90 text-gray-700 dark:text-slate-300">{description}</p>
    </motion.div>
  );
}
