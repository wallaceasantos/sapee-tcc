/**
 * Cadastro de Alunos - COM API REAL
 * SAPEE DEWAS Frontend
 * 
 * Este arquivo implementa:
 * - CRUD completo com API real
 * - Preview de predição em tempo real
 * - Validações de formulário
 * - Integração com backend para criar/editar/excluir
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, GraduationCap, Mail, Phone, MapPin, Calendar,
  DollarSign, Briefcase, BookOpen, AlertCircle, CheckCircle,
  Save, X, ChevronLeft, Search, Filter, Edit, Trash2,
  TrendingUp, Percent, History, Home, Heart, Loader2, Users
} from 'lucide-react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { cn } from '../utils';
import { NivelRisco } from '../types';
import { RiskBadge, RiskProgressBar, EmptyState, ConfirmationModal } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useAlunos } from '../hooks/useAlunos';
import { useAlunoForm, AlunoFormData } from '../hooks/useAlunoForm';
import { useAuth } from '../services/AuthContext';

// Cursos do backend (serão carregados da API)
// Cursos reais do IFAM organizados por modalidade
const CURSOS = [
  // SUPERIOR (GRADUAÇÃO)
  { id: 1, nome: 'Engenharia Civil', modalidade: 'SUPERIOR' },
  { id: 2, nome: 'Engenharia Mecânica', modalidade: 'SUPERIOR' },
  { id: 3, nome: 'Ciências Biológicas (Licenciatura)', modalidade: 'SUPERIOR' },
  { id: 4, nome: 'Física (Licenciatura)', modalidade: 'SUPERIOR' },
  { id: 5, nome: 'Matemática (Licenciatura)', modalidade: 'SUPERIOR' },
  { id: 6, nome: 'Química (Licenciatura)', modalidade: 'SUPERIOR' },
  { id: 7, nome: 'Tecnologia em Alimentos', modalidade: 'SUPERIOR' },
  { id: 8, nome: 'Análise e Desenvolvimento de Sistemas', modalidade: 'SUPERIOR' },
  { id: 9, nome: 'Construção de Edifícios', modalidade: 'SUPERIOR' },
  { id: 10, nome: 'Processos Químicos', modalidade: 'SUPERIOR' },
  { id: 11, nome: 'Produção Publicitária', modalidade: 'SUPERIOR' },
  
  // TÉCNICO INTEGRADO
  { id: 12, nome: 'Técnico em Informática (Integrado)', modalidade: 'INTEGRADO' },
  { id: 13, nome: 'Técnico em Edificações (Integrado)', modalidade: 'INTEGRADO' },
  { id: 14, nome: 'Técnico em Administração (Integrado)', modalidade: 'INTEGRADO' },
  { id: 15, nome: 'Técnico em Agropecuária (Integrado)', modalidade: 'INTEGRADO' },
  
  // TÉCNICO SUBSEQUENTE
  { id: 16, nome: 'Técnico em Edificações (Subsequente)', modalidade: 'SUBSEQUENTE' },
  { id: 17, nome: 'Técnico em Meio Ambiente (Subsequente)', modalidade: 'SUBSEQUENTE' },
  
  // PÓS-GRADUAÇÃO
  { id: 18, nome: 'Especialização em Gestão em Segurança do Trabalho', modalidade: 'POS_GRADUACAO' },
  { id: 19, nome: 'Especialização em Gestão Ambiental', modalidade: 'POS_GRADUACAO' },
  { id: 20, nome: 'Especialização em Investigações Educacionais', modalidade: 'POS_GRADUACAO' },
  { id: 21, nome: 'Mestrado em Educação Profissional e Tecnológica (ProfEPT)', modalidade: 'POS_GRADUACAO' },
  { id: 22, nome: 'Mestrado em Ensino Tecnológico (PPGET)', modalidade: 'POS_GRADUACAO' },
  { id: 23, nome: 'Mestrado em Ensino de Física (MNPEF)', modalidade: 'POS_GRADUACAO' },
  { id: 24, nome: 'Mestrado em Química (PROFQUI)', modalidade: 'POS_GRADUACAO' },
  { id: 25, nome: 'Mestrado em Educação Inclusiva (PROFEI)', modalidade: 'POS_GRADUACAO' },
];

const CIDADES = [
  'Manaus', 'Itacoatiara', 'Manacapuru', 'Parintins',
  'Coari', 'Tefé', 'Tabatinga', 'São Gabriel da Cachoeira'
];

const TURNOS = [
  { value: 'MATUTINO', label: 'Matutino' },
  { value: 'VESPERTINO', label: 'Vespertino' },
  { value: 'NOTURNO', label: 'Noturno' },
];

const ZONAS = [
  { value: 'ZONA_NORTE', label: 'Zona Norte' },
  { value: 'ZONA_SUL', label: 'Zona Sul' },
  { value: 'ZONA_LESTE', label: 'Zona Leste' },
  { value: 'ZONA_OESTE', label: 'Zona Oeste' },
  { value: 'CENTRO', label: 'Centro' },
  { value: 'INTERIOR', label: 'Interior' },
];

const DIFICULDADES = [
  { value: 'FACIL', label: 'Fácil' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'DIFICIL', label: 'Difícil' },
  { value: 'MUITO_DIFICIL', label: 'Muito Difícil' },
];

export default function CadastroAlunos() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { can } = useAuth();
  const [searchParams] = useSearchParams();
  const params = useParams();
  
  // Detectar modo de edição via query params (legado) ou rota (novo)
  const editMatricula = searchParams.get('edit') || params.matricula;
  const isEditMode = !!editMatricula;

  // Hook de alunos com API real
  const { data: alunos, isLoading, refetch } = useAlunos({
    skip: 0,
    limit: 1000,
  });

  // Hook do formulário
  const {
    formData,
    isEditing,
    isSubmitting,
    predicaoPreview,
    handleInputChange,
    handleCurrencyChange,
    handleCheckboxChange,
    handleNumericFocus,
    getNumericValue,
    formatCurrency,
    parseCurrency,
    resetForm,
    setEditingData,
    handleSubmit,
    calcularRiscoPreview,
  } = useAlunoForm(() => {
    // Callback de sucesso
    refetch();
    setIsFormOpen(false);
  });

  // Estados locais
  const [isFormOpen, setIsFormOpen] = useState(isEditMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroRisco, setFiltroRisco] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<string | null>(null);

  // Efeito para carregar aluno quando em modo de edição via URL
  useEffect(() => {
    if (isEditMode && editMatricula && alunos.length > 0) {
      const aluno = alunos.find(a => a.matricula === editMatricula);
      if (aluno) {
        setEditingData(aluno);
        setIsFormOpen(true);
      }
    }
  }, [isEditMode, editMatricula, alunos, setEditingData]);

  // Calcular preview de risco quando campos importantes mudarem
  useEffect(() => {
    if (isFormOpen) {
      calcularRiscoPreview({
        frequencia: formData.frequencia,
        media_geral: formData.media_geral,
        historico_reprovas: formData.historico_reprovas,
        trabalha: formData.trabalha,
        carga_horaria_trabalho: formData.carga_horaria_trabalho,
        renda_familiar: formData.renda_familiar,
      });
    }
  }, [
    formData.frequencia,
    formData.media_geral,
    formData.historico_reprovas,
    formData.trabalha,
    formData.carga_horaria_trabalho,
    formData.renda_familiar,
    isFormOpen,
    calcularRiscoPreview,
  ]);

  // Filtrar alunos
  const alunosFiltrados = alunos.filter(aluno => {
    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         aluno.matricula.toLowerCase().includes(searchTerm.toLowerCase());
    
    const alunoCurso = aluno.curso?.nome || '';
    const matchesCurso = !filtroCurso || alunoCurso === filtroCurso;
    
    const alunoRisco = aluno.predicao_atual?.nivel_risco || '';
    const matchesRisco = !filtroRisco || alunoRisco === filtroRisco;

    return matchesSearch && matchesCurso && matchesRisco;
  });

  // Stats
  const stats = {
    total: alunos.length,
    riscoMuitoAlto: alunos.filter(a => a.predicao_atual?.nivel_risco === NivelRisco.MUITO_ALTO).length,
    riscoAlto: alunos.filter(a => a.predicao_atual?.nivel_risco === NivelRisco.ALTO).length,
    riscoMedio: alunos.filter(a => a.predicao_atual?.nivel_risco === NivelRisco.MEDIO).length,
    riscoBaixo: alunos.filter(a => a.predicao_atual?.nivel_risco === NivelRisco.BAIXO).length,
  };

  // Handlers
  const handleOpenForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (aluno: any) => {
    setEditingData(aluno);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (matricula: string) => {
    setAlunoParaExcluir(matricula);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!alunoParaExcluir) return;

    try {
      const token = localStorage.getItem('sapee_token');
      if (!token) throw new Error('Não autenticado');

      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${alunoParaExcluir}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      addToast({
        type: 'success',
        title: 'Aluno excluído!',
        message: 'Cadastro removido com sucesso.',
      });

      await refetch();
      setShowDeleteModal(false);
      setAlunoParaExcluir(null);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erro ao excluir',
        message: error instanceof Error ? error.message : 'Erro ao excluir aluno',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Cadastro de Alunos</h2>
          <p className="text-gray-500 dark:text-slate-400">Gerencie manualmente os alunos do sistema.</p>
        </div>
        {can('alunos', 'create') && (
          <button
            onClick={handleOpenForm}
            disabled={isSubmitting}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700
                       transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <User className="w-5 h-5" />
            )}
            Novo Aluno
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase">Total</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-500/20">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase">Muito Alto Risco</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.riscoMuitoAlto}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
          <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Risco Alto</p>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.riscoAlto}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/20">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">Risco Médio</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.riscoMedio}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Risco Baixo</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.riscoBaixo}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800
                      grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                       rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                       transition-all text-gray-900 dark:text-white"
          />
        </div>

        <select
          value={filtroCurso}
          onChange={(e) => setFiltroCurso(e.target.value)}
          className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                     rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                     text-gray-900 dark:text-white"
        >
          <option value="">Todos os Cursos</option>
          {CURSOS.map(curso => (
            <option key={curso.id} value={curso.nome}>{curso.nome}</option>
          ))}
        </select>

        <select
          value={filtroRisco}
          onChange={(e) => setFiltroRisco(e.target.value)}
          className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                     rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                     text-gray-900 dark:text-white"
        >
          <option value="">Todos os Riscos</option>
          <option value="MUITO_ALTO">Muito Alto Risco</option>
          <option value="ALTO">Alto Risco</option>
          <option value="MEDIO">Médio Risco</option>
          <option value="BAIXO">Baixo Risco</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm('');
            setFiltroCurso('');
            setFiltroRisco('');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800
                     text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200
                     dark:hover:bg-slate-700 transition-colors"
        >
          <Filter className="w-4 h-4" /> Filtrar
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
          <span className="ml-4 text-gray-600 dark:text-slate-400">Carregando alunos...</span>
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <EmptyState
          icon={User}
          title={alunos.length === 0 ? "Nenhum aluno cadastrado" : "Nenhum aluno encontrado"}
          description={
            alunos.length === 0
              ? "Comece cadastrando um novo aluno no sistema."
              : "Tente ajustar seus filtros de busca."
          }
          action={
            alunos.length === 0 && can('alunos', 'create')
              ? {
                  label: "Cadastrar Aluno",
                  onClick: handleOpenForm,
                }
              : undefined
          }
        />
      ) : (
        /* Lista de Alunos */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {alunosFiltrados.map((aluno) => (
              <AlunoCard
                key={aluno.matricula}
                aluno={aluno}
                onEdit={() => handleEdit(aluno)}
                onDelete={() => handleDeleteClick(aluno.matricula)}
                canEdit={can('alunos', 'update')}
                canDelete={can('alunos', 'delete')}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de Formulário */}
      <AnimatePresence>
        {isFormOpen && (
          <FormModal
            formData={formData}
            isEditing={isEditing}
            isSubmitting={isSubmitting}
            predicaoPreview={predicaoPreview}
            handleInputChange={handleInputChange}
            handleCurrencyChange={handleCurrencyChange}
            handleCheckboxChange={handleCheckboxChange}
            handleNumericFocus={handleNumericFocus}
            getNumericValue={getNumericValue}
            formatCurrency={formatCurrency}
            parseCurrency={parseCurrency}
            handleSubmit={handleSubmit}
            onClose={() => setIsFormOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Aluno"
        description="Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita e todas as predições e intervenções associadas serão removidas."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}

// ============================================
// COMPONENTE: Card de Aluno
// ============================================

interface AlunoCardProps {
  key?: string;
  aluno: any;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

function AlunoCard({ aluno, onEdit, onDelete, canEdit, canDelete }: AlunoCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4" style={{ flexShrink: 0 }}>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{aluno.nome}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{aluno.matricula}</p>
        </div>
        {aluno.predicao_atual && (
          <RiskBadge nivel={aluno.predicao_atual.nivel_risco} />
        )}
      </div>

      {/* Informações */}
      <div className="space-y-3 mb-4" style={{ flexGrow: 1 }}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Curso</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {aluno.curso?.nome || 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Período</span>
          <span className="font-medium text-gray-900 dark:text-white">{aluno.periodo}º</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Média</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {aluno.media_geral?.toFixed(1) || 'N/A'}
            </span>
            <RiskProgressBar 
              value={(aluno.media_geral || 0) * 10}
              nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Frequência</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {aluno.frequencia?.toFixed(0) || 'N/A'}%
            </span>
            <RiskProgressBar 
              value={aluno.frequencia || 0}
              nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
            />
          </div>
        </div>
      </div>

      {/* Ações - USANDO TABELA PARA ALINHAMENTO PERFEITO */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '33.33%', padding: '0 0.25rem' }}>
                <button
                  onClick={() => navigate(`/aluno/${aluno.matricula}`)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                  style={{ minHeight: '44px', boxSizing: 'border-box' }}
                >
                  <User className="w-4 h-4" />
                  <span>Ver</span>
                </button>
              </td>
              <td style={{ width: '33.33%', padding: '0 0.25rem' }}>
                {canEdit ? (
                  <button
                    onClick={onEdit}
                    className="w-full px-3 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    style={{ minHeight: '44px', boxSizing: 'border-box' }}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 rounded-xl text-sm font-medium flex items-center justify-center gap-1 cursor-not-allowed opacity-50"
                    style={{ minHeight: '44px', boxSizing: 'border-box' }}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                )}
              </td>
              <td style={{ width: '33.33%', padding: '0 0.25rem' }}>
                {canDelete ? (
                  <button
                    onClick={onDelete}
                    className="w-full px-3 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    style={{ minHeight: '44px', boxSizing: 'border-box' }}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Excluir</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 rounded-xl text-sm font-medium flex items-center justify-center gap-1 cursor-not-allowed opacity-50"
                    style={{ minHeight: '44px', boxSizing: 'border-box' }}
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Excluir</span>
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Modal de Formulário
// ============================================

interface FormModalProps {
  formData: AlunoFormData;
  isEditing: boolean;
  isSubmitting: boolean;
  predicaoPreview: {
    risco_evasao: number;
    nivel_risco: NivelRisco;
    fatores_principais: string[];
  } | null;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCurrencyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNumericFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  getNumericValue: (value: number) => string;
  formatCurrency: (value: number) => string;
  parseCurrency: (value: string) => number;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
}

function FormModal({
  formData,
  isEditing,
  isSubmitting,
  predicaoPreview,
  handleInputChange,
  handleCurrencyChange,
  handleCheckboxChange,
  handleNumericFocus,
  getNumericValue,
  formatCurrency,
  parseCurrency,
  handleSubmit,
  onClose,
}: FormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Editar Aluno' : 'Novo Aluno'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {isEditing ? 'Atualize as informações do aluno' : 'Preencha os dados para cadastrar'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Conteúdo (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="aluno-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Dados Pessoais */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Matrícula *
                  </label>
                  <input
                    type="text"
                    name="matricula"
                    value={formData.matricula}
                    onChange={handleInputChange}
                    required
                    disabled={isEditing}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white disabled:opacity-50"
                    placeholder="Ex: 2024101001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                    placeholder="Ex: joao@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                    placeholder="Ex: 92999999999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    name="data_nascimento"
                    value={formData.data_nascimento}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Sexo
                  </label>
                  <select
                    name="sexo"
                    value={formData.sexo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Dados Acadêmicos */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                Dados Acadêmicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Curso *
                  </label>
                  <select
                    name="curso_id"
                    value={formData.curso_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  >
                    <option value={0}>Selecione o curso...</option>
                    <optgroup label="🎓 Superior (Graduação)">
                      {CURSOS.filter(c => c.modalidade === 'SUPERIOR').map(curso => (
                        <option key={curso.id} value={curso.id}>{curso.nome}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🔧 Técnico Integrado">
                      {CURSOS.filter(c => c.modalidade === 'INTEGRADO').map(curso => (
                        <option key={curso.id} value={curso.id}>{curso.nome}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🔧 Técnico Subsequente">
                      {CURSOS.filter(c => c.modalidade === 'SUBSEQUENTE').map(curso => (
                        <option key={curso.id} value={curso.id}>{curso.nome}</option>
                      ))}
                    </optgroup>
                    <optgroup label="📚 Pós-Graduação">
                      {CURSOS.filter(c => c.modalidade === 'POS_GRADUACAO').map(curso => (
                        <option key={curso.id} value={curso.id}>{curso.nome}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Período
                  </label>
                  <select
                    name="periodo"
                    value={formData.periodo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <option key={p} value={p}>{p}º</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Turno
                  </label>
                  <select
                    name="turno"
                    value={formData.turno}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  >
                    {TURNOS.map(turno => (
                      <option key={turno.value} value={turno.value}>{turno.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    Ano de Ingresso
                    <span className="text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Automático</span>
                  </label>
                  <input
                    type="text"
                    name="ano_ingresso"
                    value={formData.ano_ingresso}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600
                               rounded-xl text-gray-500 dark:text-slate-400 cursor-not-allowed font-mono"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Este campo é sincronizado automaticamente com a Matrícula.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Média Geral
                  </label>
                  <input
                    type="number"
                    name="media_geral"
                    value={getNumericValue(formData.media_geral)}
                    onChange={handleInputChange}
                    onFocus={handleNumericFocus}
                    step="0.1"
                    min="0"
                    max="10"
                    placeholder="0.0 a 10.0"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Frequência (%)
                  </label>
                  <input
                    type="number"
                    name="frequencia"
                    value={getNumericValue(formData.frequencia)}
                    onChange={handleInputChange}
                    onFocus={handleNumericFocus}
                    min="0"
                    max="100"
                    placeholder="0 a 100"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Histórico de Reprovas
                  </label>
                  <input
                    type="number"
                    name="historico_reprovas"
                    value={formData.historico_reprovas.toString()}
                    onChange={handleInputChange}
                    onFocus={handleNumericFocus}
                    step="1"
                    min="0"
                    max="10"
                    placeholder="0"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Apenas números inteiros: 0, 1, 2, 3...
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Coeficiente de Rendimento
                  </label>
                  <input
                    type="number"
                    name="coeficiente_rendimento"
                    value={getNumericValue(formData.coeficiente_rendimento)}
                    onChange={handleInputChange}
                    onFocus={handleNumericFocus}
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="0.00 a 10.00"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </section>

            {/* Preview de Predição */}
            {predicaoPreview && (
              <section className="bg-linear-to-r from-emerald-50 to-blue-50 dark:from-emerald-500/10 dark:to-blue-500/10
                                  rounded-2xl p-6 border border-emerald-200 dark:border-emerald-500/20">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Preview de Predição
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Risco de Evasão</span>
                      <span className={cn(
                        "text-2xl font-black",
                        predicaoPreview.nivel_risco === NivelRisco.ALTO ? "text-red-600" :
                        predicaoPreview.nivel_risco === NivelRisco.MEDIO ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {predicaoPreview.risco_evasao}%
                      </span>
                    </div>
                    <RiskProgressBar
                      value={predicaoPreview.risco_evasao}
                      nivel={predicaoPreview.nivel_risco}
                      size="lg"
                    />
                  </div>
                  <div className="w-px h-20 bg-gray-300 dark:bg-slate-700" />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Nível</span>
                    <RiskBadge nivel={predicaoPreview.nivel_risco} />
                  </div>
                </div>
                {predicaoPreview.fatores_principais.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                      Fatores de Risco:
                    </span>
                    <ul className="space-y-1">
                      {predicaoPreview.fatores_principais.map((fator, idx) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          {fator}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-4">
                  * Esta é uma estimativa baseada nos dados preenchidos. A predição oficial será gerada pelo backend após salvar.
                </p>
              </section>
            )}

            {/* Endereço */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange}
                    onFocus={handleNumericFocus}
                    placeholder="69000-000"
                    maxLength={9}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    placeholder="Ex: Manaus"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento || ''}
                    onChange={handleInputChange}
                    placeholder="Ex: Apto 101, Bloco B"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Bairro
                  </label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Zona Residencial
                  </label>
                  <select
                    name="zona_residencial"
                    value={formData.zona_residencial}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    {ZONAS.map(zona => (
                      <option key={zona.value} value={zona.value}>{zona.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Dados Socioeconômicos */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Dados Socioeconômicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Renda Familiar (R$)
                  </label>
                  <input
                    type="text"
                    name="renda_familiar"
                    value={formatCurrency(formData.renda_familiar)}
                    onChange={handleCurrencyChange}
                    onFocus={handleNumericFocus}
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    inputMode="decimal"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Digite apenas números: 150000 = R$ 1.500,00
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Renda per Capita (R$)
                  </label>
                  <input
                    type="text"
                    name="renda_per_capita"
                    value={formatCurrency(formData.renda_per_capita)}
                    onChange={handleCurrencyChange}
                    onFocus={handleNumericFocus}
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    inputMode="decimal"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Digite apenas números: 50000 = R$ 500,00
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="possui_auxilio"
                    checked={formData.possui_auxilio}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Possui auxílio/bolsa
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="beneficiario_bolsa_familia"
                    checked={formData.beneficiario_bolsa_familia}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Beneficiário Bolsa Família
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="primeiro_geracao_universidade"
                    checked={formData.primeiro_geracao_universidade}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Primeira geração na universidade
                  </span>
                </label>
              </div>
            </section>

            {/* Trabalho */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                Situação de Trabalho
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="trabalha"
                      checked={formData.trabalha}
                      onChange={handleCheckboxChange}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                      Trabalha
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Carga Horária (h/semana)
                  </label>
                  <input
                    type="number"
                    name="carga_horaria_trabalho"
                    value={getNumericValue(formData.carga_horaria_trabalho)}
                    onChange={handleInputChange}
                    onFocus={handleNumericFocus}
                    disabled={!formData.trabalha}
                    min="0"
                    max="60"
                    placeholder="20"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Ex: 20, 30, 40 horas
                  </p>
                </div>
              </div>
            </section>

            {/* Deslocamento */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-600" />
                Deslocamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Tempo de Deslocamento (min/dia)
                  </label>
                  <input
                    type="number"
                    name="tempo_deslocamento"
                    value={getNumericValue(formData.tempo_deslocamento)}
                    onChange={handleInputChange}
                    onFocus={handleNumericFocus}
                    min="0"
                    max="300"
                    placeholder="30"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Ex: 30, 60, 90 minutos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Custo Transporte Diário (R$)
                  </label>
                  <input
                    type="text"
                    name="custo_transporte_diario"
                    value={formatCurrency(formData.custo_transporte_diario)}
                    onChange={handleCurrencyChange}
                    onFocus={handleNumericFocus}
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    inputMode="decimal"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Digite apenas números: 1050 = R$ 10,50
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Dificuldade de Acesso
                  </label>
                  <select
                    name="dificuldade_acesso"
                    value={formData.dificuldade_acesso}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                  >
                    {DIFICULDADES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Transporte Utilizado
                  </label>
                  <input
                    type="text"
                    name="transporte_utilizado"
                    value={formData.transporte_utilizado}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700
                               rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                               text-gray-900 dark:text-white"
                    placeholder="Ex: Ônibus, Carro, etc."
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="usa_transporte_alternativo"
                    checked={formData.usa_transporte_alternativo}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Usa transporte alternativo (van, barco, moto-táxi)
                  </span>
                </label>
              </div>
            </section>

            {/* Infraestrutura */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" />
                Infraestrutura
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="possui_computador"
                    checked={formData.possui_computador}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Possui computador
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="possui_internet"
                    checked={formData.possui_internet}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Possui internet em casa
                  </span>
                </label>
              </div>
            </section>

            {/* Dados dos Responsáveis */}
            <section className="border-t border-gray-200 dark:border-slate-800 pt-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Dados dos Responsáveis
              </h3>

              <div className="space-y-6">
                {/* 1º Responsável */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300">1º Responsável</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nome</label>
                      <input
                        type="text"
                        name="nome_responsavel_1"
                        value={formData.nome_responsavel_1 || ''}
                        onChange={handleInputChange}
                        placeholder="Nome completo do responsável"
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Parentesco</label>
                      <select
                        name="parentesco_responsavel_1"
                        value={formData.parentesco_responsavel_1 || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value="">Selecione</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Pai">Pai</option>
                        <option value="Avó">Avó</option>
                        <option value="Avô">Avô</option>
                        <option value="Tio(a)">Tio(a)</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Telefone</label>
                      <input
                        type="text"
                        name="telefone_responsavel_1"
                        value={formData.telefone_responsavel_1 || ''}
                        onChange={handleInputChange}
                        placeholder="(92) 99999-9999"
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">E-mail</label>
                      <input
                        type="email"
                        name="email_responsavel_1"
                        value={formData.email_responsavel_1 || ''}
                        onChange={handleInputChange}
                        placeholder="email@exemplo.com"
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* 2º Responsável */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300">2º Responsável (Opcional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Nome</label>
                      <input
                        type="text"
                        name="nome_responsavel_2"
                        value={formData.nome_responsavel_2 || ''}
                        onChange={handleInputChange}
                        placeholder="Nome completo do responsável"
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Parentesco</label>
                      <select
                        name="parentesco_responsavel_2"
                        value={formData.parentesco_responsavel_2 || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value="">Selecione</option>
                        <option value="Mãe">Mãe</option>
                        <option value="Pai">Pai</option>
                        <option value="Avó">Avó</option>
                        <option value="Avô">Avô</option>
                        <option value="Tio(a)">Tio(a)</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Telefone</label>
                      <input
                        type="text"
                        name="telefone_responsavel_2"
                        value={formData.telefone_responsavel_2 || ''}
                        onChange={handleInputChange}
                        placeholder="(92) 99999-9999"
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300
                       rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors
                       disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="aluno-form"
            disabled={isSubmitting}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700
                       transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50
                       disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? 'Atualizar' : 'Cadastrar'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
