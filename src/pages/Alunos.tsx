/**
 * Página de Gestão de Alunos - COM API REAL
 * SAPEE DEWAS Frontend
 * 
 * Esta versão usa o hook useAlunos.ts para consumir a API real
 * em vez de dados mock.
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, LayoutGrid, List, ChevronLeft, ChevronRight, User, CheckSquare, Square, Download, ClipboardList, X, Users, AlertTriangle, TrendingUp, Edit, Trash2, Eye, Zap, Plus, MoreHorizontal } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { NivelRisco } from '../types';
import { cn } from '../utils';
import { StatCard, RiskBadge, RiskProgressBar, AlunoCardSkeleton, EmptyState, ConfirmationModal } from '../components/ui';
import { EdicaoRapidaModal } from '../components/EdicaoRapidaModal';
import { useAlunos } from '../hooks/useAlunos';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';

export default function Alunos() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [selectedAlunos, setSelectedAlunos] = React.useState<string[]>([]);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteMultipleModal, setShowDeleteMultipleModal] = useState(false);
  
  // Estado para edição rápida
  const [edicaoRapidaOpen, setEdicaoRapidaOpen] = useState(false);
  const [alunoParaEditar, setAlunoParaEditar] = useState<any>(null);

  const busca = searchParams.get('busca') || '';
  const curso = searchParams.get('curso') || '';
  const nivelRiscoParam = searchParams.get('nivelRisco') || '';
  
  // Converter string para NivelRisco de forma segura
  const nivelRisco: NivelRisco | undefined = 
    nivelRiscoParam === 'MUITO_ALTO' ? NivelRisco.MUITO_ALTO :
    nivelRiscoParam === 'ALTO' ? NivelRisco.ALTO :
    nivelRiscoParam === 'MEDIO' ? NivelRisco.MEDIO :
    nivelRiscoParam === 'BAIXO' ? NivelRisco.BAIXO : undefined;

  // Determinar nivel_risco para a API
  const nivelRiscoAPI = nivelRisco || undefined;

  // Usar hook com API REAL (não usa mais useMockAlunos)
  const { 
    data: filteredAlunos, 
    isLoading, 
    error, 
    refetch,
    deleteAluno,
    deleteMultiple 
  } = useAlunos({
    busca,
    curso_id: curso ? parseInt(curso) : undefined,
    nivel_risco: nivelRiscoAPI,
    skip: 0,
    limit: 100,
  });

  // Extrair cursos únicos para filtro
  const cursos = useMemo(() => {
    const cursosSet = new Set(filteredAlunos.map(a => a.curso?.nome || 'Sem Curso'));
    return Array.from(cursosSet);
  }, [filteredAlunos]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: filteredAlunos.length,
    muito_alto: filteredAlunos.filter(a => a.predicao_atual?.nivel_risco === 'MUITO_ALTO').length,
    alto: filteredAlunos.filter(a => a.predicao_atual?.nivel_risco === 'ALTO').length,
    medio: filteredAlunos.filter(a => a.predicao_atual?.nivel_risco === 'MEDIO').length,
    baixo: filteredAlunos.filter(a => a.predicao_atual?.nivel_risco === 'BAIXO').length,
  }), [filteredAlunos]);

  const toggleSelect = (matricula: string) => {
    setSelectedAlunos(prev =>
      prev.includes(matricula) ? prev.filter(i => i !== matricula) : [...prev, matricula]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAlunos.length === filteredAlunos.length) {
      setSelectedAlunos([]);
    } else {
      setSelectedAlunos(filteredAlunos.map(a => a.matricula));
    }
  };

  const handleEditar = (matricula: string) => {
    navigate(`/alunos/${matricula}/editar`);
    addToast({
      type: 'info',
      title: 'Editando aluno',
      message: 'Redirecionando para edição completa.',
    });
  };
  
  const handleEdicaoRapida = (aluno: any) => {
    setAlunoParaEditar(aluno);
    setEdicaoRapidaOpen(true);
  };
  
  const handleEdicaoRapidaSuccess = () => {
    refetch();
    addToast({
      type: 'success',
      title: 'Dados atualizados',
      message: 'As alterações foram salvas com sucesso.',
    });
  };

  const handleExcluirClick = (matricula: string) => {
    setAlunoParaExcluir(matricula);
    setShowDeleteModal(true);
  };

  const handleConfirmarExclusao = async () => {
    if (alunoParaExcluir) {
      try {
        await deleteAluno(alunoParaExcluir);
        addToast({
          type: 'success',
          title: 'Aluno excluído',
          message: 'Registro removido com sucesso.',
        });
        setShowDeleteModal(false);
        setAlunoParaExcluir(null);
        setSelectedAlunos([]);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Erro ao excluir',
          message: error instanceof Error ? error.message : 'Erro ao excluir aluno',
        });
      }
    }
  };

  const handleExcluirMultiple = async () => {
    if (selectedAlunos.length === 0) return;
    
    try {
      await deleteMultiple(selectedAlunos);
      addToast({
        type: 'success',
        title: 'Alunos excluídos',
        message: `${selectedAlunos.length} aluno(s) removido(s) com sucesso.`,
      });
      setShowDeleteMultipleModal(false);
      setSelectedAlunos([]);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erro ao excluir',
        message: error instanceof Error ? error.message : 'Erro ao excluir alunos',
      });
    }
  };

  const handleExcluirSelecionados = () => {
    if (selectedAlunos.length > 0) {
      setShowDeleteMultipleModal(true);
    }
  };

  // Renderizar stats de erro
  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">
            ⚠️ Erro ao Carregar Alunos
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Listagem de Alunos</h2>
          <p className="text-gray-500 dark:text-slate-400">Gerencie e monitore o desempenho dos estudantes.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-emerald-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800")}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-emerald-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800")}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <Link
            to="/cadastro"
            className="group flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none hover:shadow-xl hover:shadow-emerald-300 dark:hover:shadow-emerald-900/20"
          >
            <div className="bg-white/20 rounded-lg p-1 group-hover:bg-white/30 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span>Cadastrar Aluno</span>
          </Link>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total de Alunos"
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Muito Alto Risco"
          value={stats.muito_alto}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Risco Alto"
          value={stats.alto}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Risco Médio"
          value={stats.medio}
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Risco Baixo"
          value={stats.baixo}
          icon={ClipboardList}
          color="emerald"
        />
      </div>

      {/* Filtros e Ações */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou matrícula..."
              value={busca}
              onChange={(e) => {
                const newParams = new URLSearchParams(searchParams);
                if (e.target.value) {
                  newParams.set('busca', e.target.value);
                } else {
                  newParams.delete('busca');
                }
                setSearchParams(newParams);
              }}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>

          {/* Filtro de Curso */}
          <select
            value={curso}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.value) {
                newParams.set('curso', e.target.value);
              } else {
                newParams.delete('curso');
              }
              setSearchParams(newParams);
            }}
            className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
          >
            <option value="">Todos os cursos</option>
            {cursos.map(curso => (
              <option key={curso} value={curso}>{curso}</option>
            ))}
          </select>

          {/* Filtro de Nível de Risco */}
          <select
            value={nivelRiscoParam}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.value) {
                newParams.set('nivelRisco', e.target.value);
              } else {
                newParams.delete('nivelRisco');
              }
              setSearchParams(newParams);
            }}
            className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
          >
            <option value="">Todos os riscos</option>
            <option value="MUITO_ALTO">Muito Alto Risco</option>
            <option value="ALTO">Risco Alto</option>
            <option value="MEDIO">Risco Médio</option>
            <option value="BAIXO">Risco Baixo</option>
          </select>

          {/* Limpar Filtros */}
          {(busca || curso || nivelRiscoParam) && (
            <button
              onClick={() => setSearchParams({})}
              className="px-4 py-3 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Ações em Massa */}
        {selectedAlunos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
              {selectedAlunos.length} aluno(s) selecionado(s)
            </span>
            <button
              onClick={handleExcluirSelecionados}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-semibold"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Excluir Selecionados
            </button>
          </div>
        )}
      </div>

      {/* Lista de Alunos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <AlunoCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAlunos.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum aluno encontrado"
          description="Tente ajustar os filtros ou cadastre um novo aluno."
          action={{
            label: "Cadastrar Aluno",
            onClick: () => navigate('/cadastro'),
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAlunos.map((aluno) => (
              <AlunoCard
                key={aluno.matricula}
                aluno={aluno}
                isSelected={selectedAlunos.includes(aluno.matricula)}
                onSelect={() => toggleSelect(aluno.matricula)}
                onEdit={() => handleEditar(aluno.matricula)}
                onEdicaoRapida={() => handleEdicaoRapida(aluno)}
                onDelete={() => handleExcluirClick(aluno.matricula)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          {/* Container com scroll horizontal para mobile */}
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left">
                  <button onClick={toggleSelectAll} className="hover:opacity-70">
                    {selectedAlunos.length === filteredAlunos.length ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aluno</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Curso</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Período</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Média</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Frequência</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Risco</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredAlunos.map((aluno) => (
                <tr key={aluno.matricula} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <button onClick={() => toggleSelect(aluno.matricula)} className="hover:opacity-70">
                      {selectedAlunos.includes(aluno.matricula) ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{aluno.nome}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">{aluno.matricula}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-sm text-gray-600 dark:text-slate-300 max-w-[200px] truncate">
                    {aluno.curso?.nome || 'Sem Curso'}
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-sm text-gray-600 dark:text-slate-300 whitespace-nowrap text-center">
                    {aluno.periodo}º
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {aluno.media_geral?.toFixed(1) || 'N/A'}
                      </span>
                      <RiskProgressBar
                        value={(aluno.media_geral || 0) * 10}
                        nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
                        showLabel={false}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {aluno.frequencia?.toFixed(0) || 'N/A'}%
                      </span>
                      <RiskProgressBar
                        value={aluno.frequencia || 0}
                        nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
                        showLabel={false}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    {aluno.predicao_atual ? (
                      <RiskBadge nivel={aluno.predicao_atual.nivel_risco} />
                    ) : (
                      <span className="text-xs text-gray-400 whitespace-nowrap">Sem predição</span>
                    )}
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <button
                        onClick={() => navigate(`/alunos/${aluno.matricula}`)}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={() => handleEdicaoRapida(aluno)}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-all"
                        title="Edição Rápida"
                      >
                        <Zap className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={() => handleEditar(aluno.matricula)}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={() => handleExcluirClick(aluno.matricula)}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modais de Confirmação */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmarExclusao}
        title="Excluir Aluno"
        description={`Tem certeza que deseja excluir o aluno ${alunoParaExcluir ? filteredAlunos.find(a => a.matricula === alunoParaExcluir)?.nome : ''}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={showDeleteMultipleModal}
        onClose={() => setShowDeleteMultipleModal(false)}
        onConfirm={handleExcluirMultiple}
        title="Excluir Múltiplos Alunos"
        description={`Tem certeza que deseja excluir ${selectedAlunos.length} aluno(s) selecionado(s)? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de Edição Rápida */}
      <EdicaoRapidaModal
        isOpen={edicaoRapidaOpen}
        onClose={() => {
          setEdicaoRapidaOpen(false);
          setAlunoParaEditar(null);
        }}
        aluno={alunoParaEditar}
        onSuccess={handleEdicaoRapidaSuccess}
        token={token || ''}
      />
    </div>
  );
}

// Componente Card de Aluno
interface AlunoCardProps {
  key?: string;
  aluno: any;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onEdicaoRapida?: () => void;
  onDelete: () => void;
}

function AlunoCard({ aluno, isSelected, onSelect, onEdit, onEdicaoRapida, onDelete }: AlunoCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-all duration-300 hover:shadow-xl",
        isSelected
          ? "border-emerald-500 ring-2 ring-emerald-500/20"
          : "border-gray-200 dark:border-slate-800"
      )}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onSelect} className="hover:opacity-70">
            {isSelected ? (
              <CheckSquare className="w-6 h-6 text-emerald-600" />
            ) : (
              <Square className="w-6 h-6 text-gray-400" />
            )}
          </button>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{aluno.nome}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">{aluno.matricula}</p>
          </div>
        </div>
        {aluno.predicao_atual && (
          <RiskBadge nivel={aluno.predicao_atual.nivel_risco} />
        )}
      </div>

      {/* Informações */}
      <div className="space-y-3 mb-4" style={{ flexGrow: 1 }}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Curso</span>
          <span className="font-medium text-gray-900 dark:text-white">{aluno.curso?.nome || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Período</span>
          <span className="font-medium text-gray-900 dark:text-white">{aluno.periodo}º</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Média Geral</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{aluno.media_geral?.toFixed(1) || 'N/A'}</span>
            <RiskProgressBar
              value={(aluno.media_geral || 0) * 10}
              nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
              showLabel={false}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Frequência</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{aluno.frequencia?.toFixed(0) || 'N/A'}%</span>
            <RiskProgressBar
              value={aluno.frequencia || 0}
              nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
              showLabel={false}
            />
          </div>
        </div>
      </div>

      {/* Ações - CLASSES TAILWIND PARA DARK MODE */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
        <button
          onClick={() => navigate(`/alunos/${aluno.matricula}`)}
          className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
        >
          <Eye className="w-4 h-4" />
          <span>Ver</span>
        </button>
        {onEdicaoRapida && (
          <button
            onClick={onEdicaoRapida}
            className="flex-1 px-3 py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-1"
            title="Edição Rápida"
          >
            <Zap className="w-4 h-4" />
            <span>Rápido</span>
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-1"
        >
          <Edit className="w-4 h-4" />
          <span>Editar</span>
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center justify-center"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" />
          <span className="sr-only">Excluir</span>
        </button>
      </div>
    </motion.div>
  );
}
