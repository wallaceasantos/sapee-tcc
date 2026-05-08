/**
 * Página de Notas por Disciplina - SAPEE DEWAS
 * 
 * Funcionalidades:
 * - Buscar aluno por matrícula/nome
 * - Lançar notas por disciplina, período e bimestre
 * - Visualizar histórico de notas
 * - Identificar padrões de reprovação
 * - Ver resumo acadêmico
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Edit, Trash2, Save, X, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface Nota {
  id: number;
  aluno_matricula: string;
  disciplina: string;
  disciplina_id?: number | null;
  periodo_letivo: string;
  bimestre: number;
  nota: number;
  faltas_disciplina: number;
  situacao: 'APROVADO' | 'REPROVADO' | 'CURSANDO';
  criado_at?: string;
}

interface Aluno {
  matricula: string;
  nome: string;
  curso?: { nome: string };
}

interface Disciplina {
  id: number;
  nome: string;
  ativa: boolean;
}

type SituacaoType = 'APROVADO' | 'REPROVADO' | 'CURSANDO';

export default function NotasDisciplina() {
  const { token } = useAuth();
  const { addToast } = useToast();

  // Estados de busca
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunosFiltrados, setAlunosFiltrados] = useState<Aluno[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [loadingBusca, setLoadingBusca] = useState(false);

  // Estados de notas
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [showFormNota, setShowFormNota] = useState(false);
  const [editNotaId, setEditNotaId] = useState<number | null>(null);

  // Estados do formulário
  const [disciplina, setDisciplina] = useState('');
  const [disciplinaId, setDisciplinaId] = useState<number | ''>('');
  const [periodoLetivo, setPeriodoLetivo] = useState('');
  const [bimestre, setBimestre] = useState(1);
  const [notaValor, setNotaValor] = useState<number | ''>('');
  const [faltasDisciplina, setFaltasDisciplina] = useState(0);
  const [situacao, setSituacao] = useState<SituacaoType>('CURSANDO');

  // Estados de disciplinas
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);

  // Filtro
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');

  useEffect(() => {
    loadDisciplinas();
  }, []);

  const loadDisciplinas = async () => {
    if (!token) return;
    setLoadingDisciplinas(true);
    try {
      const data = await api.disciplinas.list(token, true);
      setDisciplinas(data);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  const handleBuscaAluno = async () => {
    if (!buscaAluno.trim() || buscaAluno.length < 2) return;
    if (!token) return;

    setLoadingBusca(true);
    try {
      const data = await api.alunos.buscar(token, buscaAluno, 20);
      setAlunosFiltrados(data);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message || 'Erro ao buscar aluno' });
    } finally {
      setLoadingBusca(false);
    }
  };

  const handleSelectAluno = async (aluno: Aluno) => {
    setAlunoSelecionado(aluno);
    setBuscaAluno(`${aluno.nome} (${aluno.matricula})`);
    setAlunosFiltrados([]);
    await loadNotas(aluno.matricula);
  };

  const loadNotas = async (matricula: string) => {
    if (!token) return;
    setLoadingNotas(true);
    try {
      const periodo = filtroPeriodo === 'todos' ? undefined : filtroPeriodo;
      const data = await api.notas.list(token, matricula, periodo);
      setNotas(data);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message || 'Erro ao carregar notas' });
    } finally {
      setLoadingNotas(false);
    }
  };

  const handleSubmitNota = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!alunoSelecionado || !disciplina || !periodoLetivo || notaValor === '') {
      addToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Preencha todos os campos obrigatórios' });
      return;
    }

    if (!token) return;

    try {
      const payload = {
        disciplina,
        disciplina_id: disciplinaId === '' ? null : disciplinaId,
        periodo_letivo: periodoLetivo,
        bimestre,
        nota: Number(notaValor),
        faltas_disciplina: faltasDisciplina,
        situacao,
      };

      if (editNotaId) {
        await api.notas.update(token, alunoSelecionado.matricula, editNotaId, payload);
        addToast({ type: 'success', title: 'Atualizado', message: 'Nota atualizada com sucesso' });
      } else {
        await api.notas.create(token, alunoSelecionado.matricula, payload);
        addToast({ type: 'success', title: 'Criado', message: 'Nota cadastrada com sucesso' });
      }

      resetForm();
      loadNotas(alunoSelecionado.matricula);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message || 'Erro ao salvar nota' });
    }
  };

  const resetForm = () => {
    setDisciplina('');
    setDisciplinaId('');
    setPeriodoLetivo('');
    setBimestre(1);
    setNotaValor('');
    setFaltasDisciplina(0);
    setSituacao('CURSANDO');
    setShowFormNota(false);
    setEditNotaId(null);
  };

  const handleEditNota = (nota: Nota) => {
    setEditNotaId(nota.id);
    setDisciplina(nota.disciplina);
    setDisciplinaId(nota.disciplina_id || '');
    setPeriodoLetivo(nota.periodo_letivo);
    setBimestre(nota.bimestre);
    setNotaValor(nota.nota);
    setFaltasDisciplina(nota.faltas_disciplina);
    setSituacao(nota.situacao);
    setShowFormNota(true);
  };

  const handleDeleteNota = async (notaId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
    if (!token || !alunoSelecionado) return;
    try {
      await api.notas.delete(token, alunoSelecionado!.matricula, notaId);
      addToast({ type: 'success', title: 'Excluído', message: 'Nota excluída com sucesso' });
      loadNotas(alunoSelecionado!.matricula);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  // Cálculos estatísticos
  const mediaGeral = notas.length > 0
    ? (notas.reduce((sum, n) => sum + n.nota, 0) / notas.length).toFixed(1)
    : '-';

  const totalReprovacoes = notas.filter(n => n.situacao === 'REPROVADO').length;
  const totalAprovacoes = notas.filter(n => n.situacao === 'APROVADO').length;

  const disciplinasReprovadas = notas
    .filter(n => n.situacao === 'REPROVADO')
    .reduce<{[key: string]: number}>((acc, n) => {
      acc[n.disciplina] = (acc[n.disciplina] || 0) + 1;
      return acc;
    }, {});

  // Períodos únicos para filtro
  const periodos = Array.from(new Set(notas.map(n => n.periodo_letivo))).sort();

  const getSituacaoColor = (situacao: SituacaoType) => {
    switch (situacao) {
      case 'APROVADO': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'REPROVADO': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'CURSANDO': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getNotaColor = (nota: number) => {
    if (nota >= 7) return 'text-green-600 dark:text-green-400';
    if (nota >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
          Notas por Disciplina
        </h2>
        <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 mt-1">
          Lance e visualize notas do aluno por disciplina e período.
        </p>
      </div>

      {/* Busca de Aluno */}
      {!alunoSelecionado && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6">
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">Buscar Aluno</h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={buscaAluno}
                onChange={(e) => {
                  setBuscaAluno(e.target.value);
                  if (e.target.value.length < 2) setAlunosFiltrados([]);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscaAluno()}
                placeholder="Buscar por nome ou matrícula..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleBuscaAluno}
              disabled={loadingBusca || buscaAluno.length < 2}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingBusca ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          <AnimatePresence>
            {alunosFiltrados.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto"
              >
                {alunosFiltrados.map(aluno => (
                  <button
                    key={aluno.matricula}
                    onClick={() => handleSelectAluno(aluno)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-700 last:border-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{aluno.nome}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">
                      Mat: {aluno.matricula} {aluno.curso?.nome && `• ${aluno.curso.nome}`}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Aluno Selecionado */}
      {alunoSelecionado && (
        <>
          {/* Info do Aluno + Ações */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{alunoSelecionado.nome}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Mat: {alunoSelecionado.matricula} {alunoSelecionado.curso?.nome && `• ${alunoSelecionado.curso.nome}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFormNota(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  <Plus className="w-4 h-4" /> Nova Nota
                </button>
                <button
                  onClick={() => {
                    setAlunoSelecionado(null);
                    setBuscaAluno('');
                    setNotas([]);
                  }}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{mediaGeral}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Média Geral</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="text-2xl font-bold text-green-600">{totalAprovacoes}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Aprovações</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="text-2xl font-bold text-red-600">{totalReprovacoes}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Reprovações</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(disciplinasReprovadas).length}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Disc. Reprovadas</div>
            </div>
          </div>

          {/* Alerta de reprovações */}
          {Object.keys(disciplinasReprovadas).length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800 dark:text-amber-300">Atenção: Reprovações Detectadas</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {Object.entries(disciplinasReprovadas).map(([disc, qtd]) => (
                      <span key={disc} className="block">
                        <strong>{disc}</strong>: {qtd} reprovaç{qtd > 1 ? 'ões' : 'ão'}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filtro por período */}
          {periodos.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Filtrar por Período
              </label>
              <select
                value={filtroPeriodo}
                onChange={(e) => {
                  setFiltroPeriodo(e.target.value);
                  loadNotas(alunoSelecionado.matricula);
                }}
                className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white"
              >
                <option value="todos">Todos os Períodos</option>
                {periodos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Formulário de Nota */}
          <AnimatePresence>
            {showFormNota && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6"
              >
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">
                  {editNotaId ? 'Editar Nota' : 'Cadastrar Nova Nota'}
                </h3>
                <form onSubmit={handleSubmitNota} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Disciplina (texto) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Disciplina *
                      </label>
                      <input
                        type="text"
                        value={disciplina}
                        onChange={(e) => setDisciplina(e.target.value)}
                        placeholder="Ex: Matemática"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Disciplina (select opcional) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Disciplina (Sistema)
                      </label>
                      <select
                        value={disciplinaId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDisciplinaId(val === '' ? '' : Number(val));
                          if (val) {
                            const disc = disciplinas.find(d => d.id === Number(val));
                            if (disc && !disciplina) setDisciplina(disc.nome);
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Selecionar (opcional)</option>
                        {disciplinas.map(d => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </select>
                    </div>

                    {/* Período Letivo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Período Letivo *
                      </label>
                      <input
                        type="text"
                        value={periodoLetivo}
                        onChange={(e) => setPeriodoLetivo(e.target.value)}
                        placeholder="Ex: 2024-1, 2024-2"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Bimestre */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Bimestre *
                      </label>
                      <select
                        value={bimestre}
                        onChange={(e) => setBimestre(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>1º Bimestre</option>
                        <option value={2}>2º Bimestre</option>
                        <option value={3}>3º Bimestre</option>
                        <option value={4}>4º Bimestre</option>
                      </select>
                    </div>

                    {/* Nota */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Nota (0-10) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={notaValor}
                        onChange={(e) => setNotaValor(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ex: 7.5"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Faltas na disciplina */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Faltas na Disciplina
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={faltasDisciplina}
                        onChange={(e) => setFaltasDisciplina(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Situação */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Situação
                      </label>
                      <select
                        value={situacao}
                        onChange={(e) => setSituacao(e.target.value as SituacaoType)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="CURSANDO">Cursando</option>
                        <option value="APROVADO">Aprovado</option>
                        <option value="REPROVADO">Reprovado</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                      <Save className="w-5 h-5" /> {editNotaId ? 'Atualizar' : 'Cadastrar'}
                    </button>
                    <button type="button" onClick={resetForm} className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center gap-2">
                      <X className="w-5 h-5" /> Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabela de Notas */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingNotas ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                Carregando notas...
              </div>
            ) : notas.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-slate-300 font-medium">Nenhuma nota cadastrada</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Clique em "Nova Nota" para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Disciplina</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Período</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Bim.</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Nota</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Faltas</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Situação</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {notas.map((nota) => (
                      <tr key={nota.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white text-sm">{nota.disciplina}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-400">{nota.periodo_letivo}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-400">{nota.bimestre}º</td>
                        <td className={cn("px-4 py-3 text-center text-lg font-bold", getNotaColor(nota.nota))}>
                          {nota.nota.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-400">{nota.faltas_disciplina}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("px-2 py-1 rounded-full text-xs font-bold", getSituacaoColor(nota.situacao))}>
                            {nota.situacao}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditNota(nota)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteNota(nota.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
