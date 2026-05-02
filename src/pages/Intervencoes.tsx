/**
 * Página de Gestão de Intervenções Pedagógicas
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 *
 * Foco: Histórico, Analytics e Gestão Global de Intervenções.
 * Ações operacionais (criar/sugerir) são feitas nos módulos de Risco e Monitoramento.
 */

import React, { useState, useMemo } from 'react';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  User,
  TrendingUp,
  Phone,
  MessageCircle
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { StatusIntervencao, IntervencaoAPI, IntervencaoUpdate } from '../types';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import IntervencaoModal from '../components/IntervencaoModal';

// Mapeamento de status para cores e ícones (Excluindo RASCUNHO da view principal)
const statusConfig = {
  [StatusIntervencao.PENDENTE]: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
    label: 'Pendente'
  },
  [StatusIntervencao.EM_ANDAMENTO]: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: AlertCircle,
    label: 'Em Andamento'
  },
  [StatusIntervencao.CONCLUIDA]: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    label: 'Concluída'
  },
  [StatusIntervencao.CANCELADA]: {
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
    label: 'Cancelada'
  }
};

// Mapeamento de prioridade para cores
const prioridadeConfig = {
  BAIXA: 'bg-green-500',
  MEDIA: 'bg-blue-500',
  ALTA: 'bg-orange-500',
  URGENTE: 'bg-red-500'
};

