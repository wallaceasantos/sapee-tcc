/**
 * Página Central de Comunicações - SAPEE DEWAS
 * 
 * Funcionalidades:
 * - Visualizar todas as comunicações/notificações
 * - Criar novas comunicações manuais
 * - Gerenciar templates de mensagens
 * - Visualizar lembretes agendados
 * - Estatísticas de envio
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Filter, Send, Clock, AlertTriangle, CheckCircle, XCircle, X, BookOpen, Phone, Mail, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { formatarTelefone, validarTelefone } from '../utils/telefone';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface Comunicacao {
  id: number;
  aluno_matricula: string;
  aluno?: { nome: string };
  destinatario_tipo: string;
  destinatario_nome: string;
  destinatario_contato?: string;
  tipo_comunicacao: string;
  canal: string;
  assunto?: string;
  mensagem: string;
  template_id?: string;
  status: string;
  data_envio?: string;
  data_leitura?: string;
  eh_lembrete: boolean;
  data_agendada?: string;
  recebeu_resposta: boolean;
  criado_at?: string;
}

const TIPOS_COMUNICACAO = [
  { value: 'FALTAS', label: 'Faltas', icon: '📋' },
  { value: 'RISCO', label: 'Risco de Evasão', icon: '⚠️' },
  { value: 'ATENDIMENTO', label: 'Atendimento', icon: '🤝' },
  { value: 'LEMBRETE', label: 'Lembrete', icon: '⏰' },
  { value: 'MANUAL', label: 'Manual', icon: '✉️' },
  { value: 'ENCAMINHAMENTO', label: 'Encaminhamento', icon: '🔗' },
];

const CANAIS = [
  { value: 'WHATSAPP', label: 'WhatsApp', icon: <Phone className="w-4 h-4" /> },
  { value: 'SMS', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'EMAIL', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { value: 'SISTEMA', label: 'Sistema', icon: <MessageCircle className="w-4 h-4" /> },
];

const STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'ENVIADA', label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  { value: 'ENTREGUE', label: 'Entregue', color: 'bg-green-100 text-green-700' },
  { value: 'LIDA', label: 'Lida', color: 'bg-purple-100 text-purple-700' },
  { value: 'FALHA', label: 'Falha', color: 'bg-red-100 text-red-700' },
  { value: 'CANCELADA', label: 'Cancelada', color: 'bg-gray-100 text-gray-700' },
];

export default function CentralComunicacoes() {
  const { token, user } = useAuth();
  const { addToast } = useToast();

  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCanal, setFiltroCanal] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroLembretes, setFiltroLembretes] = useState<boolean | undefined>(undefined);

  // Form
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<{ matricula: string; nome: string } | null>(null);
  const [alunosFiltrados, setAlunosFiltrados] = useState<any[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [tipoComunicacao, setTipoComunicacao] = useState('MANUAL');
  const [canal, setCanal] = useState('SISTEMA');
  const [destinatarioTipo, setDestinatarioTipo] = useState('RESPONSAVEL');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioContato, setDestinatarioContato] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [ehLembrete, setEhLembrete] = useState(false);
  const [dataAgendada, setDataAgendada] = useState('');

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<Comunicacao | null>(null);

  useEffect(() => {
    loadComunicacoes();
    loadStats();
    loadTemplates();
  }, [filtroTipo, filtroCanal, filtroStatus, filtroLembretes]);

  const loadComunicacoes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (filtroTipo !== 'todos') params.tipo = filtroTipo;
      if (filtroCanal !== 'todos') params.canal = filtroCanal;
      if (filtroStatus !== 'todos') params.status = filtroStatus;
      if (filtroLembretes !== undefined) params.eh_lembrete = filtroLembretes;
      const data = await api.comunicacoes.list(token, params);
      setComunicacoes(data);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!token) return;
    try {
      const data = await api.comunicacoes.stats(token);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadTemplates = async () => {
    if (!token) return;
    try {
      const data = await api.comunicacoes.templates.list(token);
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
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
    
    // Auto-preencher responsável com feedback
    if (aluno.nome_responsavel_1) {
      setDestinatarioNome(aluno.nome_responsavel_1);
      setDestinatarioContato(aluno.telefone_responsavel_1 || aluno.email_responsavel_1 || '');
      addToast({ 
        type: 'success', 
        title: 'Dados preenchidos', 
        message: `Responsável "${aluno.nome_responsavel_1}" selecionado automaticamente` 
      });
    }
  };

  const handleSelectTemplate = async (template: any) => {
    if (!alunoSelecionado) {
      addToast({ type: 'warning', title: 'Aluno não selecionado', message: 'Selecione um aluno primeiro para usar templates.' });
      return;
    }

    let conteudo = template.conteudo;

    // Buscar dados adicionais do aluno para preencher variáveis
    try {
      // Buscar faltas do aluno
      const faltasResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${alunoSelecionado.matricula}/faltas`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      let qtdFaltas = 0;
      let ultimaDisciplina = 'disciplina';
      
      if (faltasResponse.ok) {
        const faltas = await faltasResponse.json();
        qtdFaltas = Array.isArray(faltas) ? faltas.length : 0;
        if (Array.isArray(faltas) && faltas.length > 0) {
          const ultimaFalta = faltas[0]; // Ordenado por data desc
          ultimaDisciplina = ultimaFalta.disciplina || 'disciplina';
        }
      }
      
      // Substituir variáveis com valores reais
      conteudo = conteudo
        .replace(/{nome_aluno}/g, alunoSelecionado.nome)
        .replace(/{nome_responsavel}/g, destinatarioNome || 'responsável')
        .replace(/{matricula}/g, alunoSelecionado.matricula)
        .replace(/{qtd_faltas}/g, String(qtdFaltas))
        .replace(/{disciplina}/g, ultimaDisciplina)
        .replace(/{risco_evasao}/g, 'consultar');

    } catch (error) {
      console.error('Erro ao buscar dados para template:', error);
      // Mesmo com erro, substitui o básico e placeholders com valores padrão
      conteudo = conteudo
        .replace(/{nome_aluno}/g, alunoSelecionado.nome)
        .replace(/{nome_responsavel}/g, destinatarioNome || 'responsável')
        .replace(/{matricula}/g, alunoSelecionado.matricula)
        .replace(/{qtd_faltas}/g, 'consultar')
        .replace(/{disciplina}/g, 'disciplinas do curso');

      addToast({ type: 'warning', title: 'Dados parciais', message: 'Não foi possível buscar as faltas automaticamente. Confira antes de enviar.' });
    }

    setMensagem(conteudo);
    setTipoComunicacao(template.tipo_comunicacao);
    setCanal(template.canal);
    setShowTemplates(false);
    addToast({ type: 'success', title: 'Template aplicado', message: 'Revise a mensagem antes de enviar' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoSelecionado || !mensagem.trim()) {
      addToast({ type: 'warning', title: 'Campos obrigatórios', message: 'Selecione o aluno e preencha a mensagem' });
      return;
    }
    if (destinatarioContato && !validarTelefone(destinatarioContato)) {
      addToast({ type: 'warning', title: 'Telefone inválido', message: 'O telefone deve ter 10 ou 11 dígitos' });
      return;
    }
    if (!token) return;

    try {
      const payload = {
        aluno_matricula: alunoSelecionado.matricula,
        destinatario_tipo: destinatarioTipo,
        destinatario_nome: destinatarioNome || alunoSelecionado.nome,
        destinatario_contato: destinatarioContato || undefined,
        tipo_comunicacao: tipoComunicacao,
        canal,
        assunto: assunto || undefined,
        mensagem,
        eh_lembrete: ehLembrete,
        data_agendada: ehLembrete && dataAgendada ? dataAgendada : undefined,
      };

      await api.comunicacoes.create(token, payload);
      addToast({ type: 'success', title: 'Enviado', message: 'Comunicação registrada com sucesso' });
      resetForm();
      loadComunicacoes();
      loadStats();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const resetForm = () => {
    setAlunoSelecionado(null);
    setBuscaAluno('');
    setDestinatarioNome('');
    setDestinatarioContato('');
    setAssunto('');
    setMensagem('');
    setTipoComunicacao('MANUAL');
    setCanal('SISTEMA');
    setDestinatarioTipo('RESPONSAVEL');
    setEhLembrete(false);
    setDataAgendada('');
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? found.color : 'bg-gray-100 text-gray-700';
  };

  const getTipoIcon = (tipo: string) => {
    const found = TIPOS_COMUNICACAO.find(t => t.value === tipo);
    return found ? found.icon : '📋';
  };

  const getCanalIcon = (canal: string) => {
    const found = CANAIS.find(c => c.value === canal);
    return found ? found.icon : null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
            Central de Comunicações
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Gerencie notificações, lembretes e comunicações com responsáveis
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200"
          >
            <BookOpen className="w-4 h-4" /> Templates
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Nova Comunicação
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3">
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Total</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3">
            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase">Pendentes</p>
            <p className="text-2xl font-black text-yellow-600">{stats.pendentes}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3">
            <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Falhas</p>
            <p className="text-2xl font-black text-red-600">{stats.falhas}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">WhatsApp</p>
            <p className="text-2xl font-black text-blue-600">{stats.por_canal?.WHATSAPP || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3">
            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Lidas</p>
            <p className="text-2xl font-black text-purple-600">{stats.por_status?.LIDA || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3">
            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Lembretes Hoje</p>
            <p className="text-2xl font-black text-green-600">{stats.lembretes_hoje}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
            <option value="todos">Todos os Tipos</option>
            {TIPOS_COMUNICACAO.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
          <select value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
            <option value="todos">Todos os Canais</option>
            {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
            <option value="todos">Todos os Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filtroLembretes === undefined ? 'todos' : filtroLembretes ? 'sim' : 'nao'} onChange={(e) => setFiltroLembretes(e.target.value === 'todos' ? undefined : e.target.value === 'sim')} className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm">
            <option value="todos">Todos</option>
            <option value="sim">Apenas Lembretes</option>
            <option value="nao">Exceto Lembretes</option>
          </select>
        </div>
      </div>

      {/* Formulário */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white">Nova Comunicação</h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
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
                        <div className="text-xs text-gray-500">Mat: {a.matricula} {a.nome_responsavel_1 && `• Resp: ${a.nome_responsavel_1}`}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo *</label>
                  <select value={tipoComunicacao} onChange={(e) => setTipoComunicacao(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
                    {TIPOS_COMUNICACAO.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Canal *</label>
                  <select value={canal} onChange={(e) => setCanal(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
                    {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Destinatário *</label>
                  <select value={destinatarioTipo} onChange={(e) => setDestinatarioTipo(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
                    <option value="RESPONSAVEL">Responsável</option>
                    <option value="ALUNO">Aluno</option>
                    <option value="COORDENADOR">Coordenador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome do Destinatário</label>
                  <input type="text" value={destinatarioNome} onChange={(e) => setDestinatarioNome(e.target.value)} placeholder="Ex: Maria Silva (Mãe)" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Contato (Telefone/Email)</label>
                  <input type="tel" value={destinatarioContato} onChange={(e) => setDestinatarioContato(formatarTelefone(e.target.value))} placeholder="(92) 99999-9999" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
                  {destinatarioContato && !validarTelefone(destinatarioContato) && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">⚠️ Telefone deve ter 10 ou 11 dígitos</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Assunto</label>
                <input type="text" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Assunto da mensagem (opcional)" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Mensagem *</label>
                  <button type="button" onClick={() => setShowTemplates(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-bold">Usar Template</button>
                </div>
                <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Digite a mensagem. Use variáveis: {nome_aluno}, {nome_responsavel}, {qtd_faltas}, {disciplina}" rows={4} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" required />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={ehLembrete} onChange={(e) => setEhLembrete(e.target.checked)} className="w-5 h-5" />
                  <span className="text-sm font-medium">É um lembrete agendado?</span>
                </label>
                {ehLembrete && (
                  <input type="datetime-local" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl" />
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" /> {ehLembrete ? 'Agendar' : 'Enviar'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl font-bold">Cancelar</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Comunicações */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : comunicacoes.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-300 font-medium">Nenhuma comunicação registrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {comunicacoes.map((com) => (
              <div key={com.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-2xl mt-0.5 shrink-0">{getTipoIcon(com.tipo_comunicacao)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-900 dark:text-white">{com.destinatario_nome}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", getStatusColor(com.status))}>{com.status}</span>
                        {com.eh_lembrete && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">⏰ Lembrete</span>}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words line-clamp-2">{com.mensagem}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-slate-500">
                        <span className="font-medium">{com.aluno_matricula}</span>
                        <span>•</span>
                        <span>{com.criado_at ? new Date(com.criado_at).toLocaleString('pt-BR') : ''}</span>
                        <span>•</span>
                        <span>{com.canal}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMensagemSelecionada(com)}
                    className="shrink-0 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    👁️ Ver completa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Templates */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTemplates(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">📝 Templates de Mensagens</h3>
                <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              {templates.length === 0 ? (
                <p className="text-gray-500 dark:text-slate-400 text-center py-8">Nenhum template cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => handleSelectTemplate(t)} className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900 dark:text-white">{t.nome}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">{t.canal}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-400 italic">{t.conteudo.substring(0, 100)}...</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Mensagem Completa */}
      <AnimatePresence>
        {mensagemSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setMensagemSelecionada(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getTipoIcon(mensagemSelecionada.tipo_comunicacao)}</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mensagem Completa</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{getCanalIcon(mensagemSelecionada.canal)} {mensagemSelecionada.canal}</p>
                  </div>
                </div>
                <button onClick={() => setMensagemSelecionada(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Info */}
              <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase">Destinatário</p>
                    <p className="font-bold text-gray-900 dark:text-white">{mensagemSelecionada.destinatario_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase">Aluno</p>
                    <p className="font-bold text-gray-900 dark:text-white">{mensagemSelecionada.aluno_matricula}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase">Status</p>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-1", getStatusColor(mensagemSelecionada.status))}>{mensagemSelecionada.status}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase">Data/Hora</p>
                    <p className="font-bold text-gray-900 dark:text-white">{mensagemSelecionada.criado_at ? new Date(mensagemSelecionada.criado_at).toLocaleString('pt-BR') : ''}</p>
                  </div>
                </div>
              </div>

              {/* Mensagem */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Conteúdo da Mensagem</p>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">{mensagemSelecionada.mensagem}</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(mensagemSelecionada.mensagem);
                    addToast({ type: 'success', title: 'Copiado!', message: 'Mensagem copiada para a área de transferência' });
                  }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 text-sm"
                >
                  📋 Copiar Mensagem
                </button>
                <button
                  onClick={() => setMensagemSelecionada(null)}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
