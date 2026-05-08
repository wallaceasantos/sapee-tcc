/**
 * Página de Gestão de Atendimentos/Ocorrências
 * SAPEE DEWAS - Registro de atendimentos individuais
 */

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Save, X, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface Atendimento {
  id: number;
  aluno_matricula: string;
  usuario_id: number;
  tipo_atendimento: string;
  status: string;
  data_atendimento: string;
  hora_inicio?: string;
  hora_fim?: string;
  local?: string;
  descricao: string;
  observacoes?: string;
  necessita_encaminhamento: boolean;
  status_encaminhamento?: string;
  tipo_encaminhamento?: string;
  necessita_followup: boolean;
  data_proximo_atendimento?: string;
  prioridade: string;
  criado_at?: string;
  aluno?: { nome: string; matricula: string };
}

const TIPOS_ATENDIMENTO = [
  { value: 'PSICOLOGICO', label: 'Psicológico', icon: '🧠' },
  { value: 'SOCIAL', label: 'Social', icon: '👥' },
  { value: 'DISCIPLINAR', label: 'Disciplinar', icon: '⚖️' },
  { value: 'ACADEMICO', label: 'Acadêmico', icon: '📚' },
  { value: 'SAUDE', label: 'Saúde', icon: '🏥' },
  { value: 'ENCAMINHAMENTO_EXTERNO', label: 'Encaminhamento Externo', icon: '🔗' },
  { value: 'CONVERSA_INFORMAL', label: 'Conversa Informal', icon: '💬' },
];

