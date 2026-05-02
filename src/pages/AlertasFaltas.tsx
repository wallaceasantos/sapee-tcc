/**
 * Página de Gestão de Alertas de Faltas Consecutivas
 * SAPEE DEWAS - Sistema de Alertas de Faltas
 * 
 * Melhorias implementadas:
 * - Cards de estatísticas no topo
 * - Busca por nome/matricula
 * - Modal completo para registrar ações
 * - Botão "Em Análise"
 * - Melhor parse de disciplinas
 * - Layout responsivo aprimorado
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Edit,
  Save,
  BarChart3,
  Users,
  AlertCircle,
  X,
  MessageSquare,
  GraduationCap,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import IntervencaoModal from '../components/IntervencaoModal';
import api from '../services/api';

// ============================================
// INTERFACES
// ============================================

interface Alerta {
  id: number;
  aluno_matricula: string;
  aluno?: {
    nome: string;
    curso?: {
      nome: string;
    };
    nome_responsavel_1?: string;
    parentesco_responsavel_1?: string;
    telefone_responsavel_1?: string;
    email_responsavel_1?: string;
    nome_responsavel_2?: string;
    parentesco_responsavel_2?: string;
    telefone_responsavel_2?: string;
  };
  tipo_alerta: '3_FALTAS' | '5_FALTAS' | '10_FALTAS';
  quantidade_faltas: number;
  data_inicio_faltas: string;
  data_fim_faltas: string;
  disciplinas_afetadas: string;
  status: 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO' | 'IGNORADO';
  responsavel_id?: number;
  responsavel?: {
    id: number;
    nome: string;
    email: string;
  };
  data_limite?: string;
  contato_responsavel_data?: string;
  contato_responsavel_meio?: string;
  contato_responsavel_obs?: string;
  historico?: AlertaHistorico[];
  acoes_tomadas?: string;
  resolvido_por?: number;
  data_resolucao?: string;
  criado_at: string;
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
  ativo?: boolean;
  role?: {
    nome: string;
  };
}

interface FaltasStats {
  total_alertas_pendentes: number;
  total_alertas_3_faltas: number;
  total_alertas_5_faltas: number;
  total_alertas_10_faltas: number;
  alunos_com_faltas_consecutivas: number;
}

interface AlertaHistorico {
  id: number;
  alerta_id: number;
  acao: string;
  descricao: string;
  usuario_id?: number;
  usuario?: {
    id: number;
    nome: string;
    email: string;
  };
  criado_at: string;
}

// ============================================
// CONFIGURAÇÕES
// ============================================

const statusConfig = {
  PENDENTE: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pendente', icon: Clock },
  EM_ANALISE: { color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400', label: 'Em Análise', icon: Search },
  RESOLVIDO: { color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400', label: 'Resolvido', icon: CheckCircle },
  IGNORADO: { color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400', label: 'Ignorado', icon: XCircle },
};

const tipoAlertaConfig = {
  '3_FALTAS': { color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', label: '3 Faltas', priority: 'BAIXA', icon: AlertCircle },
  '5_FALTAS': { color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', label: '5 Faltas', priority: 'MÉDIA', icon: AlertTriangle },
  '10_FALTAS': { color: 'text-red-600 bg-red-50 dark:bg-red-900/20', label: '10 Faltas', priority: 'URGENTE', icon: AlertTriangle },
};

// Sugestões automáticas de intervenção por tipo de alerta
const sugestoesPorTipo: Record<string, { tipo: string; prioridade: string; descricao: string }[]> = {
  '3_FALTAS': [
    { tipo: 'Reunião com Aluno', prioridade: 'MEDIA', descricao: 'Conversar com o aluno sobre as faltas e identificar motivos' },
  ],
  '5_FALTAS': [
    { tipo: 'Acompanhamento Pedagógico', prioridade: 'ALTA', descricao: 'Avaliar desempenho acadêmico e criar plano de recuperação' },
    { tipo: 'Reunião com Responsáveis', prioridade: 'ALTA', descricao: 'Comunicar situação e alinhar ações de apoio' },
  ],
  '10_FALTAS': [
    { tipo: 'Encaminhamento Assistência Social', prioridade: 'URGENTE', descricao: 'Avaliar situação socioeconômica e familiar do aluno' },
    { tipo: 'Reunião Urgente com Responsáveis', prioridade: 'URGENTE', descricao: 'Reunião imediata para definir plano de ação' },
    { tipo: 'Encaminhamento Pedagógico Especializado', prioridade: 'URGENTE', descricao: 'Avaliar necessidade de acompanhamento especializado' },
  ],
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AlertasFaltas() {
  const { addToast } = useToast();
  const { token } = useAuth();

  // Estados de dados
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [faltasStats, setFaltasStats] = useState<FaltasStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [comparativoMensal, setComparativoMensal] = useState<any>(null);
  const [dashboardEfetividade, setDashboardEfetividade] = useState<any>(null);
  
  // Estados de filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroCurso, setFiltroCurso] = useState<string>('');
  const [busca, setBusca] = useState<string>('');
  const [cursos, setCursos] = useState<Array<{ id: number; nome: string }>>([]);

  // Estados para ações em lote
  const [alertasSelecionados, setAlertasSelecionados] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  // Estados de edição
  const [alertaEditando, setAlertaEditando] = useState<number | null>(null);
  const [showModalAcao, setShowModalAcao] = useState(false);
  const [acoesTomadas, setAcoesTomadas] = useState('');
  const [novoStatus, setNovoStatus] = useState<string>('');

  // Estados para criação de intervenção
  const [showIntervencaoModal, setShowIntervencaoModal] = useState(false);
  const [alunoParaIntervencao, setAlunoParaIntervencao] = useState<any>(null);
  const [alertaSelecionadoParaIntervencao, setAlertaSelecionadoParaIntervencao] = useState<Alerta | null>(null);

  // ============================================
  // CARREGAR DADOS
  // ============================================

  useEffect(() => {
    loadAlertas();
    loadStats();
    loadUsuarios();
    loadCursos();
    loadComparativoMensal();
    loadDashboardEfetividade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAlertas = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroTipo) params.set('tipo_alerta', filtroTipo);
      if (filtroCurso) params.set('curso_id', filtroCurso);

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

  const loadStats = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/dashboard/faltas-stats`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setFaltasStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  };

  const loadUsuarios = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/usuarios`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setUsuarios(data.filter((u: Usuario) => u.ativo !== false));
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadCursos = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/cursos`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setCursos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const loadComparativoMensal = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/comparativo-mensal`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setComparativoMensal(data);
      }
    } catch (error) {
      console.error('Erro ao carregar comparativo mensal:', error);
    }
  };

  const loadDashboardEfetividade = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/dashboard-efetividade`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setDashboardEfetividade(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard de efetividade:', error);
    }
  };

  // ============================================
  // EXPORTAR PDF
  // ============================================

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast({ type: 'error', title: 'Erro', message: 'Pop-up bloqueado. Permita pop-ups para este site.' });
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Alertas de Faltas - ${new Date().toLocaleDateString('pt-BR')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #1e40af; margin-top: 30px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .date { color: #666; font-size: 14px; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat-box { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
          .stat-box h3 { margin: 0; font-size: 24px; color: #1e40af; }
          .stat-box p { margin: 5px 0 0; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #2563eb; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
          tr:nth-child(even) { background: #f9fafb; }
          .status-pendente { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
          .status-analise { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
          .status-resolvido { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
          .status-ignorado { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Relatório de Alertas de Faltas Consecutivas</h1>
          <div class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>

        <div class="stats">
          <div class="stat-box"><h3>${faltasStats?.total_alertas_pendentes || 0}</h3><p>Pendentes</p></div>
          <div class="stat-box"><h3>${faltasStats?.total_alertas_3_faltas || 0}</h3><p>3 Faltas</p></div>
          <div class="stat-box"><h3>${faltasStats?.total_alertas_5_faltas || 0}</h3><p>5 Faltas</p></div>
          <div class="stat-box"><h3>${faltasStats?.total_alertas_10_faltas || 0}</h3><p>10 Faltas</p></div>
        </div>

        <h2>Alertas (${alertasFiltrados.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Matrícula</th>
              <th>Tipo</th>
              <th>Faltas</th>
              <th>Status</th>
              <th>Responsável</th>
              <th>Contato</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            ${alertasFiltrados.map(a => `
              <tr>
                <td><strong>${a.aluno?.nome || 'N/A'}</strong></td>
                <td>${a.aluno_matricula}</td>
                <td>${a.tipo_alerta.replace('_', ' ')}</td>
                <td style="text-align:center; font-weight:bold;">${a.quantidade_faltas}</td>
                <td><span class="status-${a.status.toLowerCase().replace('_', '-')}">${a.status.replace('_', ' ')}</span></td>
                <td>${a.responsavel?.nome || a.aluno?.nome_responsavel_1 || '-'}</td>
                <td>${a.contato_responsavel_meio || '-'} em ${a.contato_responsavel_data ? new Date(a.contato_responsavel_data).toLocaleDateString('pt-BR') : '-'}</td>
                <td>${new Date(a.criado_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar</div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);

    addToast({ type: 'success', title: 'PDF Gerado', message: 'Relatório aberto para impressão/salvamento.' });
  };

  // ============================================
  // AÇÕES
  // ============================================

  const handleAbrirModalAcao = (alerta: Alerta) => {
    // Atualizar estado local com dados completos do alerta
    setAlertas(prev => prev.map(a =>
      a.id === alerta.id ? { ...alerta } : a
    ));
    setAlertaEditando(alerta.id);
    setAcoesTomadas(alerta.acoes_tomadas || '');
    setNovoStatus(alerta.status);
    setShowModalAcao(true);
  };

  const handleAtualizarStatus = async () => {
    if (!token || alertaEditando === null) return;

    const alertaAtual = alertas.find(a => a.id === alertaEditando);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/${alertaEditando}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: novoStatus,
            acoes_tomadas: acoesTomadas || undefined,
            responsavel_id: alertaAtual?.responsavel_id || undefined,
            contato_responsavel_data: alertaAtual?.contato_responsavel_data || undefined,
            contato_responsavel_meio: alertaAtual?.contato_responsavel_meio || undefined,
            contato_responsavel_obs: alertaAtual?.contato_responsavel_obs || undefined,
          }),
        }
      );

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Atualizado',
          message: `Alerta ${novoStatus.toLowerCase()} com sucesso`
        });

        setShowModalAcao(false);
        setAlertaEditando(null);
        setAcoesTomadas('');
        setNovoStatus('');
        await loadAlertas();
        await loadStats();
      } else {
        const error = await response.json();
        addToast({
          type: 'error',
          title: 'Erro ao atualizar',
          message: error.detail || 'Erro desconhecido'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar',
        message: error.message
      });
    }
  };

  // ============================================
  // CRIAR INTERVENÇÃO
  // ============================================

  const handleCriarIntervencao = (alerta: Alerta) => {
    setAlertaSelecionadoParaIntervencao(alerta);
    setAlunoParaIntervencao({
      matricula: alerta.aluno_matricula,
      nome: alerta.aluno?.nome || alerta.aluno_matricula,
      frequencia: Math.max(0, 100 - alerta.quantidade_faltas * 5), // Estimativa
      curso: alerta.aluno?.curso?.nome || 'N/A'
    });
    setShowIntervencaoModal(true);
  };

  const handleSaveIntervencao = async (data: any) => {
    if (!token || !alunoParaIntervencao) return;

    try {
      const { matricula, ...intervencaoData } = data;
      await api.intervencoes.create(token, matricula || alunoParaIntervencao.matricula, intervencaoData);

      addToast({
        type: 'success',
        title: 'Intervenção criada!',
        message: 'Intervenção registrada com sucesso'
      });

      setShowIntervencaoModal(false);
      setAlunoParaIntervencao(null);
      setAlertaSelecionadoParaIntervencao(null);

      // Atualizar status do alerta para EM_ANALISE
      const alertaAtual = alertas.find(a => a.aluno_matricula === alunoParaIntervencao.matricula);
      if (alertaAtual && alertaAtual.status === 'PENDENTE') {
        await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/${alertaAtual.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: 'EM_ANALISE',
              acoes_tomadas: 'Intervenção pedagógica criada automaticamente a partir do alerta de faltas.'
            }),
          }
        );

        // Registrar no histórico
        await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/${alertaAtual.id}/historico`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              acao: 'INTERVENCAO_CRIADA',
              descricao: `Intervenção pedagógica criada a partir deste alerta de faltas.`
            }),
          }
        );
      }

      await loadAlertas();
      await loadStats();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao criar',
        message: error.message || 'Erro ao criar intervenção'
      });
    }
  };

  // ============================================
  // AÇÕES EM LOTE
  // ============================================

  const toggleSelecaoAlerta = (id: number) => {
    setAlertasSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      setShowBatchActions(novo.size > 0);
      return novo;
    });
  };

  const selecionarTodos = () => {
    if (alertasSelecionados.size === alertasFiltrados.length) {
      setAlertasSelecionados(new Set());
      setShowBatchActions(false);
    } else {
      setAlertasSelecionados(new Set(alertasFiltrados.map(a => a.id)));
      setShowBatchActions(true);
    }
  };

  const handleBatchStatusChange = async (novoStatus: string) => {
    if (!token || alertasSelecionados.size === 0) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const id of Array.from(alertasSelecionados)) {
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/${id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ status: novoStatus }),
            }
          );
          successCount++;
        } catch {
          errorCount++;
        }
      }

      addToast({
        type: errorCount > 0 ? 'warning' : 'success',
        title: `${successCount} alerta(s) atualizado(s)`,
        message: errorCount > 0 ? `${errorCount} erro(s)` : `Status alterado para ${novoStatus}`
      });

      setAlertasSelecionados(new Set());
      setShowBatchActions(false);
      await loadAlertas();
      await loadStats();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar',
        message: error.message
      });
    }
  };

  // ============================================
  // ENVIAR TELEGRAM
  // ============================================

  const handleEnviarTelegram = async (alertaId: number) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/notificacoes-faltas/alerta-faltas/${alertaId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        addToast({
          type: 'success',
          title: '✅ Alerta enviado!',
          message: data.message
        });
      } else {
        addToast({
          type: 'error',
          title: 'Erro ao enviar',
          message: data.detail || 'Erro ao enviar alerta via Telegram'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao enviar',
        message: error.message || 'Erro ao enviar alerta via Telegram'
      });
    }
  };

  // ============================================
  // FILTROS E BUSCA
  // ============================================

  const alertasFiltrados = useMemo(() => {
    let resultado = alertas;
    
    if (busca.trim()) {
      const buscaLower = busca.toLowerCase();
      resultado = resultado.filter(a => 
        a.aluno?.nome?.toLowerCase().includes(buscaLower) ||
        a.aluno_matricula.toLowerCase().includes(buscaLower)
      );
    }
    
    return resultado;
  }, [alertas, busca]);

  // ============================================
  // HELPERS
  // ============================================

  const parseDisciplinas = (disciplinasJson: string): string[] => {
    try {
      if (!disciplinasJson) return [];
      const parsed = JSON.parse(disciplinasJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Se não for JSON válido, tenta split por vírgula
      return disciplinasJson.split(',').map(d => d.trim()).filter(Boolean);
    }
  };

  const getStatusPrazo = (dataLimite?: string) => {
    if (!dataLimite) return null;
    const hoje = new Date();
    const limite = new Date(dataLimite);
    const diffDias = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return { cor: 'text-red-600 dark:text-red-400', icone: '🔴', texto: `Vencido! (${Math.abs(diffDias)}d)`, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' };
    } else if (diffDias <= 3) {
      return { cor: 'text-amber-600 dark:text-amber-400', icone: '🟡', texto: `${diffDias} dias restantes`, bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' };
    } else {
      return { cor: 'text-green-600 dark:text-green-400', icone: '🟢', texto: `${diffDias} dias restantes`, bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' };
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Alertas de Faltas</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-1">Gerencie alertas de faltas consecutivas</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-sm min-h-11"
        >
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </button>
        <button
          onClick={async () => {
            if (!token) return;
            try {
              const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/auto-resolver`,
                {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                }
              );
              if (response.ok) {
                const data = await response.json();
                addToast({ type: 'success', title: 'Auto-resolução', message: data.mensagem });
                await loadAlertas();
                await loadStats();
              }
            } catch (error: any) {
              addToast({ type: 'error', title: 'Erro', message: error.message });
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all text-sm min-h-11"
        >
          <CheckCircle className="w-4 h-4" />
          Auto-Resolver
        </button>
      </div>

      {/* Cards de Estatísticas */}
      {faltasStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase">Pendentes</span>
            </div>
            <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-300">{faltasStats.total_alertas_pendentes}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Requerem ação</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">3 Faltas</span>
            </div>
            <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{faltasStats.total_alertas_3_faltas}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Alertas iniciais</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">5 Faltas</span>
            </div>
            <p className="text-3xl font-bold text-orange-800 dark:text-orange-300">{faltasStats.total_alertas_5_faltas}</p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">Atenção necessária</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">10 Faltas</span>
            </div>
            <p className="text-3xl font-bold text-red-800 dark:text-red-300">{faltasStats.total_alertas_10_faltas}</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">Ação imediata</p>
          </div>
        </div>
      )}

      {/* Gráfico de Tendência */}
      {faltasStats && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Distribuição de Alertas por Tipo
          </h3>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { tipo: '3 Faltas', total: faltasStats.total_alertas_3_faltas, cor: '#eab308' },
                  { tipo: '5 Faltas', total: faltasStats.total_alertas_5_faltas, cor: '#f97316' },
                  { tipo: '10 Faltas', total: faltasStats.total_alertas_10_faltas, cor: '#ef4444' },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tipo" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis allowDecimals={false} fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {[
                    { tipo: '3 Faltas' },
                    { tipo: '5 Faltas' },
                    { tipo: '10 Faltas' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      index === 0 ? '#eab308' : index === 1 ? '#f97316' : '#ef4444'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comparativo Mensal */}
      {comparativoMensal && comparativoMensal.meses.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Comparativo Mensal
            {comparativoMensal.variacao_percentual !== 0 && (
              <span className={cn(
                "ml-auto px-3 py-1 rounded-full text-xs font-bold",
                comparativoMensal.variacao_percentual > 0
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  : comparativoMensal.variacao_percentual < 0
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
              )}>
                {comparativoMensal.variacao_percentual > 0 ? '↑' : comparativoMensal.variacao_percentual < 0 ? '↓' : '→'}
                {Math.abs(comparativoMensal.variacao_percentual)}% vs mês anterior
              </span>
            )}
          </h3>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {comparativoMensal.meses.map((mes: any, idx: number) => (
              <div key={idx} className={cn(
                "p-3 rounded-xl border text-center",
                idx === comparativoMensal.meses.length - 1
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
              )}>
                <p className="text-xs font-bold text-gray-600 dark:text-slate-400 mb-1 capitalize">{mes.mes}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{mes.total}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[10px] text-green-600 dark:text-green-400">✓{mes.resolvidos}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">⏳{mes.pendentes}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Total nos últimos 6 meses:</span>
              <span className="font-bold text-gray-800 dark:text-white">{comparativoMensal.total_6_meses} alertas</span>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard de Efetividade */}
      {dashboardEfetividade && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Dashboard de Efetividade
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Taxa de Resolução */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Taxa de Resolução</p>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-300 mt-2">{dashboardEfetividade.taxa_resolucao}%</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                {dashboardEfetividade.resolvidos} de {dashboardEfetividade.total_alertas} resolvidos
              </p>
            </div>

            {/* Taxa de Intervenção */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Intervenções Realizadas</p>
              <p className="text-3xl font-bold text-purple-800 dark:text-purple-300 mt-2">{dashboardEfetividade.taxa_intervencao}%</p>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                {dashboardEfetividade.alertas_com_intervencao} alertas com intervenção
              </p>
            </div>

            {/* Taxa de Melhora */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Melhora na Frequência</p>
              <p className="text-3xl font-bold text-green-800 dark:text-green-300 mt-2">{dashboardEfetividade.taxa_melhora_freq}%</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                {dashboardEfetividade.alertas_melhora_freq} alunos com freq. ≥ 75%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-3 md:p-4">
        <div className="flex flex-col lg:flex-row items-start gap-3">
          <Filter className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0 mt-2" />

          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar aluno por nome ou matrícula..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-11"
              />
            </div>
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setTimeout(loadAlertas, 300);
            }}
            className="px-3 md:px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-11 w-full sm:w-auto"
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
            className="px-3 md:px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-11 w-full sm:w-auto"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Todos Tipos</option>
            <option value="3_FALTAS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">3 Faltas</option>
            <option value="5_FALTAS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">5 Faltas</option>
            <option value="10_FALTAS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">10 Faltas</option>
          </select>

          <select
            value={filtroCurso}
            onChange={(e) => {
              setFiltroCurso(e.target.value);
              setTimeout(loadAlertas, 300);
            }}
            className="px-3 md:px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-11 w-full sm:w-auto"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Todos Cursos</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de Ações em Lote */}
      <AnimatePresence>
        {showBatchActions && alertasSelecionados.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" />
                <span className="font-bold">{alertasSelecionados.size} alerta(s) selecionado(s)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBatchStatusChange('EM_ANALISE')}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all"
                >
                  Marcar Em Análise
                </button>
                <button
                  onClick={() => handleBatchStatusChange('RESOLVIDO')}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-bold transition-all"
                >
                  Marcar Resolvido
                </button>
                <button
                  onClick={() => handleBatchStatusChange('IGNORADO')}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-bold transition-all"
                >
                  Marcar Ignorado
                </button>
                <button
                  onClick={() => {
                    setAlertasSelecionados(new Set());
                    setShowBatchActions(false);
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all"
                >
                  Limpar Seleção
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Carregando alertas...</p>
          </div>
        ) : alertasFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {busca ? 'Nenhum alerta encontrado para a busca' : 'Nenhum alerta encontrado'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {busca ? 'Tente outro termo de busca' : 'Ótimo! Sem alertas de faltas consecutivas'}
            </p>
          </div>
        ) : (
          alertasFiltrados.map((alerta) => {
            const StatusIcon = statusConfig[alerta.status].icon;
            const tipoConfig = tipoAlertaConfig[alerta.tipo_alerta];
            const TipoIcon = tipoConfig.icon;
            const disciplinas = parseDisciplinas(alerta.disciplinas_afetadas);

            return (
              <motion.div
                key={alerta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden",
                  alerta.status === 'PENDENTE' ? "border-orange-200 dark:border-orange-800" : "border-gray-100 dark:border-slate-800"
                )}
              >
                {/* Header do Card */}
                <div className={cn(
                  "p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  tipoConfig.color
                )}>
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    {/* Checkbox para seleção em lote */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelecaoAlerta(alerta.id);
                      }}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                        alertasSelecionados.has(alerta.id)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 dark:border-slate-600 hover:border-blue-400"
                      )}
                    >
                      {alertasSelecionados.has(alerta.id) && <CheckCircle className="w-4 h-4" />}
                    </button>
                    <TipoIcon className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base truncate">
                          {alerta.aluno?.nome || alerta.aluno_matricula}
                        </h3>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-bold",
                          statusConfig[alerta.status].color
                        )}>
                          {statusConfig[alerta.status].label}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-white/50 dark:bg-slate-800/50 text-gray-700 dark:text-gray-300">
                          {alerta.aluno_matricula}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 truncate">
                        {alerta.aluno?.curso?.nome || 'Curso não informado'}
                      </p>
                      {alerta.responsavel?.nome && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                          👤 Resp.: {alerta.responsavel.nome}
                        </p>
                      )}
                      {alerta.data_limite && getStatusPrazo(alerta.data_limite) && (alerta.status === 'PENDENTE' || alerta.status === 'EM_ANALISE') && (
                        <div className={cn(
                          "mt-1.5 px-2 py-1 rounded-md border text-xs font-bold",
                          getStatusPrazo(alerta.data_limite)!.bg,
                          getStatusPrazo(alerta.data_limite)!.cor
                        )}>
                          {getStatusPrazo(alerta.data_limite)!.icone} {getStatusPrazo(alerta.data_limite)!.texto}
                          <span className="block font-normal opacity-70">
            Prazo: {new Date(alerta.data_limite).toLocaleDateString('pt-BR')}
          </span>
                        </div>
                      )}
                      {alerta.contato_responsavel_data && (
                        <div className="mt-1.5 px-2 py-1 rounded-md border text-xs font-bold bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                          📞 Contato: {alerta.contato_responsavel_meio || 'N/A'} em {new Date(alerta.contato_responsavel_data).toLocaleDateString('pt-BR')}
                        </div>
                      )}

                      {/* Botões de Contato Rápido com Responsável */}
                      {alerta.aluno?.telefone_responsavel_1 && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate">
                                👤 {alerta.aluno.nome_responsavel_1 || 'Responsável'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                {alerta.aluno.parentesco_responsavel_1 || ''} • {alerta.aluno.telefone_responsavel_1}
                              </p>
                            </div>
                            <div className="flex gap-1.5 ml-2">
                              <a
                                href={`tel:${alerta.aluno.telefone_responsavel_1.replace(/\D/g, '')}`}
                                className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-all"
                                title="Ligar"
                              >
                                📞
                              </a>
                              <a
                                href={`https://wa.me/55${alerta.aluno.telefone_responsavel_1.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Olá, ${alerta.aluno.nome_responsavel_1 || 'responsável'}! Aqui é da escola. Estamos entrando em contato sobre o(a) aluno(a) *${alerta.aluno.nome}*.\n\n` +
                                  `⚠️ *Alerta de Faltas Consecutivas*\n` +
                                  `📊 Total: ${alerta.quantidade_faltas} faltas consecutivas\n` +
                                  `📅 Período: ${new Date(alerta.data_inicio_faltas).toLocaleDateString('pt-BR')} a ${new Date(alerta.data_fim_faltas).toLocaleDateString('pt-BR')}\n\n` +
                                  `Pedimos que entre em contato com a escola para conversarmos sobre a situação do(a) aluno(a).\n\n` +
                                  `Atenciosamente,\nEquipe SAPEE`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all flex items-center gap-1 text-xs font-bold"
                                title="Enviar WhatsApp"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:shrink-0">
                    <div className="text-right">
                      <p className="text-xl md:text-2xl font-bold">{alerta.quantidade_faltas}</p>
                      <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">faltas consecutivas</p>
                    </div>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-3 md:p-4 space-y-4">
                  {/* Informações */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Período</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                        {new Date(alerta.data_inicio_faltas).toLocaleDateString('pt-BR')} - 
                        {new Date(alerta.data_fim_faltas).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Disciplinas</p>
                      <div className="flex flex-wrap gap-1">
                        {disciplinas.length > 0 ? (
                          disciplinas.slice(0, 3).map((disc, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded text-xs">
                              {disc}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-slate-400">Não informado</span>
                        )}
                        {disciplinas.length > 3 && (
                          <span className="text-xs text-gray-400 self-center">+{disciplinas.length - 3}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Prioridade</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{tipoConfig.priority}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Criado em</p>
                      <p className="text-sm text-gray-700 dark:text-slate-200">
                        {new Date(alerta.criado_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Ações Tomadas */}
                  {alerta.acoes_tomadas && (
                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-l-4 border-blue-400">
                      <p className="text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Ações Tomadas:</p>
                      <p className="text-sm text-gray-700 dark:text-slate-300">{alerta.acoes_tomadas}</p>
                    </div>
                  )}

                  {/* Histórico de Ações */}
                  {alerta.historico && alerta.historico.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Histórico de Ações ({alerta.historico.length})
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {alerta.historico.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex items-start gap-2 text-xs">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              entry.acao === 'STATUS_ALTERADO' ? "bg-blue-500" :
                              entry.acao === 'RESPONSAVEL_ATRIBUIDO' ? "bg-purple-500" :
                              entry.acao === 'INTERVENCAO_CRIADA' ? "bg-emerald-500" :
                              entry.acao === 'ALERTA_RESOLVIDO' ? "bg-green-500" :
                              "bg-gray-400"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-700 dark:text-slate-300 truncate">{entry.descricao}</p>
                              <p className="text-gray-400 dark:text-slate-500 text-[10px]">
                                {entry.usuario?.nome && `por ${entry.usuario.nome} • `}
                                {new Date(entry.criado_at).toLocaleDateString('pt-BR')} {new Date(entry.criado_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                        {alerta.historico.length > 5 && (
                          <p className="text-[10px] text-gray-400 text-center">
                            +{alerta.historico.length - 5} ações anteriores
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sugestões Automáticas */}
                  {(alerta.status === 'PENDENTE' || alerta.status === 'EM_ANALISE') && (
                    (() => {
                      const sugestoes = sugestoesPorTipo[alerta.tipo_alerta] || [];
                      if (sugestoes.length === 0) return null;

                      return (
                        <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-gray-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                            💡 Sugestões de Intervenção
                          </p>
                          <div className="space-y-1.5">
                            {sugestoes.map((sugestao, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setAlunoParaIntervencao({
                                    matricula: alerta.aluno_matricula,
                                    nome: alerta.aluno?.nome || alerta.aluno_matricula,
                                    frequencia: Math.max(0, 100 - alerta.quantidade_faltas * 5),
                                    curso: alerta.aluno?.curso?.nome || 'N/A'
                                  });
                                  setAlertaSelecionadoParaIntervencao(alerta);
                                  setShowIntervencaoModal(true);
                                }}
                                className={cn(
                                  "w-full text-left p-2.5 rounded-lg border transition-all text-xs hover:shadow-sm",
                                  sugestao.prioridade === 'URGENTE'
                                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20"
                                    : sugestao.prioridade === 'ALTA'
                                    ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20"
                                    : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">{sugestao.tipo}</span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                    sugestao.prioridade === 'URGENTE' ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200" :
                                    sugestao.prioridade === 'ALTA' ? "bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200" :
                                    "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                                  )}>
                                    {sugestao.prioridade}
                                  </span>
                                </div>
                                <p className="text-[10px] opacity-75 mt-0.5">{sugestao.descricao}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* Botões de Ação */}
                  {(alerta.status === 'PENDENTE' || alerta.status === 'EM_ANALISE') && alertaEditando !== alerta.id && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                      <button
                        onClick={() => handleCriarIntervencao(alerta)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all text-sm flex items-center justify-center gap-2 min-h-11"
                      >
                        <GraduationCap className="w-4 h-4" />
                        Criar Intervenção
                      </button>
                      <button
                        onClick={() => handleAbrirModalAcao(alerta)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2 min-h-11"
                      >
                        <Edit className="w-4 h-4" />
                        Registrar Ações
                      </button>
                      <button
                        onClick={() => handleEnviarTelegram(alerta.id)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-600 text-white rounded-lg font-bold hover:bg-sky-700 transition-all text-sm flex items-center justify-center gap-2 min-h-11"
                      >
                        📱 Enviar Telegram
                      </button>
                      {alerta.status === 'PENDENTE' && (
                        <button
                          onClick={async () => {
                            await fetch(
                              `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/${alerta.id}`,
                              {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify({ status: 'EM_ANALISE' }),
                              }
                            );
                            addToast({ type: 'success', title: 'Atualizado', message: 'Alerta em análise' });
                            loadAlertas();
                            loadStats();
                          }}
                          className="px-4 py-2.5 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all text-sm flex items-center gap-2 min-h-11"
                        >
                          <Search className="w-4 h-4" />
                          Marcar Em Análise
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja ignorar este alerta?')) {
                            await fetch(
                              `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alertas-faltas/${alerta.id}`,
                              {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify({ status: 'IGNORADO' }),
                              }
                            );
                            addToast({ type: 'success', title: 'Alerta ignorado', message: 'O alerta foi marcado como ignorado' });
                            loadAlertas();
                            loadStats();
                          }
                        }}
                        className="px-4 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-sm flex items-center gap-2 min-h-11"
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

      {/* Modal de Registro de Ações */}
      <AnimatePresence>
        {showModalAcao && alertaEditando !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowModalAcao(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Registrar Ações
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {alertas.find(a => a.id === alertaEditando)?.aluno?.nome || alertaEditando}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModalAcao(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Informações do Responsável */}
                {(() => {
                  const alertaAtual = alertas.find(a => a.id === alertaEditando);
                  const telefone = alertaAtual?.aluno?.telefone_responsavel_1;
                  const nome = alertaAtual?.aluno?.nome_responsavel_1;
                  const parentesco = alertaAtual?.aluno?.parentesco_responsavel_1;

                  if (!telefone || !nome) return null;

                  return (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <h4 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                        📋 Responsável pelo Aluno
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-green-900 dark:text-green-200 truncate">
                            👤 {nome}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-400">
                            {parentesco} • {telefone}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <a
                            href={`tel:${telefone.replace(/\D/g, '')}`}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1"
                          >
                            📞 Ligar
                          </a>
                          <a
                            href={`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá, ${nome}! Aqui é da escola. Estamos entrando em contato sobre o(a) aluno(a) *${alertaAtual?.aluno?.nome}*.\n\n` +
                              `⚠️ *Alerta de Faltas Consecutivas*\n` +
                              `📊 Total: ${alertaAtual?.quantidade_faltas || 0} faltas consecutivas\n\n` +
                              `Pedimos que entre em contato com a escola para conversarmos sobre a situação do(a) aluno(a).\n\n` +
                              `Atenciosamente,\nEquipe SAPEE`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1"
                          >
                            💬 WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Seleção de Status */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Status do Alerta
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => setNovoStatus(key)}
                          className={cn(
                            "px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center gap-2",
                            novoStatus === key
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Responsável */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    👤 Responsável pelo Acompanhamento
                  </label>
                  <select
                    value={alertas.find(a => a.id === alertaEditando)?.responsavel_id || ''}
                    onChange={(e) => {
                      const responsavelId = e.target.value ? Number(e.target.value) : undefined;
                      // Update local state
                      setAlertas(prev => prev.map(a =>
                        a.id === alertaEditando ? { ...a, responsavel_id: responsavelId } : a
                      ));
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="">Selecione um responsável</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nome} ({u.role?.nome || 'N/A'})</option>
                    ))}
                  </select>
                </div>

                {/* Contato com Responsáveis */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                    📞 Contato com Responsáveis
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                        Data do Contato
                      </label>
                      <input
                        type="date"
                        value={alertas.find(a => a.id === alertaEditando)?.contato_responsavel_data || ''}
                        onChange={(e) => {
                          const data = e.target.value;
                          setAlertas(prev => prev.map(a =>
                            a.id === alertaEditando ? { ...a, contato_responsavel_data: data } : a
                          ));
                        }}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                        Meio de Contato
                      </label>
                      <select
                        value={alertas.find(a => a.id === alertaEditando)?.contato_responsavel_meio || ''}
                        onChange={(e) => {
                          const meio = e.target.value;
                          setAlertas(prev => prev.map(a =>
                            a.id === alertaEditando ? { ...a, contato_responsavel_meio: meio } : a
                          ));
                        }}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      >
                        <option value="">Selecione</option>
                        <option value="Telefone">📞 Telefone</option>
                        <option value="WhatsApp">💬 WhatsApp</option>
                        <option value="Email">📧 E-mail</option>
                        <option value="Presencial">🏫 Presencial</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                      Observações do Contato
                    </label>
                    <textarea
                      value={alertas.find(a => a.id === alertaEditando)?.contato_responsavel_obs || ''}
                      onChange={(e) => {
                        const obs = e.target.value;
                        setAlertas(prev => prev.map(a =>
                          a.id === alertaEditando ? { ...a, contato_responsavel_obs: obs } : a
                        ));
                      }}
                      rows={2}
                      placeholder="Ex: Conversou com a mãe, relatou dificuldades de transporte..."
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm"
                    />
                  </div>
                </div>

                {/* Ações Tomadas */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Ações Tomadas
                  </label>
                  <textarea
                    value={acoesTomadas}
                    onChange={(e) => setAcoesTomadas(e.target.value)}
                    rows={4}
                    placeholder="Descreva as ações tomadas para resolver o alerta..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowModalAcao(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAtualizarStatus}
                    disabled={!novoStatus}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Criação de Intervenção */}
      <IntervencaoModal
        isOpen={showIntervencaoModal}
        onClose={() => {
          setShowIntervencaoModal(false);
          setAlunoParaIntervencao(null);
          setAlertaSelecionadoParaIntervencao(null);
        }}
        onSave={handleSaveIntervencao}
        alunoNome={alunoParaIntervencao?.nome || ''}
        matricula={alunoParaIntervencao?.matricula}
        initialValues={{
          tipo: alertaSelecionadoParaIntervencao?.tipo_alerta === '10_FALTAS'
            ? 'Reunião com Responsáveis'
            : alertaSelecionadoParaIntervencao?.tipo_alerta === '5_FALTAS'
            ? 'Acompanhamento Pedagógico'
            : 'Reunião com Aluno',
          descricao: `Aluno com ${alertaSelecionadoParaIntervencao?.quantidade_faltas || 0} faltas consecutivas registradas. Disciplinas afetadas: ${parseDisciplinas(alertaSelecionadoParaIntervencao?.disciplinas_afetadas || '').join(', ')}.`,
          prioridade: alertaSelecionadoParaIntervencao?.tipo_alerta === '10_FALTAS'
            ? 'URGENTE'
            : alertaSelecionadoParaIntervencao?.tipo_alerta === '5_FALTAS'
            ? 'ALTA'
            : 'MEDIA'
        }}
      />
    </div>
  );
}
