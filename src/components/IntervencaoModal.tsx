import React, { useState, useEffect, useRef } from 'react';
import { X, Save, AlertCircle, Search, User, BookOpen, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatusIntervencao, IntervencaoCreate } from '../types';
import { cn } from '../utils';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface IntervencaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (intervencao: IntervencaoCreate) => Promise<void>;
  alunoNome: string;
  isSaving?: boolean;
  matricula?: string;
  onAlunoSelecionado?: (aluno: any) => void;
  initialValues?: {
    tipo?: string;
    descricao?: string;
    status?: StatusIntervencao;
    prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  };
}

export default function IntervencaoModal({
  isOpen,
  onClose,
  onSave,
  alunoNome,
  isSaving = false,
  matricula: matriculaProp,
  onAlunoSelecionado,
  initialValues
}: IntervencaoModalProps) {
  const { token } = useAuth();
  const [matricula, setMatricula] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Inicializar com valores das props
  useEffect(() => {
    if (isOpen) {
      if (matriculaProp) setMatricula(matriculaProp);
      if (alunoNome) setSearchTerm(alunoNome);
      if (initialValues?.tipo) setTipo(initialValues.tipo);
      if (initialValues?.descricao) setDescricao(initialValues.descricao);
      if (initialValues?.status) setStatus(initialValues.status);
      if (initialValues?.prioridade) setPrioridade(initialValues.prioridade);
    }
  }, [isOpen, matriculaProp, alunoNome, initialValues]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const [tipo, setTipo] = useState(initialValues?.tipo || '');
  const [descricao, setDescricao] = useState(initialValues?.descricao || '');
  const [status, setStatus] = useState<StatusIntervencao>(initialValues?.status || StatusIntervencao.PENDENTE);
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>(initialValues?.prioridade || 'MEDIA');

  // Inicializar com valores das props quando modal abre
  useEffect(() => {
    if (isOpen) {
      if (matriculaProp) setMatricula(matriculaProp);
      if (alunoNome) setSearchTerm(alunoNome);
      if (initialValues?.tipo) setTipo(initialValues.tipo);
      if (initialValues?.descricao) setDescricao(initialValues.descricao);
      if (initialValues?.status) setStatus(initialValues.status);
      if (initialValues?.prioridade) setPrioridade(initialValues.prioridade);
    }
  }, [isOpen, matriculaProp, alunoNome, initialValues]);

  // Busca alunos quando digita
  useEffect(() => {
    if (!token || !isOpen) return;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.alunos.buscar(token, searchTerm, 10);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error('Erro na busca:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, token, isOpen]);

  const handleSelecionarAluno = (aluno: any) => {
    setAlunoSelecionado(aluno);
    setSearchTerm(`${aluno.nome} (${aluno.matricula})`);
    setShowDropdown(false);
    setMatricula(aluno.matricula);
    if (onAlunoSelecionado) onAlunoSelecionado(aluno);

    // Sugere prioridade baseada no risco
    if (aluno.nivel_risco === 'MUITO_ALTO') {
      setPrioridade('URGENTE');
    } else if (aluno.nivel_risco === 'ALTO') {
      setPrioridade('ALTA');
    } else if (aluno.nivel_risco === 'MEDIO') {
      setPrioridade('MEDIA');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Usar matrícula: prop > estado > aluno selecionado
    const matriculaFinal = matriculaProp || matricula || alunoSelecionado?.matricula;

    if (!matriculaFinal) {
      console.error('Matrícula não definida');
      return;
    }

    await onSave({
      tipo,
      descricao,
      status,
      prioridade,
      data_intervencao: new Date().toISOString().split('T')[0],
      matricula: matriculaFinal
    } as any);

    // Reset fields
    setMatricula('');
    setTipo('');
    setDescricao('');
    setStatus(StatusIntervencao.PENDENTE);
    setPrioridade('MEDIA');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-linear-to-r from-blue-600 to-blue-700">
              <div>
                <h3 className="text-xl font-bold text-white">Registrar Intervenção</h3>
                <p className="text-sm text-blue-100 mt-1">Ação pedagógica para acompanhamento</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                disabled={isSaving}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Busca de Aluno */}
              {!alunoNome && (
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Buscar Aluno *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 pl-10 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-white"
                      placeholder="Digite nome ou matrícula..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={isSaving}
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Dropdown de resultados */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {searchResults.map((aluno) => (
                        <button
                          key={aluno.matricula}
                          type="button"
                          onClick={() => handleSelecionarAluno(aluno)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">{aluno.nome}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">{aluno.matricula} • {aluno.curso}</p>
                            </div>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-bold text-white",
                              aluno.nivel_risco === 'MUITO_ALTO' ? "bg-purple-600" :
                              aluno.nivel_risco === 'ALTO' ? "bg-red-500" :
                              aluno.nivel_risco === 'MEDIO' ? "bg-amber-500" : "bg-emerald-500"
                            )}>
                              {aluno.risco_evasao}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview do Aluno Selecionado */}
              {alunoSelecionado && (
                <div className="p-4 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-gray-800 dark:text-white">{alunoSelecionado.nome}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 ml-auto">{alunoSelecionado.matricula}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Curso</p>
                        <p className="font-medium text-gray-800 dark:text-white">{alunoSelecionado.curso}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Período</p>
                        <p className="font-medium text-gray-800 dark:text-white">{alunoSelecionado.periodo}º</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Média</p>
                        <p className={cn(
                          "font-bold",
                          alunoSelecionado.media_geral >= 7 ? "text-emerald-600" :
                          alunoSelecionado.media_geral >= 5 ? "text-amber-600" : "text-red-500"
                        )}>{alunoSelecionado.media_geral}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Frequência</p>
                        <p className={cn(
                          "font-bold",
                          alunoSelecionado.frequencia >= 85 ? "text-emerald-600" :
                          alunoSelecionado.frequencia >= 75 ? "text-amber-600" : "text-red-500"
                        )}>{alunoSelecionado.frequencia}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-slate-400">Score de Risco</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              alunoSelecionado.risco_evasao >= 80 ? "bg-purple-600" :
                              alunoSelecionado.risco_evasao >= 60 ? "bg-red-500" :
                              alunoSelecionado.risco_evasao >= 30 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${alunoSelecionado.risco_evasao}%` }}
                          />
                        </div>
                        <span className={cn(
                          "font-bold text-sm",
                          alunoSelecionado.nivel_risco === 'MUITO_ALTO' ? "text-purple-600" :
                          alunoSelecionado.nivel_risco === 'ALTO' ? "text-red-500" :
                          alunoSelecionado.nivel_risco === 'MEDIO' ? "text-amber-600" : "text-emerald-600"
                        )}>{alunoSelecionado.risco_evasao}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aluno info (quando passado via prop) */}
              {alunoNome && !alunoSelecionado && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Registrando ação para: <strong className="text-blue-900 dark:text-blue-200">{alunoNome}</strong>
                    </p>
                    {matriculaProp && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Matrícula: {matriculaProp}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!alunoNome && !alunoSelecionado && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Ou digite a Matrícula *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-white"
                    placeholder="Ex: 2024101001"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              )}

              {/* Tipo de Intervenção */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Tipo de Intervenção *
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-white"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Selecione um tipo...</option>
                  
                  {/* Reuniões e Contatos */}
                  <option value="Reunião com Aluno">🗣️ Reunião com Aluno</option>
                  <option value="Reunião com Responsáveis">👨‍👩‍👧 Reunião com Responsáveis</option>
                  <option value="Contato com Família">📞 Contato com Família</option>
                  <option value="Visita Domiciliar">🏠 Visita Domiciliar</option>
                  
                  {/* Acompanhamento Pedagógico */}
                  <option value="Acompanhamento Pedagógico">📚 Acompanhamento Pedagógico</option>
                  <option value="Monitoria Acadêmica">🎓 Monitoria Acadêmica</option>
                  <option value="Plano de Recuperação">📝 Plano de Recuperação</option>
                  <option value="Reforço Escolar">✏️ Reforço Escolar</option>
                  <option value="Orientação de Estudos">📖 Orientação de Estudos</option>
                  
                  {/* Apoio Psicossocial */}
                  <option value="Encaminhamento Psicológico">🧠 Encaminhamento Psicológico</option>
                  <option value="Apoio Emocional">💚 Apoio Emocional</option>
                  <option value="Mediação de Conflitos">🤝 Mediação de Conflitos</option>
                  <option value="Aconselhamento Individual">👤 Aconselhamento Individual</option>
                  
                  {/* Apoio Social */}
                  <option value="Auxílio Financeiro/Permanência">💰 Auxílio Financeiro/Permanência</option>
                  <option value="Encaminhamento Assistência Social">🏛️ Encaminhamento Assistência Social</option>
                  <option value="Orientação Profissional">💼 Orientação Profissional</option>
                  <option value="Inclusão Digital">💻 Inclusão Digital</option>
                  
                  {/* Outros */}
                  <option value="Outros">📋 Outros</option>
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Prioridade *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridade(p)}
                      disabled={isSaving}
                      className={cn(
                        "py-2 text-[10px] font-bold rounded-lg border transition-all",
                        prioridade === p
                          ? p === 'URGENTE'
                            ? "bg-red-600 border-red-600 text-white shadow-md"
                            : p === 'ALTA'
                            ? "bg-orange-500 border-orange-500 text-white shadow-md"
                            : p === 'MEDIA'
                            ? "bg-blue-600 border-blue-600 text-white shadow-md"
                            : "bg-green-600 border-green-600 text-white shadow-md"
                          : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600"
                      )}
                    >
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Inicial */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Status Inicial *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(StatusIntervencao).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      disabled={isSaving}
                      className={cn(
                        "py-2 text-[10px] font-bold rounded-lg border transition-all",
                        status === s
                          ? "bg-purple-600 border-purple-600 text-white shadow-md"
                          : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600"
                      )}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição da Ação */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Descrição da Ação *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="Descreva detalhadamente o que foi acordado ou realizado. Inclua: objetivos, encaminhamentos, prazos e responsáveis..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar Registro
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
