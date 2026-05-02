/**
 * Página de Lançamento de Faltas - CONSOLIDADA
 * SAPEE DEWAS - Sistema de Faltas Diárias com Lista de Presença
 * 
 * Funcionalidades:
 * - Registro individual de falta (por aluno/disciplina)
 * - Registro em lote (lista de presença da turma)
 * - Verificação automática de alertas de faltas consecutivas
 * - Filtro por data e disciplina
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, CheckCircle, XCircle, AlertTriangle, Save, Search, X, Users, ListChecks, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

// ============================================
// INTERFACES
// ============================================

interface Aluno {
  matricula: string;
  nome: string;
  curso?: {
    nome: string;
  };
}

interface AlunoPresenca {
  aluno: Aluno;
  presente: boolean;
  justificada?: boolean;
  motivo?: string;
}

type ModoLancamento = 'individual' | 'lote';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LancarFaltas() {
  const { addToast } = useToast();
  const { token } = useAuth();
  const navigate = useNavigate();

  // Estados gerais
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [modoLancamento, setModoLancamento] = useState<ModoLancamento>('individual');
  const [isLoadingAlunos, setIsLoadingAlunos] = useState(false);

  // Estados para modo individual
  const [alunosFiltrados, setAlunosFiltrados] = useState<Aluno[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [busca, setBusca] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estados para modo lote
  const [cursoSelecionado, setCursoSelecionado] = useState<string>('');
  const [listaPresenca, setListaPresenca] = useState<AlunoPresenca[]>([]);

  // Estados comuns
  const [disciplina, setDisciplina] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [justificada, setJustificada] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ============================================
  // CARREGAR ALUNOS
  // ============================================

  useEffect(() => {
    loadAlunos();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (busca.length >= 2) {
      const filtrados = alunos.filter(aluno =>
        aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
        aluno.matricula.includes(busca) ||
        aluno.curso?.nome.toLowerCase().includes(busca.toLowerCase())
      );
      setAlunosFiltrados(filtrados.slice(0, 50));
    } else {
      setAlunosFiltrados(alunos.slice(0, 50));
    }
  }, [busca, alunos]);

  const loadAlunos = async () => {
    if (!token) return;

    setIsLoadingAlunos(true);
    try {
      const data = await api.alunos.list(token, 0, 1000);
      setAlunos(data);
      setAlunosFiltrados(data.slice(0, 50));
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: error.message
      });
    } finally {
      setIsLoadingAlunos(false);
    }
  };

  // ============================================
  // MODO INDIVIDUAL
  // ============================================

  const handleSelectAluno = (aluno: Aluno) => {
    setAlunoSelecionado(aluno);
    setBusca(`${aluno.nome} (${aluno.matricula})`);
    setShowDropdown(false);
  };

  const handleClearAluno = () => {
    setAlunoSelecionado(null);
    setBusca('');
    setShowDropdown(false);
  };

  const handleSubmitIndividual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!alunoSelecionado || !disciplina || !data) {
      addToast({
        type: 'error',
        title: 'Campos obrigatórios',
        message: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    setIsSaving(true);

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${alunoSelecionado.matricula}/faltas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            disciplina,
            data,
            justificada,
            motivo_justificativa: justificada ? motivo : null,
          }),
        }
      );

      addToast({
        type: 'success',
        title: 'Falta registrada',
        message: `Falta de ${alunoSelecionado.nome} registrada com sucesso`
      });

      // Verificar alertas de faltas consecutivas
      verificarAlertas(alunoSelecionado.matricula);

      // Limpar formulário
      setJustificada(false);
      setMotivo('');
      setAlunoSelecionado(null);
      setBusca('');

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao registrar',
        message: error.message || 'Erro ao registrar falta'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // MODO LOTE (Lista de Presença)
  // ============================================

  const gerarListaPresenca = () => {
    if (!cursoSelecionado) {
      addToast({
        type: 'warning',
        title: 'Selecione um curso',
        message: 'Escolha um curso para gerar a lista de presença'
      });
      return;
    }

    const alunosCurso = alunos.filter(a => 
      a.curso?.nome === cursoSelecionado
    );

    if (alunosCurso.length === 0) {
      addToast({
        type: 'warning',
        title: 'Sem alunos',
        message: 'Nenhum aluno encontrado para este curso'
      });
      return;
    }

    const lista = alunosCurso.map(aluno => ({
      aluno,
      presente: true, // Todos presentes por padrão
      justificada: false,
      motivo: ''
    }));

    setListaPresenca(lista);
    addToast({
      type: 'success',
      title: 'Lista gerada',
      message: `${alunosCurso.length} alunos na lista de presença`
    });
  };

  const togglePresenca = (matricula: string) => {
    setListaPresenca(prev => prev.map(item =>
      item.aluno.matricula === matricula
        ? { ...item, presente: !item.presente, justificada: false, motivo: '' }
        : item
    ));
  };

  const toggleJustificativa = (matricula: string) => {
    setListaPresenca(prev => prev.map(item =>
      item.aluno.matricula === matricula
        ? { ...item, justificada: !item.justificada, motivo: '' }
        : item
    ));
  };

  const salvarListaPresenca = async () => {
    const ausentes = listaPresenca.filter(item => !item.presente);

    if (ausentes.length === 0) {
      addToast({
        type: 'info',
        title: 'Todos presentes',
        message: 'Nenhuma falta para registrar'
      });
      return;
    }

    if (!disciplina || !data) {
      addToast({
        type: 'error',
        title: 'Campos obrigatórios',
        message: 'Preencha a disciplina e data'
      });
      return;
    }

    setIsSaving(true);

    try {
      let sucessos = 0;
      let erros = 0;

      for (const item of ausentes) {
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${item.aluno.matricula}/faltas`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                disciplina,
                data,
                justificada: item.justificada || false,
                motivo_justificativa: item.justificada ? item.motivo : null,
              }),
            }
          );
          sucessos++;
        } catch {
          erros++;
        }
      }

      // Verificar alertas para cada ausente
      for (const item of ausentes) {
        verificarAlertas(item.aluno.matricula);
      }

      addToast({
        type: erros > 0 ? 'warning' : 'success',
        title: `${sucessos} falta(s) registrada(s)`,
        message: erros > 0 ? `${erros} erro(s) ao registrar` : 'Todas as faltas registradas com sucesso'
      });

      setListaPresenca([]);
      setCursoSelecionado('');

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: error.message || 'Erro ao salvar lista de presença'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // VERIFICAR ALERTAS
  // ============================================

  const verificarAlertas = async (matricula: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${matricula}/faltas-consecutivas`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const dados = await response.json();
        if (dados.nivel_alerta) {
          const aluno = alunos.find(a => a.matricula === matricula);
          addToast({
            type: dados.nivel_alerta === '10_FALTAS' ? 'error' : 'warning',
            title: `⚠️ Alerta: ${dados.nivel_alerta.replace('_', ' ')}`,
            message: `${aluno?.nome || 'Aluno'} possui ${dados.total_consecutivas} faltas consecutivas!`
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
    }
  };

  // ============================================
  // CURSOS DISPONÍVEIS
  // ============================================

  const cursos = useMemo(() => {
    return Array.from(new Set(alunos.map(a => a.curso?.nome).filter(Boolean))).sort();
  }, [alunos]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Lançar Faltas</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-1">Registre faltas diárias e acompanhe alertas</p>
        </div>
        <button
          onClick={() => navigate('/faltas/alertas')}
          className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 rounded-xl font-bold hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-all text-sm md:text-base min-h-11"
        >
          <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
          <span className="truncate">Ver Alertas</span>
        </button>
      </div>

      {/* Seletor de Modo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModoLancamento('individual')}
            className={cn(
              "px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-h-11",
              modoLancamento === 'individual'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            )}
          >
            <FileText className="w-4 h-4" />
            Individual
          </button>
          <button
            onClick={() => setModoLancamento('lote')}
            className={cn(
              "px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-h-11",
              modoLancamento === 'lote'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            )}
          >
            <ListChecks className="w-4 h-4" />
            Lista de Presença
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* MODO INDIVIDUAL */}
      {/* ============================================ */}
      {modoLancamento === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6"
            >
              <h2 className="text-base md:text-xl font-bold text-gray-800 dark:text-white mb-4 md:mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                Registrar Falta Individual
              </h2>

              <form onSubmit={handleSubmitIndividual} className="space-y-6">
                {/* Aluno */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Aluno *
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
                      <input
                        type="text"
                        value={busca}
                        onChange={(e) => {
                          setBusca(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Buscar por nome, matrícula ou curso..."
                        required
                        className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      />
                      {alunoSelecionado && (
                        <button
                          type="button"
                          onClick={handleClearAluno}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-80 overflow-y-auto"
                        >
                          {isLoadingAlunos ? (
                            <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                              Carregando alunos...
                            </div>
                          ) : alunosFiltrados.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                              Nenhum aluno encontrado
                            </div>
                          ) : (
                            <div className="py-2">
                              {alunosFiltrados.map((aluno) => (
                                <button
                                  key={aluno.matricula}
                                  type="button"
                                  onClick={() => handleSelectAluno(aluno)}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
                                >
                                  <div className="font-medium text-gray-900 dark:text-white">{aluno.nome}</div>
                                  <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                                    <span>Mat: {aluno.matricula}</span>
                                    <span>•</span>
                                    <span>{aluno.curso?.nome || 'Sem curso'}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {alunoSelecionado && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                      <div className="text-sm text-green-800 dark:text-green-300">
                        <span className="font-bold">Selecionado:</span> {alunoSelecionado.nome}
                      </div>
                    </div>
                  )}
                </div>

                {/* Disciplina e Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Disciplina *
                    </label>
                    <input
                      type="text"
                      value={disciplina}
                      onChange={(e) => setDisciplina(e.target.value)}
                      placeholder="Ex: Matemática"
                      required
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Data *
                    </label>
                    <input
                      type="date"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Justificada */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="justificada"
                    checked={justificada}
                    onChange={(e) => setJustificada(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
                  />
                  <label htmlFor="justificada" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Falta justificada?
                  </label>
                </div>

                {justificada && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Motivo da Justificativa
                    </label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={3}
                      placeholder="Ex: Atestado médico..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDisciplina('');
                      setJustificada(false);
                      setMotivo('');
                      setAlunoSelecionado(null);
                      setBusca('');
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all min-h-11"
                  >
                    Limpar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-11"
                  >
                    {isSaving ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                    ) : (
                      <><Save className="w-5 h-5" /> Registrar Falta</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Sidebar - Níveis de Alerta */}
          <div className="space-y-4 md:space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6"
            >
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                Níveis de Alerta
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-800 dark:text-yellow-300">3 FALTAS</span>
                  </div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">Notificar coordenador</p>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-bold text-orange-800 dark:text-orange-300">5 FALTAS</span>
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-400">Acionar psicossocial + família</p>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-bold text-red-800 dark:text-red-300">10 FALTAS</span>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-400">Intervenção URGENTE</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODO LOTE (Lista de Presença) */}
      {/* ============================================ */}
      {modoLancamento === 'lote' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6"
        >
          <h2 className="text-base md:text-xl font-bold text-gray-800 dark:text-white mb-4 md:mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            Lista de Presença da Turma
          </h2>

          {/* Configurações */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Curso *
              </label>
              <select
                value={cursoSelecionado}
                onChange={(e) => setCursoSelecionado(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white min-h-11"
              >
                <option value="">Selecione o curso</option>
                {cursos.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Disciplina *
              </label>
              <input
                type="text"
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                placeholder="Ex: Matemática"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white min-h-11"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Data *
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white min-h-11"
              />
            </div>
          </div>

          {/* Botão Gerar Lista */}
          {listaPresenca.length === 0 && (
            <button
              onClick={gerarListaPresenca}
              disabled={!cursoSelecionado}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-11"
            >
              <ListChecks className="w-5 h-5" />
              Gerar Lista de Presença
            </button>
          )}

          {/* Lista de Presença */}
          {listaPresenca.length > 0 && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
                    {listaPresenca.length} alunos
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✓ {listaPresenca.filter(i => i.presente).length} presentes
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    ✗ {listaPresenca.filter(i => !i.presente).length} ausentes
                  </span>
                </div>
                <button
                  onClick={() => setListaPresenca([])}
                  className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold"
                >
                  Limpar lista
                </button>
              </div>

              {/* Tabela de Presença */}
              <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Aluno</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-24">Presença</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-24">Justificada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {listaPresenca.map((item) => (
                        <tr key={item.aluno.matricula} className={cn(
                          "transition-colors",
                          item.presente ? "bg-white dark:bg-slate-900" : "bg-red-50 dark:bg-red-900/10"
                        )}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.aluno.nome}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">{item.aluno.matricula}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => togglePresenca(item.aluno.matricula)}
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                item.presente
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                              )}
                            >
                              {item.presente ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!item.presente && (
                              <button
                                onClick={() => toggleJustificativa(item.aluno.matricula)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                  item.justificada
                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                                )}
                              >
                                {item.justificada ? 'Sim' : 'Não'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão Salvar */}
              <button
                onClick={salvarListaPresenca}
                disabled={isSaving || listaPresenca.filter(i => !i.presente).length === 0}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-11"
              >
                {isSaving ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-5 h-5" /> Registrar {listaPresenca.filter(i => !i.presente).length} Falta(s)</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
