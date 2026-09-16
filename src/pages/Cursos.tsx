/**
 * Página de Gestão de Cursos - SAPEE DEWAS
 *
 * Funcionalidades:
 * - Listar todos os cursos
 * - Criar novo curso
 * - Editar curso existente
 * - Excluir curso (apenas se não houver alunos vinculados)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, GraduationCap, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface Curso {
  id: number;
  nome: string;
  modalidade: string;
  criado_at?: string;
}

const MODALIDADES = [
  'Integrado',
  'Subsequente',
  'Superior',
  'Pós-Graduação',
];

export default function Cursos() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [modalidade, setModalidade] = useState('Integrado');

  const loadCursos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.cursos.list(token);
      setCursos(data);
    } catch {
      addToast({ type: 'error', title: 'Erro', message: 'Não foi possível carregar os cursos' });
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    loadCursos();
  }, [loadCursos]);

  const resetForm = () => {
    setNome('');
    setModalidade('Integrado');
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (curso: Curso) => {
    setNome(curso.nome);
    setModalidade(curso.modalidade || 'Integrado');
    setEditId(curso.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      addToast({ type: 'warning', title: 'Campo obrigatório', message: 'Informe o nome do curso' });
      return;
    }

    if (!token) return;

    try {
      if (editId) {
        await api.cursos.update(token, editId, { nome, modalidade });
        addToast({ type: 'success', title: 'Atualizado', message: `Curso "${nome}" atualizado com sucesso!` });
      } else {
        await api.cursos.create(token, { nome, modalidade });
        addToast({ type: 'success', title: 'Criado', message: `Curso "${nome}" criado com sucesso!` });
      }
      resetForm();
      loadCursos();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao salvar curso. Verifique os dados.';
      addToast({ type: 'error', title: 'Erro', message: msg });
    }
  };

  const handleDelete = async (curso: Curso) => {
    if (!token) return;
    if (!window.confirm(`Tem certeza que deseja excluir o curso "${curso.nome}"?`)) return;

    try {
      await api.cursos.delete(token, curso.id);
      addToast({ type: 'success', title: 'Removido', message: `Curso "${curso.nome}" removido com sucesso!` });
      loadCursos();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao excluir curso.';
      addToast({ type: 'error', title: 'Erro', message: msg });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Gestão de Cursos</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {cursos.length} curso{cursos.length !== 1 ? 's' : ''} cadastrado{cursos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Novo Curso
        </button>
      </div>

      {/* Formulário de Criação/Edição */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {editId ? 'Editar Curso' : 'Novo Curso'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Nome do Curso *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Informática, Agropecuária..."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Modalidade
                  </label>
                  <select
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  >
                    {MODALIDADES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Cursos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : cursos.length === 0 ? (
        <div className="text-center py-20">
          <GraduationCap className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-gray-500 dark:text-slate-400">Nenhum curso cadastrado</h3>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            Clique em "Novo Curso" para cadastrar o primeiro.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {cursos.map((curso) => (
              <motion.div
                key={curso.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl">
                      <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{curso.nome}</h3>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                        {curso.modalidade}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(curso)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      title="Editar curso"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(curso)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