const STATUS_OPTIONS = [
  { value: 'AGENDADO', label: 'Agendado', color: 'bg-blue-100 text-blue-700' },
  { value: 'REALIZADO', label: 'Realizado', color: 'bg-green-100 text-green-700' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'CONCLUIDO', label: 'Concluído', color: 'bg-purple-100 text-purple-700' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
];

const PRIORIDADE_OPTIONS = [
  { value: 'BAIXA', label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
  { value: 'MEDIA', label: 'Média', color: 'bg-blue-100 text-blue-700' },
  { value: 'ALTA', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'URGENTE', label: 'Urgente', color: 'bg-red-100 text-red-700' },
];

export default function Atendimentos() {
  const { token, user } = useAuth();
  const { addToast } = useToast();

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');

  // Form
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<{ matricula: string; nome: string } | null>(null);
  const [alunosFiltrados, setAlunosFiltrados] = useState<any[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [tipoAtendimento, setTipoAtendimento] = useState('PSICOLOGICO');
  const [statusAtend, setStatusAtend] = useState('AGENDADO');
  const [dataAtendimento, setDataAtendimento] = useState(new Date().toISOString().split('T')[0]);
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [prioridade, setPrioridade] = useState('MEDIA');
  const [necessitaEncaminhamento, setNecessitaEncaminhamento] = useState(false);
  const [tipoEncaminhamento, setTipoEncaminhamento] = useState('');
  const [necessitaFollowup, setNecessitaFollowup] = useState(false);
  const [dataProximoAtendimento, setDataProximoAtendimento] = useState('');

  const [abaAtiva, setAbaAtiva] = useState<'atendimentos' | 'encaminhamentos'>('atendimentos');
  const [stats, setStats] = useState<any>(null);
  const [alertasDemora, setAlertasDemora] = useState<any>(null);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<any[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  
  useEffect(() => {
    loadAtendimentos();
    loadStats();
  }, [filtroTipo, filtroStatus, filtroPrioridade, abaAtiva]);

  const loadStats = async () => {
    if (!token) return;
    try {
      const data = await api.atendimentos.stats(token);
      setStats(data);
      
      // Carregar alertas de demora
      const alertas = await api.atendimentos.alertasDemora(token, 30);
      setAlertasDemora(alertas);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const loadHistorico = async (atendimentoId: number) => {
    if (!token) return;
    try {
      const data = await api.atendimentos.historico(token, atendimentoId);
      setHistoricoSelecionado(data);
      setShowHistorico(true);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const loadAtendimentos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = { limit: 500 }; // Aumentamos o limite para garantir que pegamos tudo
      
      if (filtroTipo !== 'todos') params.tipo = filtroTipo;
      if (filtroStatus !== 'todos') params.status = filtroStatus;
      if (filtroPrioridade !== 'todos') params.prioridade = filtroPrioridade;
      
      const data = await api.atendimentos.listAll(token, params);
      
      // Filtragem lógica para a aba de encaminhamentos
      if (abaAtiva === 'encaminhamentos') {
        // Aceita tanto boolean true quanto número 1
        setAtendimentos(data.filter((a: any) => a.necessita_encaminhamento == true || a.necessita_encaminhamento === 1));
      } else {
        setAtendimentos(data);
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBuscaAluno = async () => {
    if (!buscaAluno.trim() || buscaAluno.length < 2) return;
    if (!token) return;
    setLoadingBusca(true);
    try {
      const data = await api.alunos.buscar(token, buscaAluno, 10);
      setAlunosFiltrados(data);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    } finally {
      setLoadingBusca(false);
    }
  };

  const handleSelectAluno = (aluno: any) => {
    setAlunoSelecionado({ matricula: aluno.matricula, nome: aluno.nome });
    setBuscaAluno(`${aluno.nome} (${aluno.matricula})`);
    setAlunosFiltrados([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoSelecionado || !descricao.trim()) {
      addToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Selecione o aluno e preencha a descrição' });
      return;
    }
    if (!token) return;

    try {
      const payload = {
        tipo_atendimento: tipoAtendimento,
        status: statusAtend,
        data_atendimento: dataAtendimento,
        descricao,
        usuario_id: user?.id || 1,
        local: local || undefined,
        observacoes: observacoes || undefined,
        prioridade,
        necessita_encaminhamento: necessitaEncaminhamento,
        tipo_encaminhamento: necessitaEncaminhamento ? tipoEncaminhamento || undefined : undefined,
        necessita_followup: necessitaFollowup,
        data_proximo_atendimento: necessitaFollowup && dataProximoAtendimento ? dataProximoAtendimento : undefined,
      };

      if (editId) {
        await api.atendimentos.update(token, alunoSelecionado.matricula, editId, payload);
        addToast({ type: 'success', title: 'Atualizado', message: 'Atendimento atualizado' });
      } else {
        await api.atendimentos.create(token, alunoSelecionado.matricula, payload);
        addToast({ type: 'success', title: 'Criado', message: 'Atendimento registrado' });
      }

      resetForm();
      loadAtendimentos();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const resetForm = () => {
    setAlunoSelecionado(null);
    setBuscaAluno('');
    setTipoAtendimento('PSICOLOGICO');
    setStatusAtend('AGENDADO');
    setDataAtendimento(new Date().toISOString().split('T')[0]);
    setLocal('');
    setDescricao('');
    setObservacoes('');
    setPrioridade('MEDIA');
    setNecessitaEncaminhamento(false);
    setTipoEncaminhamento('');
    setNecessitaFollowup(false);
    setDataProximoAtendimento('');
    setShowForm(false);
    setEditId(null);
  };

  const handleEdit = (at: Atendimento) => {
    setEditId(at.id);
    setBuscaAluno(at.aluno_matricula);
    setAlunoSelecionado({ matricula: at.aluno_matricula, nome: at.aluno_matricula });
    setTipoAtendimento(at.tipo_atendimento);
    setStatusAtend(at.status);
    setDataAtendimento(at.data_atendimento);
    setLocal(at.local || '');
    setDescricao(at.descricao);
    setObservacoes(at.observacoes || '');
    setPrioridade(at.prioridade);
    setNecessitaEncaminhamento(at.necessita_encaminhamento);
    setTipoEncaminhamento(at.tipo_encaminhamento || '');
    setNecessitaFollowup(at.necessita_followup);
    setDataProximoAtendimento(at.data_proximo_atendimento || '');
    setShowForm(true);
  };

  const handleStatusEncaminhamento = async (id: number, matricula: string, novoStatus: string) => {
    if (!token) return;
    try {
      await api.atendimentos.update(token, matricula, id, { status_encaminhamento: novoStatus });
      addToast({ type: 'success', title: 'Status atualizado', message: `Encaminhamento: ${novoStatus}` });
      loadAtendimentos();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const handleDelete = async (id: number, matricula: string) => {
    if (!confirm('Tem certeza que deseja excluir este atendimento?')) return;
    if (!token) return;
    try {
      await api.atendimentos.delete(token, matricula, id);
      addToast({ type: 'success', title: 'Excluído', message: 'Atendimento excluído' });
      loadAtendimentos();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const getTipoIcon = (tipo: string) => {
    const found = TIPOS_ATENDIMENTO.find(t => t.value === tipo);
    return found ? found.icon : '📋';
  };

  const getStatusColor = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? found.color : 'bg-gray-100 text-gray-700';
  };

  const getPrioridadeColor = (prioridade: string) => {
    const found = PRIORIDADE_OPTIONS.find(p => p.value === prioridade);
    return found ? found.color : 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
            Atendimentos / Ocorrências
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Registre atendimentos psicológicos, sociais, disciplinares e conversas informais
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5" /> Novo Atendimento
        </button>
      </div>

      {/* Seletor de Abas */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setAbaAtiva('atendimentos')}
          className={cn(
            "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]",
            abaAtiva === 'atendimentos'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400"
          )}
        >
          📋 Atendimentos
        </button>
        <button
          onClick={() => setAbaAtiva('encaminhamentos')}
          className={cn(
            "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] flex items-center gap-2",
            abaAtiva === 'encaminhamentos'
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400"
          )}
        >
          🔗 Encaminhamentos Externos
          {stats?.com_encaminhamento > 0 && (
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">
              {stats.com_encaminhamento}
            </span>
          )}
        </button>
      </div>

      {/* Cards de Resumo */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-2xl">📊</div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Total</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-2xl">🚨</div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Urgentes</p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.por_prioridade?.URGENTE || 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-2xl">⏳</div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Pendentes</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {(stats.por_status?.AGENDADO || 0) + (stats.por_status?.EM_ANDAMENTO || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-2xl">📋</div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Follow-up</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.com_followup || 0}</p>
            </div>
          </div>

          {/* Card de Alerta de Demora */}
          {alertasDemora?.total_alertas > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4 flex items-center gap-4 animate-pulse">
              <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg text-2xl">⚠️</div>
              <div>
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Demora Excessiva</p>
                <p className="text-2xl font-black text-red-700 dark:text-red-300">{alertasDemora.total_alertas}</p>
                <p className="text-xs text-red-500">+30 dias</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
              <option value="todos">Todos</option>
              {TIPOS_ATENDIMENTO.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
              <option value="todos">Todos</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Prioridade</label>
            <select value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
              <option value="todos">Todas</option>
              {PRIORIDADE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6">
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">{editId ? 'Editar Atendimento' : 'Novo Atendimento'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Busca Aluno */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Aluno *</label>
                <div className="flex gap-2">
                  <input type="text" value={buscaAluno} onChange={(e) => { setBuscaAluno(e.target.value); if (e.target.value.length < 2) setAlunosFiltrados([]); }} onKeyDown={(e) => e.key === 'Enter' && handleBuscaAluno()} placeholder="Buscar aluno..." className="flex-1 px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" required />
                  <button type="button" onClick={handleBuscaAluno} disabled={loadingBusca || buscaAluno.length < 2} className="px-4 py-3 bg-indigo-600 text-white rounded-xl">Buscar</button>
                </div>
                {alunosFiltrados.length > 0 && (
                  <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {alunosFiltrados.map(a => (
                      <button key={a.matricula} type="button" onClick={() => handleSelectAluno(a)} className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-700 last:border-0">
                        <div className="font-medium">{a.nome}</div>
                        <div className="text-xs text-gray-500">Mat: {a.matricula}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo *</label>
                  <select value={tipoAtendimento} onChange={(e) => setTipoAtendimento(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" required>
                    {TIPOS_ATENDIMENTO.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select value={statusAtend} onChange={(e) => setStatusAtend(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Prioridade</label>
                  <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
                    {PRIORIDADE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data *</label>
                  <input type="date" value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Local</label>
                  <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Sala de atendimento psicológico" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Descrição *</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o atendimento/ocorrência..." rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Observações</label>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações adicionais..." rows={2} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  <input type="checkbox" id="encaminhamento" checked={necessitaEncaminhamento} onChange={(e) => setNecessitaEncaminhamento(e.target.checked)} className="w-5 h-5" />
                  <label htmlFor="encaminhamento" className="text-sm font-medium">Necessita encaminhamento externo</label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  <input type="checkbox" id="followup" checked={necessitaFollowup} onChange={(e) => setNecessitaFollowup(e.target.checked)} className="w-5 h-5" />
                  <label htmlFor="followup" className="text-sm font-medium">Necessita follow-up</label>
                </div>
              </div>

              {necessitaEncaminhamento && (
                <input type="text" value={tipoEncaminhamento} onChange={(e) => setTipoEncaminhamento(e.target.value)} placeholder="Tipo de encaminhamento (CAPS, UBS, Conselho Tutelar...)" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
              )}

              {necessitaFollowup && (
                <input type="date" value={dataProximoAtendimento} onChange={(e) => setDataProximoAtendimento(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
              )}

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> {editId ? 'Atualizar' : 'Registrar'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl font-bold">Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : atendimentos.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-300 font-medium">Nenhum atendimento registrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {atendimentos.map((at) => (
              <div key={at.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-2xl">{getTipoIcon(at.tipo_atendimento)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-white">{at.aluno_matricula}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", getStatusColor(at.status))}>{at.status}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", getPrioridadeColor(at.prioridade))}>{at.prioridade}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{at.descricao.substring(0, 100)}{at.descricao.length > 100 ? '...' : ''}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{new Date(at.data_atendimento).toLocaleDateString('pt-BR')}{at.necessita_encaminhamento && ' • ⚠️ Encaminhamento'}{at.necessita_followup && ' • 📋 Follow-up'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:ml-4">
                  {abaAtiva === 'encaminhamentos' ? (
                    <>
                      <button 
                        onClick={() => loadHistorico(at.id)} 
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                        title="Ver histórico"
                      >
                        📜 Histórico
                      </button>
                      <select
                        value={at.status_encaminhamento || 'SOLICITADO'}
                        onChange={(e) => handleStatusEncaminhamento(at.id, at.aluno_matricula, e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                      >
                        <option value="SOLICITADO">📋 Solicitado</option>
                        <option value="EM_ATENDIMENTO">⏳ Em Atendimento</option>
                        <option value="CONCLUIDO">✅ Concluído</option>
                        <option value="CANCELADO">❌ Cancelado</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(at)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(at.id, at.aluno_matricula)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Histórico */}
      <AnimatePresence>
        {showHistorico && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowHistorico(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  📜 Histórico de Mudanças
                </h3>
                <button onClick={() => setShowHistorico(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {historicoSelecionado.length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400 text-center py-8">Nenhuma mudança registrada.</p>
              ) : (
                <div className="space-y-3">
                  {historicoSelecionado.map((h, idx) => (
                    <div key={h.id || idx} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                          {h.usuario || 'Desconhecido'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {h.data_mudanca ? new Date(h.data_mudanca).toLocaleString('pt-BR') : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          h.status_anterior === 'SOLICITADO' ? 'bg-yellow-100 text-yellow-700' :
                          h.status_anterior === 'EM_ATENDIMENTO' ? 'bg-blue-100 text-blue-700' :
                          h.status_anterior === 'CONCLUIDO' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {h.status_anterior || '—'}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          h.status_novo === 'SOLICITADO' ? 'bg-yellow-100 text-yellow-700' :
                          h.status_novo === 'EM_ATENDIMENTO' ? 'bg-blue-100 text-blue-700' :
                          h.status_novo === 'CONCLUIDO' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {h.status_novo}
                        </span>
                      </div>
                      {h.observacoes && (
                        <p className="text-xs text-gray-600 dark:text-slate-400 mt-2 italic">
                          "{h.observacoes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
