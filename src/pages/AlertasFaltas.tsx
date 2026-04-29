/**
 * Página de Gestão de Alertas de Faltas Consecutivas
 * SAPEE DEWAS - Sistema de Faltas Consecutivas
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  Eye,
  Edit,
  Save
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';

interface Alerta {
  id: number;
  aluno_matricula: string;
  aluno?: {
    nome: string;
    curso?: {
      nome: string;
    };
  };
  tipo_alerta: '3_FALTAS' | '5_FALTAS' | '10_FALTAS';
  quantidade_faltas: number;
  data_inicio_faltas: string;
  data_fim_faltas: string;
  disciplinas_afetadas: string;
  status: 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO' | 'IGNORADO';
  acoes_tomadas?: string;
  criado_at: string;
}

const statusConfig = {
  PENDENTE: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pendente', icon: Clock },
  EM_ANALISE: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Em Análise', icon: Search },
  RESOLVIDO: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Resolvido', icon: CheckCircle },
  IGNORADO: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Ignorado', icon: XCircle },
};

const tipoAlertaConfig = {
  '3_FALTAS': { color: 'text-yellow-600 bg-yellow-50', label: '3 Faltas', priority: 'BAIXA' },
  '5_FALTAS': { color: 'text-orange-600 bg-orange-50', label: '5 Faltas', priority: 'MÉDIA' },
  '10_FALTAS': { color: 'text-red-600 bg-red-50', label: '10 Faltas', priority: 'URGENTE' },
};

export default function AlertasFaltas() {
  const { addToast } = useToast();
  const { token } = useAuth();

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [alertaEditando, setAlertaEditando] = useState<number | null>(null);
  const [acoesTomadas, setAcoesTomadas] = useState('');

  useEffect(() => {
    loadAlertas();
  }, []);

  const loadAlertas = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroTipo) params.set('tipo_alerta', filtroTipo);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setAlertas(data);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAtualizarStatus = async (id: number, status: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            acoes_tomadas: acoesTomadas || undefined,
          }),
        }
      );

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Atualizado',
          message: `Alerta ${status.toLowerCase()} com sucesso`
        });
        
        setAlertaEditando(null);
        setAcoesTomadas('');
        loadAlertas();
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar',
        message: error.message
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Alertas de Faltas</h1>
          <p className="text-gray-500 mt-1">Gerencie alertas de faltas consecutivas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setTimeout(loadAlertas, 300);
            }}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Todos Status</option>
            <option value="PENDENTE" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Pendentes</option>
            <option value="EM_ANALISE" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Em Análise</option>
            <option value="RESOLVIDO" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Resolvidos</option>
            <option value="IGNORADO" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Ignorados</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => {
              setFiltroTipo(e.target.value);
              setTimeout(loadAlertas, 300);
            }}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Todos Tipos</option>
            <option value="3_FALTAS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">3 Faltas</option>
            <option value="5_FALTAS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">5 Faltas</option>
            <option value="10_FALTAS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">10 Faltas</option>
          </select>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Carregando alertas...</p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhum alerta encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Ótimo! Sem alertas de faltas consecutivas</p>
          </div>
        ) : (
          alertas.map((alerta) => {
            const StatusIcon = statusConfig[alerta.status].icon;
            const tipoConfig = tipoAlertaConfig[alerta.tipo_alerta];
            
            return (
              <motion.div
                key={alerta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white rounded-2xl border shadow-sm overflow-hidden",
                  alerta.status === 'PENDENTE' ? "border-orange-200" : "border-gray-100"
                )}
              >
                {/* Header do Card */}
                <div className={cn(
                  "p-4 flex items-center justify-between",
                  tipoConfig.color
                )}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">
                          {alerta.aluno?.nome || alerta.aluno_matricula}
                        </h3>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-bold",
                          statusConfig[alerta.status].color
                        )}>
                          {statusConfig[alerta.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {alerta.aluno?.curso?.nome || 'Curso não informado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{alerta.quantidade_faltas}</p>
                      <p className="text-xs text-gray-600">faltas</p>
                    </div>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-4 space-y-4">
                  {/* Informações */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Período</p>
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(alerta.data_inicio_faltas).toLocaleDateString('pt-BR')} - 
                        {new Date(alerta.data_fim_faltas).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Disciplinas</p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {alerta.disciplinas_afetadas ? 
                          JSON.parse(alerta.disciplinas_afetadas).join(', ') : 
                          'Não informado'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Criado em</p>
                      <p className="text-sm text-gray-700">
                        {new Date(alerta.criado_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Ações Tomadas */}
                  {alertaEditando === alerta.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Ações Tomadas
                        </label>
                        <textarea
                          value={acoesTomadas}
                          onChange={(e) => setAcoesTomadas(e.target.value)}
                          rows={3}
                          placeholder="Descreva as ações tomadas para resolver..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAlertaEditando(null);
                            setAcoesTomadas('');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-all text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleAtualizarStatus(alerta.id, 'RESOLVIDO')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all text-sm flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Salvar e Resolver
                        </button>
                      </div>
                    </div>
                  ) : (
                    alerta.acoes_tomadas && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs font-bold text-gray-600 mb-1">Ações Tomadas:</p>
                        <p className="text-sm text-gray-700">{alerta.acoes_tomadas}</p>
                      </div>
                    )
                  )}

                  {/* Botões de Ação */}
                  {alerta.status === 'PENDENTE' && alertaEditando !== alerta.id && (
                    <div className="flex gap-2 pt-4 border-t">
                      <button
                        onClick={() => setAlertaEditando(alerta.id)}
                        className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Registrar Ações
                      </button>
                      <button
                        onClick={() => handleAtualizarStatus(alerta.id, 'IGNORADO')}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-all text-sm flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Ignorar
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
