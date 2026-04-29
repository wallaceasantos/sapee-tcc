/**
 * Página de Dashboard do Questionário Psicossocial
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 */

import React, { useState, useEffect } from 'react';
import * as questionarioApi from '../services/questionarioApi';
import { DashboardQuestionarioStats, AlunoSemQuestionario } from '../types/questionario';
import { useToast } from '../components/ui/Toast';

export const DashboardQuestionario: React.FC = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState<DashboardQuestionarioStats | null>(null);
  const [alunosSem, setAlunosSem] = useState<AlunoSemQuestionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarAlunosSem, setMostrarAlunosSem] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [statsData, alunosSemData] = await Promise.all([
        questionarioApi.getDashboardStats(),
        questionarioApi.getAlunosSemResponder(),
      ]);
      setStats(statsData);
      setAlunosSem(alunosSemData.alunos);
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: 'Não foi possível carregar dados do questionário',
      });
    } finally {
      setCarregando(false);
    }
  };

  if (carregando || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
            Carregando dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Cores para níveis de risco
  const getCorRisco = (nivel: string) => {
    switch (nivel) {
      case 'BAIXO':
        return 'bg-green-500';
      case 'MEDIO':
        return 'bg-yellow-500';
      case 'ALTO':
        return 'bg-orange-500';
      case 'MUITO_ALTO':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            Dashboard - Questionário Psicossocial
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Acompanhamento das respostas e níveis de risco
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total de Respostas */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Total de Respostas
                </p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white">
                  {stats.total_respostas}
                </p>
              </div>
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Alunos com Questionário */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Alunos Respondem
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.alunos_com_questionario}
                </p>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Alunos sem Questionário */}
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setMostrarAlunosSem(!mostrarAlunosSem)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Alunos sem Responder
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {stats.alunos_sem_questionario}
                </p>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Percentual */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Percentual de Respostas
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.percentual_respostas}%
                </p>
              </div>
              <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por Nível de Risco */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Pizza */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
              Distribuição por Nível de Risco
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.distribuicao_risco).map(([nivel, quantidade]) => (
                <div key={nivel}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {nivel.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      {quantidade}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getCorRisco(nivel.toUpperCase())} transition-all duration-500`}
                      style={{
                        width: `${stats.total_respostas > 0 ? (quantidade / stats.total_respostas) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fatores Críticos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
              Fatores Críticos Mais Frequentes
            </h3>
            {stats.fatores_criticos_frequentes.length > 0 ? (
              <div className="space-y-3">
                {stats.fatores_criticos_frequentes.map((item, index) => (
                  <div key={item.fator} className="flex items-center gap-3">
                    <span className="shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 capitalize">
                      {item.fator.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      {item.quantidade}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                Nenhum fator crítico identificado
              </p>
            )}
          </div>
        </div>

        {/* Médias por Dimensão */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
            Médias por Dimensão
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <DimensaoCard
              titulo="Saúde Mental"
              valor={stats.medias_dimensoes.media_saude_mental}
              maximo={25}
              cor="red"
            />
            <DimensaoCard
              titulo="Integração Social"
              valor={stats.medias_dimensoes.media_integracao_social}
              maximo={20}
              cor="blue"
            />
            <DimensaoCard
              titulo="Satisfação Curso"
              valor={stats.medias_dimensoes.media_satisfacao_curso}
              maximo={20}
              cor="purple"
            />
            <DimensaoCard
              titulo="Conflitos"
              valor={stats.medias_dimensoes.media_conflitos}
              maximo={20}
              cor="orange"
            />
            <DimensaoCard
              titulo="Intenção Evasão"
              valor={stats.medias_dimensoes.media_intencao_evasao}
              maximo={15}
              cor="slate"
            />
          </div>
        </div>

        {/* Lista de Alunos sem Responder */}
        {mostrarAlunosSem && alunosSem.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                Alunos sem Responder ({alunosSem.length})
              </h3>
              <button
                onClick={() => setMostrarAlunosSem(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Matrícula
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Nome
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Curso
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alunosSem.map((aluno) => (
                    <tr
                      key={aluno.matricula}
                      className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200">
                        {aluno.matricula}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200">
                        {aluno.nome}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {aluno.curso || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {aluno.email || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Card de Dimensão
interface DimensaoCardProps {
  titulo: string;
  valor: number | null;
  maximo: number;
  cor: string;
}

const DimensaoCard: React.FC<DimensaoCardProps> = ({
  titulo,
  valor,
  maximo,
  cor,
}) => {
  const porcentagem = valor ? (valor / maximo) * 100 : 0;

  const getCor = () => {
    switch (cor) {
      case 'red':
        return 'from-red-500 to-red-600';
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'orange':
        return 'from-orange-500 to-orange-600';
      case 'slate':
        return 'from-slate-500 to-slate-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{titulo}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
        {valor?.toFixed(1) || 'N/A'}
        <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">
          /{maximo}
        </span>
      </p>
      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div
          className={`h-full bg-linear-to-r ${getCor()} transition-all duration-500`}
          style={{ width: `${porcentagem}%` }}
        />
      </div>
    </div>
  );
};

export default DashboardQuestionario;
