/**
 * Página de Gestão de Tokens - Questionário Psicossocial
 * SAPEE DEWAS - Coordenador gera tokens para alunos
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

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
  telefone?: string | null;
  email_responsavel_1?: string | null;
  telefone_responsavel_1?: string | null;
}

export const GestaoTokens: React.FC = () => {
  const { addToast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [alunosSemQuestionario, setAlunosSem] = useState<Aluno[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>('');
  const [selecionadosEmMassa, setSelecionadosEmMassa] = useState<Set<string>>(new Set());
  const [horasValidade, setHorasValidade] = useState<number>(24);
  const [gerando, setGerando] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<{token: string, link: string, aluno: string, matricula: string} | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviandoEmMassa, setEnviandoEmMassa] = useState(false);
  const [progressoEnvio, setProgressoEnvio] = useState<{atual: number, total: number} | null>(null);
  const [resultadoEnvio, setResultadoEnvio] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'usados' | 'pendentes' | 'expirados'>('todos');
  const [buscaAluno, setBuscaAluno] = useState('');
  const [mostrarListaCompleta, setMostrarListaCompleta] = useState(false);
  const [limpando, setLimpando] = useState(false);

  const getToken = () => localStorage.getItem('sapee_token') || '';

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const token = getToken();

      const [tokensData, alunosData] = await Promise.all([
        api.tokens.listar(token),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/questionario/alunos/sem-responder`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);

      setTokens(tokensData.tokens || []);
      setAlunosSem(alunosData.alunos || []);
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
  }, [addToast]);

  const alunosFiltrados = useMemo(() => {
    if (!buscaAluno.trim()) return alunosSemQuestionario;
    const termo = buscaAluno.toLowerCase();
    return alunosSemQuestionario.filter(a =>
      a.nome.toLowerCase().includes(termo) ||
      a.matricula.toLowerCase().includes(termo) ||
      (a.curso && a.curso.toLowerCase().includes(termo))
    );
  }, [alunosSemQuestionario, buscaAluno]);

  const alunosVisiveis = useMemo(() => {
    return mostrarListaCompleta ? alunosFiltrados : alunosFiltrados.slice(0, 10);
  }, [alunosFiltrados, mostrarListaCompleta]);

  const toggleSelecionar = (matricula: string) => {
    const novo = new Set(selecionadosEmMassa);
    if (novo.has(matricula)) {
      novo.delete(matricula);
    } else {
      novo.add(matricula);
    }
    setSelecionadosEmMassa(novo);
  };

  const selecionarTodosVisiveis = () => {
    const novos = new Set(selecionadosEmMassa);
    alunosVisiveis.forEach(a => novos.add(a.matricula));
    setSelecionadosEmMassa(novos);
  };

  const limparSelecao = () => {
    setSelecionadosEmMassa(new Set());
  };

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

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
        aluno: data.aluno_nome,
        matricula: data.aluno_matricula
      });

      // Recarregar lista
      await carregarDados();
      
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : 'Erro ao gerar token');
    } finally {
      setGerando(false);
    }
  };

  const copiarLink = () => {
    if (tokenGerado) {
      navigator.clipboard.writeText(tokenGerado.link);
      addToast({
        type: 'success',
        title: 'Link copiado',
        message: 'Link copiado para a área de transferência!',
      });
    }
  };

  const enviarToken = async () => {
    if (!tokenGerado) return;

    try {
      setEnviando(true);
      const token = getToken();
      const data = await api.tokens.enviar(token, {
        token: tokenGerado.token,
        aluno_matricula: tokenGerado.matricula,
        canal: 'EMAIL'
      });

      addToast({
        type: 'success',
        title: 'Token enviado',
        message: data.mensagem,
      });
    } catch (erro) {
      addToast({
        type: 'error',
        title: 'Erro no envio',
        message: erro instanceof Error ? erro.message : 'Erro ao enviar token',
      });
    } finally {
      setEnviando(false);
    }
  };

  const enviarTokensEmMassa = async () => {
    if (selecionadosEmMassa.size === 0) {
      addToast({
        type: 'warning',
        title: 'Nenhum aluno selecionado',
        message: 'Selecione pelo menos um aluno para enviar em massa.',
      });
      return;
    }

    if (!window.confirm(`Enviar tokens por Email para ${selecionadosEmMassa.size} aluno(s)?`)) {
      return;
    }

    try {
      setEnviandoEmMassa(true);
      setProgressoEnvio({ atual: 0, total: selecionadosEmMassa.size });
      setResultadoEnvio(null);

      const token = getToken();
      const matriculas = Array.from(selecionadosEmMassa);

      const data = await api.tokens.enviarEmMassa(token, {
        alunos_matriculas: matriculas,
        canal: 'EMAIL',
        horas_validade: horasValidade
      });

      setResultadoEnvio(data);
      setSelecionadosEmMassa(new Set());
      await carregarDados();

      addToast({
        type: data.falhas > 0 ? 'warning' : 'success',
        title: 'Envio em massa concluído',
        message: `${data.sucessos} enviados com sucesso, ${data.falhas} falhas de ${data.total} alunos.`,
      });
    } catch (erro) {
      addToast({
        type: 'error',
        title: 'Erro no envio em massa',
        message: erro instanceof Error ? erro.message : 'Erro ao enviar tokens em massa',
      });
    } finally {
      setEnviandoEmMassa(false);
      setProgressoEnvio(null);
    }
  };

  const limparTodosTokens = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Isso removerá TODOS os tokens de questionário do sistema.\n\nUse apenas em desenvolvimento! Deseja continuar?')) {
      return;
    }

    if (!window.confirm('Tem certeza? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLimpando(true);
      const token = getToken();
      const data = await api.tokens.limpar(token, 0);

      addToast({
        type: 'success',
        title: 'Tokens removidos',
        message: `${data.removidos} token(s) removido(s) com sucesso.`,
      });

      await carregarDados();
    } catch (erro) {
      addToast({
        type: 'error',
        title: 'Erro ao limpar',
        message: erro instanceof Error ? erro.message : 'Erro ao limpar tokens',
      });
    } finally {
      setLimpando(false);
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
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
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
                    disabled={enviando}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-semibold transition-all text-sm"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar Link
                    </span>
                  </button>

                  <button
                    onClick={enviarToken}
                    disabled={enviando}
                    className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-all text-sm"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Enviar por Email
                    </span>
                  </button>

                  {enviando && (
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
                      Enviando...
                    </p>
                  )}

                  <button
                    onClick={() => setTokenGerado(null)}
                    className="w-full mt-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Envio em Massa */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                  Envio em Massa
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Selecione múltiplos alunos e envie tokens de uma só vez.
                </p>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">
                      {selecionadosEmMassa.size} selecionado(s)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selecionarTodosVisiveis}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Selecionar visíveis
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={limparSelecao}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={enviarTokensEmMassa}
                  disabled={selecionadosEmMassa.size === 0 || enviandoEmMassa}
                  className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
                    selecionadosEmMassa.size === 0 || enviandoEmMassa
                      ? 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {enviandoEmMassa ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Enviar por Email ({selecionadosEmMassa.size})
                    </span>
                  )}
                </button>

                {resultadoEnvio && (
                  <div className={`rounded-lg p-3 text-sm ${resultadoEnvio.falhas > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
                    <p className="font-semibold mb-1">
                      {resultadoEnvio.sucessos} de {resultadoEnvio.total} enviados
                    </p>
                    {resultadoEnvio.falhas > 0 && (
                      <p className="text-yellow-700 dark:text-yellow-400">
                        {resultadoEnvio.falhas} falha(s). Verifique se os alunos possuem email cadastrado.
                      </p>
                    )}
                    <button
                      onClick={() => setResultadoEnvio(null)}
                      className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Limpar resultado
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Alunos e Tokens */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alunos sem Questionário */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    Alunos sem Questionário
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {alunosSemQuestionario.length} aluno(s) pendente(s) · {selecionadosEmMassa.size} selecionado(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selecionarTodosVisiveis}
                    disabled={alunosVisiveis.length === 0}
                    className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                  >
                    Selecionar visíveis
                  </button>
                  <button
                    onClick={limparSelecao}
                    disabled={selecionadosEmMassa.size === 0}
                    className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Busca */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Buscar por nome, matrícula ou curso..."
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tabela de Alunos */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 w-10">
                        <input
                          type="checkbox"
                          checked={alunosVisiveis.length > 0 && alunosVisiveis.every(a => selecionadosEmMassa.has(a.matricula))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selecionarTodosVisiveis();
                            } else {
                              const novo = new Set(selecionadosEmMassa);
                              alunosVisiveis.forEach(a => novo.delete(a.matricula));
                              setSelecionadosEmMassa(novo);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Aluno
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Curso
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Contato
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosVisiveis.length > 0 ? (
                      alunosVisiveis.map(aluno => (
                        <tr
                          key={aluno.matricula}
                          onClick={() => toggleSelecionar(aluno.matricula)}
                          className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${
                            selecionadosEmMassa.has(aluno.matricula) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selecionadosEmMassa.has(aluno.matricula)}
                              onChange={() => toggleSelecionar(aluno.matricula)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white text-sm">
                                {aluno.nome}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {aluno.matricula}
                              </p>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm text-slate-600 dark:text-slate-400">
                            {aluno.curso || '-'}
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex flex-col gap-0.5">
                              {aluno.email && <span>📧 {aluno.email}</span>}
                              {aluno.telefone && <span>📱 {aluno.telefone}</span>}
                              {!aluno.email && !aluno.telefone && <span className="text-red-500">Sem contato</span>}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          {buscaAluno ? 'Nenhum aluno encontrado' : 'Todos os alunos já responderam!'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {alunosFiltrados.length > 10 && (
                <button
                  onClick={() => setMostrarListaCompleta(!mostrarListaCompleta)}
                  className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {mostrarListaCompleta ? 'Mostrar menos' : `Mostrar todos (${alunosFiltrados.length})`}
                </button>
              )}
            </div>

            {/* Lista de Tokens */}
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

              {/* Botão Limpar (dev) */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={limparTodosTokens}
                  disabled={limpando || tokens.length === 0}
                  className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
                    limpando || tokens.length === 0
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                  }`}
                >
                  {limpando ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                      Removendo...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Limpar todos os tokens ({tokens.length})
                    </span>
                  )}
                </button>
                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-1">
                  🧹 Remove todos os tokens (apenas desenvolvimento)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestaoTokens;
