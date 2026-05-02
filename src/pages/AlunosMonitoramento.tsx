import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, User, BookOpen, Clock, BarChart3, Plus, Search, TrendingUp, AlertCircle, CheckCircle, ExternalLink, AlertTriangle as AlertTriangleIcon, Bot, Check, X, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import IntervencaoModal from '../components/IntervencaoModal';
import { cn } from '../utils';

export default function AlunosMonitoramento() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [rascunhos, setRascunhos] = useState<any[]>([]);
  const [gerandoRascunhos, setGerandoRascunhos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [intervencoesAtivas, setIntervencoesAtivas] = useState<any[]>([]);
  
  // Estados para edição de rascunho e valores iniciais do modal
  const [modalInitialValues, setModalInitialValues] = useState<any>(null);
  const [editingRascunhoId, setEditingRascunhoId] = useState<number | null>(null);
  
  // Estados para verificação de duplicidade
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingIntervencao, setPendingIntervencao] = useState<any>(null);
  
  // Estados para evolução e notas
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [intervencaoSelecionada, setIntervencaoSelecionada] = useState<any>(null);
  const [observacao, setObservacao] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const lista = await loadAlunosMonitoramento();
      // Carrega intervenções APÓS carregar os alunos e passa a lista como argumento
      await loadIntervencoesAtivas(lista);
      // Carrega rascunhos relevantes
      await loadRascunhos(lista);
    };
    loadData();
  }, []);

  const loadAlunosMonitoramento = async () => {
    if (!token) return [];
    try {
      const data = await api.alunos.listMonitoramento(token);
      const lista = data.alunos || [];
      setAlunos(lista);
      return lista;
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadIntervencoesAtivas = async (listaAlunos: any[]) => {
    if (!token || listaAlunos.length === 0) return;
    try {
      // Busca as últimas 50 intervenções
      const data = await api.intervencoes.list(token, 0, 50);
      
      // Cria um Set com as matrículas limpas dos alunos em monitoramento
      const matriculasMonitoramento = new Set(
        listaAlunos.map(a => String(a.matricula).trim())
      );
      
      // Filtra intervenções desses alunos com verificação robusta
      // E remove RASCUNHOS e CANCELADAS desta lista
      const intervencoesAlunosMedio = data.filter((int: any) => {
        // 1. Verifica se pertence a um aluno da lista
        const rawIds = [
          int.aluno_id,
          int.aluno?.matricula,
          int.aluno_id_str
        ];
        
        const idsToCheck = rawIds
          .map(id => String(id || '').trim())
          .filter(id => id.length > 0);

        const pertenceAluno = idsToCheck.some(id => matriculasMonitoramento.has(id));
        
        // 2. Verifica se é uma intervenção válida (não é rascunho nem cancelada)
        const statusValido = int.status !== 'RASCUNHO' && int.status !== 'CANCELADA';

        return pertenceAluno && statusValido;
      });
      
      setIntervencoesAtivas(intervencoesAlunosMedio);
    } catch (error: any) {
      console.error('Erro ao carregar intervenções ativas:', error);
    }
  };

  // Funções de gestão de rascunhos (Filtra APENAS rascunhos de risco MÉDIO)
  const loadRascunhos = async (listaAlunos: any[]) => {
    if (!token) return;
    try {
      const allRascunhos = await api.intervencoes.listRascunhos(token);

      // Filtra apenas rascunhos de risco MÉDIO usando o campo motivo_risco
      const rascunhosMedioRisco = allRascunhos.filter((r: any) => {
        if (!r.motivo_risco) return false;
        try {
          const motivo = JSON.parse(r.motivo_risco);
          const nivel = String(motivo.nivel || '').toUpperCase();
          return nivel.includes('MEDIO');
        } catch {
          return false;
        }
      });
      
      setRascunhos(rascunhosMedioRisco);
    } catch (error: any) {
      console.error('Erro ao carregar rascunhos:', error);
    }
  };

  const handleGerarSugestoes = async () => {
    if (!token) return;
    setGerandoRascunhos(true);
    try {
      // Solicita sugestões especificamente para alunos de risco MÉDIO
      await api.intervencoes.gerarSugestoes(token, 'MEDIO');
      
      addToast({ type: 'success', title: 'Sugestões geradas', message: 'Rascunhos criados com sucesso' });
      
      const lista = await loadAlunosMonitoramento();
      await Promise.all([
        loadIntervencoesAtivas(lista),
        loadRascunhos(lista)
      ]);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    } finally {
      setGerandoRascunhos(false);
    }
  };

  const handleAprovarRascunho = async (id: number) => {
    if (!token) return;
    try {
      await api.intervencoes.aprovar(token, id);
      addToast({ type: 'success', title: 'Aprovado', message: 'Intervenção criada e pendente' });
      const lista = await loadAlunosMonitoramento();
      await Promise.all([
        loadIntervencoesAtivas(lista),
        loadRascunhos(lista)
      ]);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const handleRejeitarRascunho = async (id: number) => {
    if (!token) return;
    if (!confirm('Tem certeza que deseja rejeitar esta sugestão?')) return;
    try {
      await api.intervencoes.rejeitar(token, id, 'Rejeitado pelo coordenador');
      addToast({ type: 'info', title: 'Rejeitado', message: 'Sugestão removida' });
      const lista = await loadAlunosMonitoramento();
      await loadRascunhos(lista);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const handleEditarRascunho = (rascunho: any) => {
    // 1. Preparar os valores iniciais baseados no rascunho para pré-preencher o formulário
    setModalInitialValues({
        tipo: rascunho.tipo,
        descricao: rascunho.descricao || '',
        prioridade: rascunho.prioridade,
        status: 'PENDENTE' // Ao salvar a edição, a intervenção passa a ser Pendente
    });
    
    // 2. Armazena o ID do rascunho para que possamos deletá-lo APÓS o salvamento da nova intervenção
    setEditingRascunhoId(rascunho.id);
    
    // 3. Identificar o aluno e abrir o modal
    const aluno = alunos.find(a => String(a.matricula) === String(rascunho.aluno_id));
    if (aluno) {
      setAlunoSelecionado(aluno);
      setShowCreateModal(true);
    }
  };

  const handleCriarIntervencao = (aluno: any) => {
    // Verifica se já existe intervenção ativa para este aluno na lista carregada
    const intervencaoExistente = intervencoesAtivas.find(
      (int) => 
        (int.aluno_id === aluno.matricula || int.aluno?.matricula === aluno.matricula) &&
        (int.status === 'PENDENTE' || int.status === 'EM_ANDAMENTO')
    );

    if (intervencaoExistente) {
      // Se existe, mostra o aviso
      setPendingIntervencao(intervencaoExistente);
      setShowDuplicateWarning(true);
    } else {
      // Lógica de sugestão inteligente baseada no perfil do aluno
      const freq = aluno.frequencia ? parseFloat(aluno.frequencia) : 100;
      const media = aluno.media_geral ? parseFloat(aluno.media_geral) : 10;
      
      let tipoSugerido = "Acompanhamento Preventivo";
      let prioridadeSugerida: any = "MEDIA";
      let descricaoSugerida = "";

      if (freq < 60) {
          tipoSugerido = "Reunião com Aluno";
          prioridadeSugerida = "ALTA";
          descricaoSugerida = `Frequência crítica (${freq}%). Conversar sobre permanência.`;
      } else if (media < 5) {
          tipoSugerido = "Reforço Escolar";
          prioridadeSugerida = "ALTA";
          descricaoSugerida = `Média crítica (${media}). Encaminhar para reforço.`;
      } else if (freq < 75) {
          tipoSugerido = "Orientação Pedagógica";
          prioridadeSugerida = "MEDIA";
          descricaoSugerida = `Frequência em atenção (${freq}%). Reforçar importância da presença.`;
      } else if (aluno.trabalha) {
          tipoSugerido = "Apoio Social";
          prioridadeSugerida = "MEDIA";
          descricaoSugerida = `Aluno trabalhador. Verificar conciliação estudo/trabalho.`;
      } else {
          tipoSugerido = "Acompanhamento Preventivo";
          prioridadeSugerida = "MEDIA";
          descricaoSugerida = `Risco médio identificado. Manter monitoramento.`;
      }

      // Define os valores iniciais do modal
      setModalInitialValues({
          tipo: tipoSugerido,
          descricao: descricaoSugerida,
          prioridade: prioridadeSugerida,
          status: 'PENDENTE'
      });

      // Abre o modal de criação
      setAlunoSelecionado(aluno);
      setShowCreateModal(true);
    }
  };

  const handleSaveIntervencao = async (data: any) => {
    if (!token) return;
    const { matricula, ...intervencaoData } = data;
    try {
      await api.intervencoes.create(token, matricula || alunoSelecionado?.matricula, intervencaoData);
      addToast({ type: 'success', title: 'Sucesso', message: 'Intervenção criada com sucesso' });
      
      // Se estava editando um rascunho, deletamos o rascunho original agora que a nova foi criada
      if (editingRascunhoId) {
          try {
              await api.intervencoes.rejeitar(token, editingRascunhoId, 'Substituído pela intervenção editada');
          } catch (e) { /* ignora erro na limpeza do rascunho */ }
      }

      setShowCreateModal(false);
      setAlunoSelecionado(null);
      setModalInitialValues(null);
      setEditingRascunhoId(null);

      // Recarrega alunos e depois usa essa lista para carregar as intervenções
      const listaAtualizada = await loadAlunosMonitoramento();
      await Promise.all([
        loadIntervencoesAtivas(listaAtualizada),
        loadRascunhos(listaAtualizada)
      ]);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const handleAtualizarStatus = (intervencao: any) => {
    setIntervencaoSelecionada(intervencao);
    setObservacao(intervencao.observacoes || '');
    setShowStatusModal(true);
  };

  const handleSalvarObservacao = async () => {
    if (!token || !intervencaoSelecionada) return;
    setSavingNote(true);
    try {
      await api.intervencoes.update(token, intervencaoSelecionada.id, {
        observacoes: observacao
      });
      addToast({ type: 'success', title: 'Status atualizado', message: 'Observação salva com sucesso' });
      setShowStatusModal(false);
      setIntervencaoSelecionada(null);
      // Recarrega as intervenções para atualizar os dados
      const lista = await loadAlunosMonitoramento();
      await loadIntervencoesAtivas(lista);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    } finally {
      setSavingNote(false);
    }
  };

  const handleExcluirIntervencao = async (id: number) => {
    if (!token) return;
    if (!confirm('Tem certeza que deseja excluir esta intervenção?')) return;
    try {
      await api.intervencoes.delete(token, id);
      addToast({ type: 'info', title: 'Excluída', message: 'Intervenção excluída com sucesso' });
      const lista = await loadAlunosMonitoramento();
      await loadIntervencoesAtivas(lista);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const handleMudarStatusIntervencao = async (id: number, novoStatus: string) => {
    if (!token) return;
    try {
      await api.intervencoes.update(token, id, { status: novoStatus });
      addToast({ type: 'success', title: 'Status atualizado', message: `Intervenção marcada como ${novoStatus.replace('_', ' ')}` });
      const lista = await loadAlunosMonitoramento();
      await loadIntervencoesAtivas(lista);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const filteredAlunos = alunos.filter(a => {
    // Filtro de busca por nome ou matrícula
    const matchesSearch = 
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.matricula.includes(searchTerm);
    
    if (!matchesSearch) return false;
    
    // Filtro: Remove alunos que JÁ POSSUEM intervenção ativa (PENDENTE ou EM_ANDAMENTO)
    // Assim o card some automaticamente após a criação da intervenção
    const temIntervencaoAtiva = intervencoesAtivas.some(int => {
      const statusAtivo = int.status === 'PENDENTE' || int.status === 'EM_ANDAMENTO';
      const alunoMatch = String(int.aluno_id) === String(a.matricula) || 
                         (int.aluno?.matricula && String(int.aluno.matricula) === String(a.matricula));
      return statusAtivo && alunoMatch;
    });
    
    return !temIntervencaoAtiva;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2 md:gap-3">
            <Eye className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
            <span className="truncate">Monitoramento Preventivo</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Alunos com risco MEDIO que precisam de acompanhamento para evitar piora
          </p>
        </div>
        <Link
          to="/alunos-em-risco"
          className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 text-sm md:text-base min-h-11"
        >
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
          <span className="truncate">Ver Alunos em Risco Critico</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="bg-linear-to-r from-amber-500 to-yellow-500 rounded-2xl p-4 md:p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-xs md:text-sm">Alunos sem intervencao</p>
            <p className="text-3xl md:text-4xl font-bold">{filteredAlunos.length}</p>
          </div>
          <TrendingUp className="w-12 h-12 md:w-16 md:h-16 text-white/30" />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 md:p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300 font-medium">O que é Monitoramento Preventivo?</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Alunos com risco MÉDIO não precisam de intervenção urgente, mas merecem atenção especial.
            O acompanhamento preventivo evita que a situação piore para ALTO ou MUITO_ALTO.
          </p>
        </div>
      </div>

      {/* Seção de Sugestões Pendentes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-400 shadow-lg overflow-hidden">
        <div className="bg-linear-to-r from-amber-500 to-orange-500 p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 text-white">
            <Bot className="w-5 h-5 md:w-6 md:h-6" />
            <div>
              <h2 className="text-base md:text-lg font-bold">⚡ Sugestões Pendentes ({rascunhos.length})</h2>
              <p className="text-amber-100 text-xs">O sistema gerou estas sugestões com base no risco dos alunos</p>
            </div>
          </div>
          <button
            onClick={handleGerarSugestoes}
            disabled={gerandoRascunhos}
            className="px-3 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
          >
            {gerandoRascunhos ? 'Gerando...' : '✨ Gerar Novas'}
          </button>
        </div>

        {rascunhos.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-slate-400">
            Nenhuma sugestão pendente para alunos em monitoramento no momento.
            <button
              onClick={handleGerarSugestoes}
              className="block mx-auto mt-2 text-blue-600 hover:underline text-sm"
            >
              Clique aqui para gerar sugestões automaticamente
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {rascunhos.map((r) => {
              const alunoData = alunos.find(a => String(a.matricula) === String(r.aluno_id));
              const nomeAluno = alunoData?.nome || r.aluno_id;
              const motivo = r.motivo_risco ? JSON.parse(r.motivo_risco) : null;
              const score = motivo?.score || 'N/A';
              
              return (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      "w-2 h-12 rounded-full mt-1",
                      r.prioridade === 'URGENTE' ? "bg-red-500" :
                      r.prioridade === 'ALTA' ? "bg-orange-500" :
                      "bg-blue-500"
                    )} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 dark:text-white">{r.tipo}</h3>
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-bold">
                          RASCUNHO
                        </span>
                        {score !== 'N/A' && (
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            (Score: {score}%)
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{nomeAluno}</p>
                      {r.descricao && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{r.descricao}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:shrink-0 pl-6 sm:pl-0 flex-wrap">
                    <button
                      onClick={() => handleAprovarRascunho(r.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors min-h-11 flex-1 sm:flex-none"
                    >
                      <Check className="w-4 h-4" /> Aprovar
                    </button>
                    <button
                      onClick={() => handleEditarRascunho(r)}
                      className="flex items-center justify-center gap-1 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors min-h-11 flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={() => handleRejeitarRascunho(r.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors min-h-11 flex-1 sm:flex-none"
                    >
                      <X className="w-4 h-4" /> Rejeitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          className="w-full px-4 py-3 pl-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-gray-800 dark:text-white"
          placeholder="Buscar aluno por nome ou matrícula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de Alunos */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-slate-400 mt-4">Carregando...</p>
        </div>
      ) : filteredAlunos.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Nenhum aluno em monitoramento</h3>
          <p className="text-gray-500 dark:text-slate-400 mt-2">Não há alunos com risco MÉDIO no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredAlunos.map((aluno) => (
            <motion.div
              key={aluno.matricula}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-400 shadow-lg overflow-hidden flex flex-col"
            >
              {/* Header do Card */}
              <div className="bg-linear-to-r from-amber-500 to-yellow-500 p-3 md:p-4 text-white shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base md:text-lg truncate">{aluno.nome}</h3>
                  <span className="bg-white/20 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold shrink-0">
                    {aluno.risco_evasao}%
                  </span>
                </div>
                <p className="text-white/80 text-xs md:text-sm">{aluno.matricula}</p>
              </div>

              {/* Conteúdo do Card */}
              <div className="p-3 md:p-4 space-y-3 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3 md:w-4 md:h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Curso</p>
                      <p className="font-medium text-gray-800 dark:text-white text-[10px] md:text-xs truncate">{aluno.curso}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 md:w-4 md:h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Periodo</p>
                      <p className="font-medium text-gray-800 dark:text-white text-[10px] md:text-xs">{aluno.periodo}º</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Media</p>
                      <p className={cn(
                        "font-bold text-[10px] md:text-xs",
                        aluno.media_geral >= 7 ? "text-emerald-600" :
                        aluno.media_geral >= 5 ? "text-amber-600" : "text-red-500"
                      )}>{aluno.media_geral}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 md:w-4 md:h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400">Freq</p>
                      <p className={cn(
                        "font-bold text-[10px] md:text-xs",
                        aluno.frequencia >= 85 ? "text-emerald-600" :
                        aluno.frequencia >= 75 ? "text-amber-600" : "text-red-500"
                      )}>{aluno.frequencia}%</p>
                    </div>
                  </div>
                </div>

                {/* Motivo do Risco */}
                {aluno.motivo_risco && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800 shrink-0">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Fatores de atenção:</p>
                    <p className="text-xs text-amber-500 dark:text-amber-300">{aluno.motivo_risco}</p>
                  </div>
                )}

                {/* Contexto Social */}
                {(aluno.trabalha || aluno.renda_familiar || aluno.tempo_deslocamento > 60 || 
                  aluno.dificuldade_acesso === 'DIFICIL' || aluno.dificuldade_acesso === 'MUITO_DIFICIL' ||
                  !aluno.possui_computador || !aluno.possui_internet || aluno.beneficiario_bolsa_familia) && (
                  <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shrink-0">
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">🏠 Contexto Social</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aluno.trabalha && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                          👷 {aluno.carga_horaria_trabalho}h/sem
                        </span>
                      )}
                      {aluno.renda_familiar && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                          💰 R${aluno.renda_familiar.toFixed(0)}
                        </span>
                      )}
                      {aluno.tempo_deslocamento > 60 && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                          🚌 {aluno.tempo_deslocamento}min
                        </span>
                      )}
                      {(aluno.dificuldade_acesso === 'DIFICIL' || aluno.dificuldade_acesso === 'MUITO_DIFICIL') && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                          🚧 {aluno.dificuldade_acesso === 'MUITO_DIFICIL' ? 'Mto difícil' : 'Difícil'}
                        </span>
                      )}
                      {!aluno.possui_computador && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                          💻 Sem PC
                        </span>
                      )}
                      {!aluno.possui_internet && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                          🌐 Sem net
                        </span>
                      )}
                      {aluno.beneficiario_bolsa_familia && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                          🏛️ Bolsa Família
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Spacer para empurrar botão para baixo */}
                <div className="flex-1" />

                {/* Botão Criar Intervenção */}
                <button
                  onClick={() => handleCriarIntervencao(aluno)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-amber-600 to-amber-700 text-white rounded-xl font-bold hover:from-amber-700 hover:to-amber-800 transition-all shadow-lg shadow-amber-500/20 mt-auto shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  Criar Intervenção Preventiva
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Criação */}
      <IntervencaoModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setAlunoSelecionado(null);
          setModalInitialValues(null);
          setEditingRascunhoId(null);
        }}
        onSave={handleSaveIntervencao}
        alunoNome={alunoSelecionado?.nome || ''}
        matricula={alunoSelecionado?.matricula}
        isSaving={false}
        initialValues={modalInitialValues}
      />

      {/* Modal de Aviso de Duplicidade */}
      <AnimatePresence>
        {showDuplicateWarning && pendingIntervencao && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border-l-4 border-amber-500"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <AlertTriangleIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Intervenção Existente</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
                    Este aluno já possui uma intervenção ativa do tipo <strong>{pendingIntervencao.tipo}</strong>.
                  </p>
                  <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg mb-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Status Atual:</span>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold",
                      pendingIntervencao.status === 'PENDENTE' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {pendingIntervencao.status?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                    Deseja criar uma nova intervenção mesmo assim ou prefere gerenciar a existente?
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDuplicateWarning(false);
                        setPendingIntervencao(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setShowDuplicateWarning(false);
                        setPendingIntervencao(null);
                        setAlunoSelecionado(pendingIntervencao.aluno || { matricula: pendingIntervencao.aluno_id, nome: pendingIntervencao.aluno_nome });
                        setShowCreateModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      Criar Nova
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Atualização de Status */}
      <AnimatePresence>
        {showStatusModal && intervencaoSelecionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-linear-to-r from-blue-600 to-blue-700 p-6 text-white">
                <h3 className="text-lg font-bold">✏️ Atualizar Status da Intervenção</h3>
                <p className="text-blue-100 text-sm mt-1">{intervencaoSelecionada.tipo} - {intervencaoSelecionada.aluno?.nome || intervencaoSelecionada.aluno_id}</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Info Box */}
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Status Atual:</span>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold",
                      intervencaoSelecionada.status === 'PENDENTE' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      intervencaoSelecionada.status === 'EM_ANDAMENTO' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    )}>
                      {intervencaoSelecionada.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Criada em:</span>
                    <span className="text-gray-800 dark:text-white font-medium">
                      {intervencaoSelecionada.criado_at ? new Date(intervencaoSelecionada.criado_at).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>
                </div>

                {/* Campo de Observação */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    📝 Observação / Evolução do Aluno
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Aluna melhorou frequência para 85%. Está participando mais das aulas..."
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Registre aqui a evolução do aluno. Isso ajuda a equipe a acompanhar o progresso.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-50 dark:bg-slate-700/50 flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setIntervencaoSelecionada(null);
                  }}
                  disabled={savingNote}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-slate-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarObservacao}
                  disabled={savingNote || !observacao.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingNote ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>💾 Salvar Observação</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acompanhamento de Intervenções Ativas */}
      {intervencoesAtivas.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Acompanhamento de Intervenções ({intervencoesAtivas.length})</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Alunos que já receberam intervenção preventiva e estão sendo acompanhados (Ciclo de 6 meses)</p>
              </div>
            </div>
            <Link
              to="/intervencoes"
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Ver todas no Histórico <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {intervencoesAtivas.map((int) => {
              // Extrair dados do aluno e do motivo de risco
              const aluno = int.aluno || {};
              let scoreInicial = null;
              try {
                if (int.motivo_risco) {
                  const motivo = JSON.parse(int.motivo_risco);
                  scoreInicial = motivo.score;
                }
              } catch (e) {}

              // Helper para determinar tags de risco
              const getRiscoTags = (aluno: any) => {
                const tags: string[] = [];
                if (aluno.trabalha) tags.push('🏭 Trabalha');
                if (aluno.bolsa_familia) tags.push('🏛️ Bolsa Família');
                if (!aluno.possui_computador) tags.push('💻 Sem PC');
                if (!aluno.possui_internet) tags.push('🌐 Sem Internet');
                if (aluno.tempo_deslocamento > 90) tags.push('🚌 Longe');
                if (aluno.frequencia && aluno.frequencia < 75) tags.push('📉 Freq Baixa');
                if (aluno.media_geral && aluno.media_geral < 5) tags.push('📉 Média Baixa');
                return tags;
              };

              const tags = getRiscoTags(aluno);

              return (
              <div key={int.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-50 dark:border-slate-800 last:border-0">
                {/* Linha principal */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                      "w-2 h-10 rounded-full",
                      int.prioridade === 'URGENTE' ? "bg-red-500" :
                      int.prioridade === 'ALTA' ? "bg-orange-500" :
                      int.prioridade === 'MEDIA' ? "bg-blue-500" : "bg-green-500"
                    )} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800 dark:text-white">{int.tipo}</h3>
                        {scoreInicial && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold text-white",
                            scoreInicial >= 70 ? "bg-red-500" : scoreInicial >= 40 ? "bg-amber-500" : "bg-green-500"
                          )}>
                            Score: {scoreInicial}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate max-w-50 sm:max-w-none">
                        {int.aluno?.nome || int.aluno_id}
                      </p>
                      {int.usuario?.nome && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          👤 Criado por: {int.usuario.nome}
                        </p>
                      )}

                      {/* Tags de Fatores de Risco */}
                      {tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 overflow-x-auto pb-1">
                          {tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded text-[10px] font-medium whitespace-nowrap border border-gray-200 dark:border-slate-600">
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-medium">+{tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold",
                      int.status === 'PENDENTE' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      int.status === 'EM_ANDAMENTO' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                      int.status === 'CONCLUIDA' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                    )}>
                      {int.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {int.criado_at ? new Date(int.criado_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
                
                {/* Observação existente */}
                {int.observacoes && (
                  <div className="ml-6 mt-2 p-2 bg-gray-50 dark:bg-slate-700 rounded text-xs text-gray-600 dark:text-slate-300 border-l-2 border-blue-400">
                    📝 {int.observacoes}
                  </div>
                )}

                {/* Indicador de Ciclo e Prazo (6 meses) */}
                {int.data_limite && (
                  <div className="ml-6 mt-2">
                    {(() => {
                      const hoje = new Date();
                      const limite = new Date(int.data_limite);
                      const inicio = new Date(int.criado_at || int.data_intervencao);
                      const diffDias = (limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
                      const mesesPassados = Math.max(0, Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                      
                      let cor = "text-green-600 dark:text-green-400";
                      let icone = "🟢";
                      let texto = "No prazo";
                      
                      if (diffDias < 30) {
                        cor = "text-red-600 dark:text-red-400";
                        icone = "🔴";
                        texto = "Vencendo!";
                      } else if (diffDias < 90) {
                        cor = "text-amber-600 dark:text-amber-400";
                        icone = "🟡";
                        texto = "Atenção";
                      }
                      
                      return (
                        <div className={cn("text-xs font-medium flex items-center gap-2 flex-wrap", cor)}>
                          <span>{icone} {texto}</span>
                          <span className="text-gray-400 dark:text-slate-500">• Mês {mesesPassados}/6</span>
                          <span className="text-gray-400 dark:text-slate-500">• Fim: {limite.toLocaleDateString('pt-BR')}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                {/* Ações rápidas */}
                <div className="ml-6 mt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleAtualizarStatus(int)}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    ✏️ Atualizar Status
                  </button>
                  {int.status === 'PENDENTE' && (
                    <button
                      onClick={() => handleMudarStatusIntervencao(int.id, 'EM_ANDAMENTO')}
                      className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      ▶️ Iniciar
                    </button>
                  )}
                  {int.status === 'EM_ANDAMENTO' && (
                    <button
                      onClick={() => handleMudarStatusIntervencao(int.id, 'CONCLUIDA')}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      ✅ Concluir
                    </button>
                  )}
                  <button
                    onClick={() => handleExcluirIntervencao(int.id)}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            );})}
          </div>
        </div>
      )}
    </div>
  );
}
