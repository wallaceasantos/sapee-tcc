/**
 * Página de Gestão de Tokens - Questionário Psicossocial
 * SAPEE DEWAS - Coordenador gera tokens para alunos
 */

import React, { useState, useEffect } from 'react';
import * as questionarioApi from '../services/questionarioApi';
import { useToast } from '../components/ui/Toast';

interface Token {
  id: number;
  token: string;
  aluno_matricula: string;
  aluno_nome: string;
  valido_ate: string;
  usado: boolean;
  data_uso: string | null;
  ativo: boolean;
  criado_at: string;
}

interface Aluno {
  matricula: string;
  nome: string;
  curso: string | null;
  email: string | null;
}

export const GestaoTokens: React.FC = () => {
  const { addToast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [alunosSemQuestionario, setAlunosSem] = useState<Aluno[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>('');
  const [horasValidade, setHorasValidade] = useState<number>(24);
  const [gerando, setGerando] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<{token: string, link: string, aluno: string} | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'usados' | 'pendentes' | 'expirados'>('todos');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Carregar tokens
      const tokensResponse = await fetch(`${API_URL}/tokens/questionario/listar`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sapee_token')}`
        }
      });

      if (tokensResponse.ok) {
        const data = await tokensResponse.json();
        setTokens(data.tokens || []);
      }

      // Carregar alunos sem questionário
      const alunosResponse = await fetch(`${API_URL}/questionario/alunos/sem-responder`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sapee_token')}`
        }
      });

      if (alunosResponse.ok) {
        const data = await alunosResponse.json();
        setAlunosSem(data.alunos || []);
      }
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: 'Não foi possível carregar dados de tokens',
      });
    } finally {
      setCarregando(false);
    }
  };

  const gerarToken = async () => {
    if (!alunoSelecionado) {
      alert('Selecione um aluno');
      return;
    }

    try {
      setGerando(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/tokens/questionario/gerar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sapee_token')}`
        },
        body: JSON.stringify({
          aluno_matricula: alunoSelecionado,
          horas_validade: horasValidade
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao gerar token');
      }

      const data = await response.json();
      
      setTokenGerado({
        token: data.token,
        link: data.link_acesso,
        aluno: data.aluno_nome
      });

      // Recarregar lista
      await carregarDados();
      
    } catch (erro: any) {
      alert(erro.message || 'Erro ao gerar token');
    } finally {
      setGerando(false);
    }
  };

  const copiarLink = () => {
    if (tokenGerado) {
      navigator.clipboard.writeText(tokenGerado.link);
      alert('Link copiado para a área de transferência!');
    }
  };

  const tokensFiltrados = tokens.filter(token => {
    if (filtro === 'usados') return token.usado;
    if (filtro === 'pendentes') return !token.usado && new Date(token.valido_ate) > new Date();
    if (filtro === 'expirados') return new Date(token.valido_ate) < new Date();
    return true;
  });

  const estatisticas = {
    total: tokens.length,
    usados: tokens.filter(t => t.usado).length,
    pendentes: tokens.filter(t => !t.usado && new Date(t.valido_ate) > new Date()).length,
    expirados: tokens.filter(t => new Date(t.valido_ate) < new Date()).length
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            Gestão de Tokens - Questionário
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gere tokens de acesso para alunos responderem o questionário sem login
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total de Tokens</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{estatisticas.total}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl shadow-lg p-6">
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">Tokens Usados</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-400">{estatisticas.usados}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-lg p-6">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Tokens Pendentes</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{estatisticas.pendentes}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-lg p-6">
            <p className="text-sm text-red-600 dark:text-red-400 mb-1">Tokens Expirados</p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-400">{estatisticas.expirados}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Geração */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
                Gerar Novo Token
              </h2>

              {/* Selecionar Aluno */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Aluno *
                </label>
                <select
                  value={alunoSelecionado}
                  onChange={(e) => setAlunoSelecionado(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um aluno...</option>
                  {alunosSemQuestionario.map(aluno => (
                    <option key={aluno.matricula} value={aluno.matricula}>
                      {aluno.nome} ({aluno.matricula})
                    </option>
                  ))}
                </select>
                {alunosSemQuestionario.length === 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    ✅ Todos os alunos já responderam!
                  </p>
                )}
              </div>

              {/* Horas de Validade */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Validade (horas) *
                </label>
                <select
                  value={horasValidade}
                  onChange={(e) => setHorasValidade(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 hora</option>
                  <option value={6}>6 horas</option>
                  <option value={12}>12 horas</option>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                  <option value={72}>72 horas</option>
                </select>
              </div>

              {/* Botão Gerar */}
              <button
                onClick={gerarToken}
                disabled={!alunoSelecionado || gerando}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  !alunoSelecionado || gerando
                    ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
                    : 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                }`}
              >
                {gerando ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Gerando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Gerar Token
                  </span>
                )}
              </button>

              {/* Token Gerado */}
              {tokenGerado && (
                <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold text-green-700 dark:text-green-400">Token Gerado!</span>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Aluno: <strong>{tokenGerado.aluno}</strong>
                  </p>
                  
                  <div className="bg-white dark:bg-slate-700 rounded p-3 mb-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Link de Acesso:</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 break-all font-mono">
                      {tokenGerado.link}
                    </p>
                  </div>
                  
                  <button
                    onClick={copiarLink}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all text-sm"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar Link
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setTokenGerado(null)}
                    className="w-full mt-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista de Tokens */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Tokens Gerados
                </h2>
                
                {/* Filtros */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltro('todos')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      filtro === 'todos'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltro('pendentes')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      filtro === 'pendentes'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Pendentes
                  </button>
                  <button
                    onClick={() => setFiltro('usados')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      filtro === 'usados'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Usados
                  </button>
                  <button
                    onClick={() => setFiltro('expirados')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      filtro === 'expirados'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Expirados
                  </button>
                </div>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Aluno
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Token
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Validade
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Uso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokensFiltrados.length > 0 ? (
                      tokensFiltrados.map(token => (
                        <tr
                          key={token.id}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">
                                {token.aluno_nome}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {token.aluno_matricula}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                              {token.token.slice(0, 8)}...{token.token.slice(-4)}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm text-slate-800 dark:text-white">
                                {new Date(token.valido_ate).toLocaleDateString('pt-BR')}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(token.valido_ate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {token.usado ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Usado
                              </span>
                            ) : new Date(token.valido_ate) < new Date() ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Expirado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Válido
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                            {token.data_uso ? (
                              <span>
                                {new Date(token.data_uso).toLocaleDateString('pt-BR')}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          Nenhum token encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestaoTokens;
