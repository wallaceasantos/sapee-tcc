/**
 * Componente TimelineJornada - Visualização da jornada do aluno
 * 
 * Mostra todos os eventos do aluno em ordem cronológica:
 * - Predições
 * - Intervenções
 * - Frequência
 * - Questionários
 * - Alertas de faltas
 * - Notas por disciplina
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Calendar, HelpCircle, AlertTriangle, BookOpen, Users, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface EventoJornada {
  tipo: string;
  data: string | null;
  titulo: string;
  detalhes: Record<string, any>;
  cor: string;
  icone: string;
}

interface JornadaData {
  matricula: string;
  nome: string;
  total_eventos: number;
  eventos: EventoJornada[];
}

interface TimelineJornadaProps {
  matricula: string;
  className?: string;
}

const icones: Record<string, React.ReactNode> = {
  'trend-up': <TrendingUp className="w-4 h-4" />,
  'alert-circle': <AlertCircle className="w-4 h-4" />,
  'calendar': <Calendar className="w-4 h-4" />,
  'help-circle': <HelpCircle className="w-4 h-4" />,
  'alert-triangle': <AlertTriangle className="w-4 h-4" />,
  'book': <BookOpen className="w-4 h-4" />,
  'users': <Users className="w-4 h-4" />,
};

const cores: Record<string, string> = {
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return 'Data não informada';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export default function TimelineJornada({ matricula, className }: TimelineJornadaProps) {
  const { token } = useAuth();
  const [jornada, setJornada] = useState<JornadaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadJornada();
  }, [matricula, token]);

  const loadJornada = async () => {
    if (!token || !matricula) return;
    setLoading(true);
    try {
      const data = await api.jornada.get(token, matricula);
      setJornada(data);
    } catch (error) {
      console.error('Erro ao carregar jornada:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatarDetalhes = (evento: EventoJornada): React.ReactNode => {
    const { detalhes, tipo } = evento;

    switch (tipo) {
      case 'PREDICAO':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Risco de Evasão:</span> {(detalhes.risco_evasao || 0).toFixed(1)}%</p>
            <p><span className="font-medium">Nível:</span> {detalhes.nivel_risco}</p>
            {detalhes.fatores_principais && (
              <p><span className="font-medium">Fatores:</span> {detalhes.fatores_principais}</p>
            )}
          </div>
        );

      case 'INTERVENCAO':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Tipo:</span> {detalhes.tipo}</p>
            {detalhes.descricao && <p><span className="font-medium">Descrição:</span> {detalhes.descricao}</p>}
            <p><span className="font-medium">Status:</span> {detalhes.status}</p>
            {detalhes.prioridade && <p><span className="font-medium">Prioridade:</span> {detalhes.prioridade}</p>}
            {detalhes.observacoes && <p><span className="font-medium">Observações:</span> {detalhes.observacoes}</p>}
          </div>
        );

      case 'FREQUENCIA':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Mês:</span> {detalhes.mes}</p>
            <p><span className="font-medium">Frequência:</span> {detalhes.frequencia}%</p>
            <p><span className="font-medium">Faltas justificadas:</span> {detalhes.faltas_justificadas}</p>
            <p><span className="font-medium">Faltas não justificadas:</span> {detalhes.faltas_nao_justificadas}</p>
          </div>
        );

      case 'QUESTIONARIO':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Score Total:</span> {detalhes.score_total}</p>
            {detalhes.fator_critico && (
              <p><span className="font-medium">Fator Crítico:</span> {detalhes.fator_critico}</p>
            )}
          </div>
        );

      case 'ALERTA_FALTAS':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Tipo:</span> {detalhes.tipo_alerta}</p>
            <p><span className="font-medium">Faltas:</span> {detalhes.quantidade_faltas}</p>
            <p><span className="font-medium">Status:</span> {detalhes.status}</p>
            {detalhes.disciplinas_afetadas && (
              <p><span className="font-medium">Disciplinas:</span> {detalhes.disciplinas_afetadas}</p>
            )}
          </div>
        );

      case 'NOTA':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Disciplina:</span> {detalhes.disciplina}</p>
            <p><span className="font-medium">Nota:</span> {detalhes.nota}</p>
            <p><span className="font-medium">Bimestre:</span> {detalhes.bimestre}º</p>
            <p><span className="font-medium">Situação:</span> {detalhes.situacao}</p>
            {detalhes.faltas_disciplina > 0 && (
              <p><span className="font-medium">Faltas na disciplina:</span> {detalhes.faltas_disciplina}</p>
            )}
          </div>
        );

      case 'ATENDIMENTO':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Tipo:</span> {detalhes.tipo}</p>
            <p><span className="font-medium">Status:</span> {detalhes.status}</p>
            <p><span className="font-medium">Descrição:</span> {detalhes.descricao}</p>
            {detalhes.local && <p><span className="font-medium">Local:</span> {detalhes.local}</p>}
            {detalhes.observacoes && <p><span className="font-medium">Observações:</span> {detalhes.observacoes}</p>}
            {detalhes.prioridade && <p><span className="font-medium">Prioridade:</span> {detalhes.prioridade}</p>}
            {detalhes.necessita_encaminhamento && (
              <p className="text-amber-600 dark:text-amber-400"><span className="font-medium">⚠️ Necessita encaminhamento</span></p>
            )}
            {detalhes.necessita_followup && (
              <p className="text-blue-600 dark:text-blue-400"><span className="font-medium">📋 Necessita follow-up</span></p>
            )}
          </div>
        );

      default:
        return <pre className="text-xs overflow-auto max-w-full">{JSON.stringify(detalhes, null, 2)}</pre>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-3" />
        <span className="text-gray-500 dark:text-slate-400">Carregando jornada...</span>
      </div>
    );
  }

  if (!jornada || jornada.eventos.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-slate-400">Nenhum evento registrado</p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
          Os eventos aparecerão conforme o aluno interage com o sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          {jornada.total_eventos} evento{jornada.total_eventos !== 1 ? 's' : ''} registrado{jornada.total_eventos !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical da timeline */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

        <div className="space-y-3">
          {jornada.eventos.map((evento, index) => {
            const isExpanded = expandedIds.has(index);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex gap-4"
              >
                {/* Ícone */}
                <div className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0",
                  cores[evento.cor] || cores.gray
                )}>
                  {icones[evento.icone] || <Clock className="w-4 h-4" />}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => toggleExpand(index)}
                    className="w-full text-left bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-3 hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {evento.titulo}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {formatDateBR(evento.data)}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Detalhes expandidos */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700"
                      >
                        <p className="font-bold text-xs text-gray-700 dark:text-slate-300 mb-2 uppercase">Detalhes</p>
                        {formatarDetalhes(evento)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