export default function Intervencoes() {
  const { addToast } = useToast();
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedIntervencao, setSelectedIntervencao] = useState<IntervencaoAPI | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [intervencoes, setIntervencoes] = useState<IntervencaoAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  // Carregar intervenções
  React.useEffect(() => {
    loadIntervencoes();
    loadStats();
  }, [status, page]);

  const loadIntervencoes = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const data = await api.intervencoes.list(
        token,
        (page - 1) * limit,
        limit,
        status || undefined
      );
      // Filtro de segurança para garantir que RASCUNHOS não apareçam aqui
      setIntervencoes(data.filter((int: any) => int.status !== 'RASCUNHO'));
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar intervenções',
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!token) return;

    try {
      const data = await api.intervencoes.stats(token);
      setStats(data);
    } catch (error: any) {
      console.error('Erro ao carregar stats:', error);
    }
  };

  const handleEdit = (intervencao: IntervencaoAPI) => {
    setSelectedIntervencao(intervencao);
    setShowEditModal(true);
  };

  const handleUpdate = async (data: IntervencaoUpdate) => {
    if (!token || !selectedIntervencao) return;

    try {
      await api.intervencoes.update(token, selectedIntervencao.id, data);

      addToast({
        type: 'success',
        title: 'Intervenção atualizada',
        message: 'A intervenção foi atualizada com sucesso'
      });

      setShowEditModal(false);
      setSelectedIntervencao(null);

      await loadIntervencoes();
      await loadStats();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar',
        message: error.message
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;

    if (!confirm('Tem certeza que deseja excluir esta intervenção?')) return;

    try {
      await api.intervencoes.delete(token, id);

      addToast({
        type: 'success',
        title: 'Intervenção excluída',
        message: 'A intervenção foi excluída com sucesso'
      });

      await loadIntervencoes();
      await loadStats();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao excluir',
        message: error.message
      });
    }
  };

  const handleStatusFilter = (newStatus: string) => {
    const params = new URLSearchParams(searchParams);
    if (newStatus) {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  // Estatísticas
  const statsCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Total de Intervenções',
        value: stats.total || 0,
        icon: ClipboardList,
        color: 'from-gray-500 to-gray-600',
        bgColor: 'bg-gray-50 dark:bg-slate-800'
      },
      {
        title: 'Intervenções Ativas',
        value: stats.ativas || 0,
        icon: AlertCircle,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50 dark:bg-slate-800'
      },
      {
        title: 'Pendentes',
        value: stats.pendentes || 0,
        icon: Clock,
        color: 'from-yellow-500 to-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-slate-800'
      },
      {
        title: 'Taxa de Conclusão',
        value: `${stats.taxa_conclusão || 0}%`,
        icon: TrendingUp,
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-50 dark:bg-slate-800'
      }
    ];
  }, [stats]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header Limpo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Intervenções Pedagógicas</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Histórico e gestão global de ações de apoio ao aluno</p>
        </div>
      </div>

      {/* Stats Cards */}
      {statsCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "rounded-2xl p-4 md:p-6",
                stat.bgColor,
                "border border-gray-100 dark:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-slate-300">{stat.title}</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1 md:mt-2">{stat.value}</p>
                </div>
                <div className={cn(
                  "p-2 md:p-3 rounded-xl bg-linear-to-br",
                  stat.color
                )}>
                  <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filtros (Sem RASCUNHO) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 md:p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-5 h-5 text-gray-400 dark:text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-gray-600 dark:text-slate-300">Filtrar:</span>
        </div>
        <div className="flex gap-2 flex-wrap flex-1">
          <button
            onClick={() => handleStatusFilter('')}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-bold transition-all min-h-11",
              !status
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            )}
          >
            Todos
          </button>
          {/* Lista explícita para excluir RASCUNHO */}
          {[StatusIntervencao.PENDENTE, StatusIntervencao.EM_ANDAMENTO, StatusIntervencao.CONCLUIDA, StatusIntervencao.CANCELADA].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-bold transition-all min-h-11",
                status === s
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Intervenções */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">
            {status ? `${status.replace('_', ' ')}` : 'Todas'} as Intervenções
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 dark:text-slate-400 mt-4">Carregando histórico...</p>
          </div>
        ) : intervencoes.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <ClipboardList className="w-12 h-12 md:w-16 md:h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-300 font-medium">Nenhuma intervenção encontrada</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Ações registradas aparecerão aqui</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {intervencoes.map((intervencao) => {
              const statusKey = intervencao.status as keyof typeof statusConfig;
              const config = statusConfig[statusKey];
              if (!config) return null;

              const StatusIcon = config.icon;

              return (
                <motion.div
                  key={intervencao.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Indicador de prioridade */}
                      <div className={cn(
                        "w-1 h-12 md:h-16 rounded-full shrink-0",
                        prioridadeConfig[intervencao.prioridade]
                      )} />

                      {/* Ícone de status */}
                      <div className={cn(
                        "p-2 md:p-3 rounded-xl shrink-0",
                        config.color
                      )}>
                        <StatusIcon className="w-4 h-4 md:w-5 md:h-5" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white truncate">{intervencao.tipo}</h3>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-bold",
                            config.color
                          )}>
                            {config.label}
                          </span>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-bold text-white",
                            prioridadeConfig[intervencao.prioridade]
                          )}>
                            {intervencao.prioridade.replace('_', ' ')}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-3 line-clamp-2">{intervencao.descricao}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 shrink-0" />
                            <span className="truncate">{intervencao.usuario?.nome || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span>
                              {new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {intervencao.aluno && (
                            <Link
                              to={`/alunos/${intervencao.aluno.matricula}`}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium truncate"
                            >
                              {intervencao.aluno.nome}
                            </Link>
                          )}
                        </div>

                        {/* Contato do Responsável */}
                        {(intervencao.aluno as any)?.nome_responsavel_1 && (
                          <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                                👤 Responsável
                              </p>
                              <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium truncate">
                                {(intervencao.aluno as any).nome_responsavel_1}
                                {(intervencao.aluno as any).parentesco_responsavel_1 && (
                                  <span className="text-xs font-normal text-emerald-600 dark:text-emerald-500 ml-1">
                                    • {(intervencao.aluno as any).parentesco_responsavel_1}
                                  </span>
                                )}
                              </p>
                              {(intervencao.aluno as any).telefone_responsavel_1 && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                  {(intervencao.aluno as any).telefone_responsavel_1}
                                </p>
                              )}
                            </div>
                            {(intervencao.aluno as any).telefone_responsavel_1 && (
                              <a
                                href={`https://wa.me/${(intervencao.aluno as any).telefone_responsavel_1.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Olá! Somos do SAPEE - Sistema de Alerta de Predição de Evasão Escolar. Gostaríamos de conversar sobre o(a) aluno(a) ${intervencao.aluno.nome}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-xs font-bold shrink-0"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 sm:shrink-0 pl-7 sm:pl-0">
                      <button
                        onClick={() => handleEdit(intervencao)}
                        className="p-2.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-all min-w-11 min-h-11 flex items-center justify-center"
                        title="Editar/Atualizar Status"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(intervencao.id)}
                        className="p-2.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all min-w-11 min-h-11 flex items-center justify-center"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {!isLoading && intervencoes.length > 0 && (
          <div className="p-4 md:p-6 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-11 w-full sm:w-auto justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Página {page}
            </span>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={intervencoes.length < limit}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-11 w-full sm:w-auto justify-center"
            >
              Próxima
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <IntervencaoModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedIntervencao(null);
        }}
        onSave={handleUpdate}
        alunoNome={selectedIntervencao?.aluno?.nome || ''}
        matricula={selectedIntervencao?.aluno_id}
        isSaving={false}
        initialValues={{
          tipo: selectedIntervencao?.tipo || '',
          descricao: selectedIntervencao?.descricao || '',
          status: selectedIntervencao?.status || StatusIntervencao.PENDENTE,
          prioridade: selectedIntervencao?.prioridade || 'MEDIA'
        }}
      />
    </div>
  );
}
