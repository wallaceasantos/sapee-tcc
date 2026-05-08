/**
 * Página de Gestão de Disciplinas - ADAPTADA PARA SAPEE DEWAS
 * 
 * Funcionalidades:
 * - Cadastro de disciplinas genéricas (todos os cursos) ou específicas (por curso)
 * - Filtro por curso
 * - Indicador visual de disciplina genérica vs específica
 * - Integração com a tabela de cursos existente
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, BookOpen, BookMarked, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface Disciplina {
  id: number;
  nome: string;
  ativa: boolean;
  curso_id?: number | null;
  criado_at?: string;
}

interface Curso {
  id: number;
  nome: string;
  modalidade: string;
}

export default function Disciplinas() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [ativa, setAtiva] = useState(true);
  const [cursoId, setCursoId] = useState<string>(''); // '' = genérica, número = curso específico
  
  // Estados de filtro
  const [filtroCurso, setFiltroCurso] = useState<string>('todos'); // 'todos', 'genericas', ou ID do curso
  const [filtroAtivas, setFiltroAtivas] = useState<'ativas' | 'inativas' | 'todas'>('ativas');

  useEffect(() => {
    loadDisciplinas();
    loadCursos();
  }, [token]);

  const loadDisciplinas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.disciplinas.list(token, false); // Busca todas (ativas e inativas)
      setDisciplinas(data);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: 'Não foi possível carregar as disciplinas' });
    } finally {
      setLoading(false);
    }
  };

  const loadCursos = async () => {
    if (!token) return;
    try {
      const data = await api.cursos.list(token);
      setCursos(data);
    } catch (error: any) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      addToast({ type: 'warning', title: 'Campo obrigatório', message: 'Informe o nome da disciplina' });
      return;
    }

    if (!token) return;

    try {
      const payload = {
        nome,
        ativa,
        curso_id: cursoId === '' ? null : Number(cursoId),
      };

      if (editId) {
        await api.disciplinas.update(token, editId, payload);
        addToast({ 
          type: 'success', 
          title: 'Atualizado', 
          message: `Disciplina "${nome}" atualizada com sucesso` 
        });
      } else {
        await api.disciplinas.create(token, payload);
        addToast({ 
          type: 'success', 
          title: 'Criado', 
          message: `Disciplina "${nome}" cadastrada com sucesso` 
        });
      }
      
      resetForm();
      loadDisciplinas();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message || 'Erro ao salvar disciplina' });
    }
  };

  const resetForm = () => {
    setNome('');
    setAtiva(true);
    setCursoId('');
    setShowForm(false);
    setEditId(null);
  };

  const handleEdit = (disc: Disciplina) => {
    setEditId(disc.id);
    setNome(disc.nome);
    setAtiva(disc.ativa);
    setCursoId(disc.curso_id ? String(disc.curso_id) : '');
    setShowForm(true);
  };

  const handleDelete = async (id: number, nomeDisciplina: string) => {
    if (!confirm(`Tem certeza que deseja excluir a disciplina "${nomeDisciplina}"?`)) return;
    if (!token) return;
    try {
      await api.disciplinas.delete(token, id);
      addToast({ type: 'success', title: 'Excluído', message: 'Disciplina removida com sucesso' });
      loadDisciplinas();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message || 'Erro ao excluir disciplina' });
    }
  };

  const handleToggleStatus = async (disc: Disciplina) => {
    if (!token) return;
    try {
      await api.disciplinas.update(token, disc.id, { ativa: !disc.ativa });
      addToast({ 
        type: 'success', 
        title: 'Status alterado', 
        message: `Disciplina ${disc.ativa ? 'desativada' : 'ativada'} com sucesso` 
      });
      loadDisciplinas();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: 'Erro ao alterar status' });
    }
  };

  // Filtragem de disciplinas
  const disciplinasFiltradas = disciplinas.filter(disc => {
    // Filtro por curso
    if (filtroCurso === 'genericas') {
      if (disc.curso_id !== null) return false;
    } else if (filtroCurso !== 'todos') {
      if (String(disc.curso_id) !== filtroCurso) return false;
    }
    
    // Filtro por status
    if (filtroAtivas === 'ativas') {
      return disc.ativa;
    } else if (filtroAtivas === 'inativas') {
      return !disc.ativa;
    }
    
    return true;
  });

  // Contadores para estatísticas
  const totalDisciplinas = disciplinas.length;
  const totalGenericas = disciplinas.filter(d => d.curso_id === null).length;
  const totalAtivas = disciplinas.filter(d => d.ativa).length;

  const getCursoNome = (cursoId: number | null | undefined): string => {
    if (!cursoId) return 'Genérica (Todos os Cursos)';
    const curso = cursos.find(c => c.id === cursoId);
    return curso ? curso.nome : 'Curso não encontrado';
  };

  const getCursoModalidade = (cursoId: number | null | undefined): string => {
    if (!cursoId) return 'Geral';
    const curso = cursos.find(c => c.id === cursoId);
    return curso ? curso.modalidade : '';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
            Gestão de Disciplinas
          </h2>
          <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 mt-1">
            Cadastre e gerencie as disciplinas do sistema. Disciplinas podem ser genéricas ou vinculadas a um curso.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setNome(''); setAtiva(true); setCursoId(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Nova Disciplina
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalDisciplinas}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Total de Disciplinas</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-bold text-emerald-600">{totalGenericas}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Disciplinas Genéricas</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-bold text-blue-600">{totalAtivas}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Disciplinas Ativas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Curso
            </label>
            <select
              value={filtroCurso}
              onChange={(e) => setFiltroCurso(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="todos">Todos os Cursos</option>
              <option value="genericas">Apenas Genéricas</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>
                  {curso.nome} ({curso.modalidade})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={filtroAtivas}
              onChange={(e) => setFiltroAtivas(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="ativas">Ativas</option>
              <option value="inativas">Inativas</option>
              <option value="todas">Todas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6 shadow-sm"
          >
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-4">
              {editId ? 'Editar Disciplina' : 'Cadastrar Nova Disciplina'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Nome da Disciplina *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Matemática, Física, Programação Web..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Vínculo com Curso
                  </label>
                  <select
                    value={cursoId}
                    onChange={(e) => setCursoId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Genérica (Todos os Cursos)</option>
                    {cursos.map(curso => (
                      <option key={curso.id} value={curso.id}>
                        {curso.nome} ({curso.modalidade})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                    {cursoId === '' 
                      ? 'Esta disciplina estará disponível para todos os cursos' 
                      : 'Esta disciplina será vinculada apenas a este curso'}
                  </p>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none bg-gray-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 w-full">
                    <input
                      type="checkbox"
                      checked={ativa}
                      onChange={(e) => setAtiva(e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Disciplina ativa para seleção</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-5 h-5" /> 
                  {editId ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all"
                >
                  <X className="w-5 h-5" /> Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Disciplinas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400">Carregando disciplinas...</p>
          </div>
        ) : disciplinasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-300 font-medium">Nenhuma disciplina encontrada</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              {totalDisciplinas === 0 
                ? 'Clique em "Nova Disciplina" para começar.' 
                : 'Tente ajustar os filtros para ver mais resultados.'}
            </p>
          </div>
        ) : (
          <>
            {/* Info do filtro */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
              Mostrando {disciplinasFiltradas.length} de {totalDisciplinas} disciplinas
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {disciplinasFiltradas.map((disc) => (
                <div 
                  key={disc.id} 
                  className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0", 
                      disc.ativa 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                        : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
                    )}>
                      {disc.curso_id ? <BookMarked className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate">
                          {disc.nome}
                        </p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-bold",
                          disc.curso_id 
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                        )}>
                          {disc.curso_id ? 'Específica' : 'Genérica'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {getCursoNome(disc.curso_id)}
                        </p>
                        {disc.curso_id && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">
                            • {getCursoModalidade(disc.curso_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-14 sm:ml-0 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(disc)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        disc.ativa
                          ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/30"
                          : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                      )}
                      title={disc.ativa ? 'Desativar' : 'Ativar'}
                    >
                      {disc.ativa ? 'Ativa' : 'Inativa'}
                    </button>
                    <button
                      onClick={() => handleEdit(disc)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(disc.id, disc.nome)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
