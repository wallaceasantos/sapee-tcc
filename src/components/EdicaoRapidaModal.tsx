/**
 * Modal de Edição Rápida de Aluno
 * Permite editar dados essenciais sem sair da lista
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, GraduationCap, Mail, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../utils';
import { useToast } from './ui/Toast';
import api from '../services/api';

interface Aluno {
  matricula: string;
  nome: string;
  email?: string;
  telefone?: string;
  curso?: { id: number; nome: string };
  curso_id?: number;
  periodo?: number;
  turno?: string;
  media_geral?: number;
  frequencia?: number;
}

interface EdicaoRapidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: Aluno | null;
  onSuccess: () => void;
  token: string;
}

const TURNOS = [
  { value: 'MATUTINO', label: 'Matutino' },
  { value: 'VESPERTINO', label: 'Vespertino' },
  { value: 'NOTURNO', label: 'Noturno' },
];

export function EdicaoRapidaModal({ isOpen, onClose, aluno, onSuccess, token }: EdicaoRapidaModalProps) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [cursos, setCursos] = useState<{ id: number; nome: string }[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    curso_id: '',
    periodo: '',
    turno: '',
    media_geral: '',
    frequencia: '',
  });

  // Carregar cursos ao abrir
  useEffect(() => {
    if (isOpen) {
      carregarCursos();
    }
  }, [isOpen]);

  // Preencher formulário quando aluno muda
  useEffect(() => {
    if (aluno) {
      setFormData({
        nome: aluno.nome || '',
        email: aluno.email || '',
        telefone: aluno.telefone || '',
        curso_id: aluno.curso_id?.toString() || aluno.curso?.id?.toString() || '',
        periodo: aluno.periodo?.toString() || '',
        turno: aluno.turno || '',
        media_geral: aluno.media_geral?.toString() || '',
        frequencia: aluno.frequencia?.toString() || '',
      });
    }
  }, [aluno]);

  const carregarCursos = async () => {
    try {
      // Buscar alunos para extrair cursos únicos
      const alunos = await api.alunos.list(token, 0, 1000);
      const cursosUnicos = new Map();
      alunos.forEach((a: any) => {
        if (a.curso) {
          cursosUnicos.set(a.curso.id, a.curso);
        }
      });
      setCursos(Array.from(cursosUnicos.values()));
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aluno) return;

    setIsLoading(true);
    try {
      const dadosAtualizados = {
        nome: formData.nome,
        email: formData.email || undefined,
        telefone: formData.telefone || undefined,
        curso_id: formData.curso_id ? parseInt(formData.curso_id) : undefined,
        periodo: formData.periodo ? parseInt(formData.periodo) : undefined,
        turno: formData.turno || undefined,
        media_geral: formData.media_geral ? parseFloat(formData.media_geral) : undefined,
        frequencia: formData.frequencia ? parseFloat(formData.frequencia) : undefined,
      };

      await api.alunos.update(token, aluno.matricula, dadosAtualizados);

      addToast({
        type: 'success',
        title: 'Aluno atualizado',
        message: 'Os dados foram salvos com sucesso.',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar aluno:', error);
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: error.message || 'Não foi possível atualizar os dados.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edição Rápida</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {aluno?.nome} ({aluno?.matricula})
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informações Básicas
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      <Mail className="w-3.5 h-3.5 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      <Phone className="w-3.5 h-3.5 inline mr-1" />
                      Telefone
                    </label>
                    <input
                      type="tel"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Dados Acadêmicos */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Dados Acadêmicos
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Curso
                    </label>
                    <select
                      name="curso_id"
                      value={formData.curso_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                      <option value="">Selecione...</option>
                      {cursos.map(curso => (
                        <option key={curso.id} value={curso.id}>{curso.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Período
                    </label>
                    <input
                      type="number"
                      name="periodo"
                      value={formData.periodo}
                      onChange={handleChange}
                      min={1}
                      max={10}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Turno
                  </label>
                  <div className="flex gap-2">
                    {TURNOS.map(turno => (
                      <button
                        key={turno.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, turno: turno.value }))}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                          formData.turno === turno.value
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                        )}
                      >
                        {turno.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Desempenho */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Desempenho
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Média Geral
                    </label>
                    <input
                      type="number"
                      name="media_geral"
                      value={formData.media_geral}
                      onChange={handleChange}
                      min={0}
                      max={10}
                      step={0.1}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Frequência (%)
                    </label>
                    <input
                      type="number"
                      name="frequencia"
                      value={formData.frequencia}
                      onChange={handleChange}
                      min={0}
                      max={100}
                      step={0.1}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-4 pb-2 border-t border-gray-200 dark:border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                    isLoading
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-none"
                  )}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>

              {/* Link para edição completa */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (aluno) {
                      window.location.href = `/cadastro?edit=${aluno.matricula}`;
                    }
                  }}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Abrir edição completa →
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default EdicaoRapidaModal;
