/**
 * Página de Planos de Ação
 * SAPEE DEWAS - Sistema de Planos de Ação por Curso e Nível de Risco
 */

import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import { NivelRisco } from '../types';

interface PlanoAcao {
  id: number;
  curso_id: number | null;
  curso?: {
    id: number;
    nome: string;
    modalidade: string;
  } | null;
  nivel_risco: NivelRisco;
  meta_frequencia_minima: number;
  meta_media_minima: number;
  prazo_dias: number;
  acoes_recomendadas: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_at: string;
}

interface Curso {
  id: number;
  nome: string;
  modalidade: string;
}

const ACOES_PADRAO = [
  "Convocar aluno para reunião com coordenador",
  "Contatar família/responsável",
  "Encaminhar para serviço psicossocial",
  "Oferecer monitoria nas disciplinas críticas",
  "Avaliar concessão de auxílio emergencial",
  "Incluir em programa de apoio acadêmico",
  "Agendar acompanhamento quinzenal",
  "Solicitar avaliação pedagógica",
  "Encaminhar para orientação profissional",
  "Propor plano de estudos individualizado"
];

export default function PlanosAcao() {
  const { addToast } = useToast();
  const { token } = useAuth();
  
  const [planos, setPlanos] = useState<PlanoAcao[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoAcao | null>(null);
  
  // Form state
  const [cursoId, setCursoId] = useState('');
  const [nivelRisco, setNivelRisco] = useState<NivelRisco>(NivelRisco.BAIXO);
  const [metaFrequencia, setMetaFrequencia] = useState(75);
  const [metaMedia, setMetaMedia] = useState(6.0);
  const [prazoDias, setPrazoDias] = useState(30);
  const [acoesSelecionadas, setAcoesSelecionadas] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    loadPlanos();
    loadCursos();
  }, []);

  const loadPlanos = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/planos-acao?ativo=true`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPlanos(data);
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
    } catch (error: any) {
      console.error('Erro ao carregar cursos:', error);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: 'Não foi possível carregar lista de cursos',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cursoId) {
      addToast({ type: 'error', title: 'Erro', message: 'Selecione um curso' });
      return;
    }

    const data = {
      curso_id: parseInt(cursoId),
      nivel_risco: nivelRisco,
      meta_frequencia_minima: metaFrequencia,
      meta_media_minima: metaMedia,
      prazo_dias: prazoDias,
      acoes_recomendadas: JSON.stringify(acoesSelecionadas),
      observacoes: observacoes || null
    };

    try {
      const url = editingPlano
        ? `${import.meta.env.VITE_API_URL}/planos-acao/${editingPlano.id}`
        : `${import.meta.env.VITE_API_URL}/planos-acao`;
      
      const method = editingPlano ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: editingPlano ? 'Atualizado' : 'Criado',
          message: `Plano de ação ${editingPlano ? 'atualizado' : 'criado'} com sucesso`
        });
        
        setShowModal(false);
        setEditingPlano(null);
        resetForm();
        loadPlanos();
      } else {
        const error = await response.json();
        addToast({
          type: 'error',
          title: 'Erro',
          message: error.detail || 'Erro ao salvar plano'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro',
        message: error.message
      });
    }
  };

  const handleEdit = (plano: PlanoAcao) => {
    setEditingPlano(plano);
    setCursoId(plano.curso_id?.toString() || '');
    setNivelRisco(plano.nivel_risco);
    setMetaFrequencia(plano.meta_frequencia_minima);
    setMetaMedia(plano.meta_media_minima);
    setPrazoDias(plano.prazo_dias);
    setAcoesSelecionadas(plano.acoes_recomendadas ? JSON.parse(plano.acoes_recomendadas) : []);
    setObservacoes(plano.observacoes || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja desativar este plano?')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/planos-acao/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        addToast({ type: 'success', title: 'Desativado', message: 'Plano desativado com sucesso' });
        loadPlanos();
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const resetForm = () => {
    setCursoId('');
    setNivelRisco(NivelRisco.BAIXO);
    setMetaFrequencia(75);
    setMetaMedia(6.0);
    setPrazoDias(30);
    setAcoesSelecionadas([]);
    setObservacoes('');
  };

  const toggleAcao = (acao: string) => {
    setAcoesSelecionadas(prev =>
      prev.includes(acao)
        ? prev.filter(a => a !== acao)
        : [...prev, acao]
    );
  };

  const getRiscoColor = (nivel: string) => {
    switch (nivel) {
      case 'ALTO': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'MEDIO': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'BAIXO': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Planos de Ação</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Configure ações padronizadas por curso e nível de risco</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPlano(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Plano
        </button>
      </div>

      {/* Lista de Planos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 dark:text-slate-400 mt-4">Carregando planos...</p>
          </div>
        ) : planos.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-2xl">
            <Target className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-300 font-medium">Nenhum plano cadastrado</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Crie planos de ação para cada curso e nível de risco</p>
          </div>
        ) : (
          planos.map((plano) => {
            // Fazer parse das ações recomendadas
            let acoesParseadas: string[] = [];
            try {
              acoesParseadas = plano.acoes_recomendadas ? JSON.parse(plano.acoes_recomendadas) : [];
            } catch (e) {
              console.error('Erro ao parsear ações:', e);
              acoesParseadas = [];
            }
            
            return (
              <motion.div
                key={plano.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Header do Card */}
                <div className={cn(
                  "p-4 border-b flex items-center justify-between",
                  getRiscoColor(plano.nivel_risco)
                )}>
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5" />
                    <div>
                      <h3 className="font-bold">{plano.curso?.nome || 'Plano Genérico (Todos os Cursos)'}</h3>
                      <p className="text-sm opacity-80">{plano.curso?.modalidade || 'Aplicável a todos os cursos'}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold bg-white/80 dark:bg-slate-800/80",
                    getRiscoColor(plano.nivel_risco)
                  )}>
                    Risco {plano.nivel_risco}
                  </span>
                </div>

                {/* Corpo do Card */}
                <div className="p-4 space-y-4">
                  {/* Metas */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Meta Frequência</p>
                      <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{plano.meta_frequencia_minima}%</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Meta Média</p>
                      <p className="text-xl font-bold text-green-800 dark:text-green-300">{plano.meta_media_minima}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Prazo</p>
                      <p className="text-xl font-bold text-purple-800 dark:text-purple-300">{plano.prazo_dias} dias</p>
                    </div>
                  </div>

                  {/* Ações Recomendadas */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Ações Recomendadas ({acoesParseadas.length})
                    </p>
                    <div className="space-y-1">
                      {acoesParseadas.slice(0, 3).map((acao: string, i: number) => (
                        <p key={i} className="text-sm text-gray-600 dark:text-slate-400 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          {acao}
                        </p>
                      ))}
                      {acoesParseadas.length > 3 && (
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          +{acoesParseadas.length - 3} ações adicionais
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Observações */}
                  {plano.observacoes && (
                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                      <p className="text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">Observações:</p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">{plano.observacoes}</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <button
                      onClick={() => handleEdit(plano)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(plano.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Desativar
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-blue-600 to-blue-700">
              <h3 className="text-xl font-bold text-white">
                {editingPlano ? 'Editar Plano de Ação' : 'Novo Plano de Ação'}
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                Configure ações padronizadas para intervenção
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Curso e Nível de Risco */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Curso *
                  </label>
                  <select
                    value={cursoId}
                    onChange={(e) => setCursoId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  >
                    <option value="">Selecione um curso...</option>
                    {cursos.map((curso) => (
                      <option key={curso.id} value={curso.id.toString()}>
                        {curso.nome} ({curso.modalidade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Nível de Risco *
                  </label>
                  <select
                    value={nivelRisco}
                    onChange={(e) => setNivelRisco(e.target.value as NivelRisco)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  >
                    <option value="BAIXO">BAIXO</option>
                    <option value="MEDIO">MÉDIO</option>
                    <option value="ALTO">ALTO</option>
                  </select>
                </div>
              </div>

              {/* Metas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Meta Frequência (%)
                  </label>
                  <input
                    type="number"
                    value={metaFrequencia}
                    onChange={(e) => setMetaFrequencia(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Meta Média
                  </label>
                  <input
                    type="number"
                    value={metaMedia}
                    onChange={(e) => setMetaMedia(Number(e.target.value))}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Prazo (dias)
                  </label>
                  <input
                    type="number"
                    value={prazoDias}
                    onChange={(e) => setPrazoDias(Number(e.target.value))}
                    min="1"
                    max="365"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Ações Recomendadas */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Ações Recomendadas
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50 dark:bg-slate-800">
                  {ACOES_PADRAO.map((acao, index) => (
                    <label key={index} className="flex items-start gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={acoesSelecionadas.includes(acao)}
                        onChange={() => toggleAcao(acao)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">{acao}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                  {acoesSelecionadas.length} ação(ões) selecionada(s)
                </p>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  placeholder="Observações adicionais sobre o plano..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all"
                >
                  {editingPlano ? 'Atualizar' : 'Criar'} Plano
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
