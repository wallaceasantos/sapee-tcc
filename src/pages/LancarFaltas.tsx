/**
 * Página de Lançamento de Faltas Diárias
 * SAPEE DEWAS - Sistema de Faltas Consecutivas
 */

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, CheckCircle, XCircle, AlertTriangle, Save, User, BookOpen, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Aluno {
  matricula: string;
  nome: string;
  curso?: {
    nome: string;
  };
}

export default function LancarFaltas() {
  const { addToast } = useToast();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunosFiltrados, setAlunosFiltrados] = useState<Aluno[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [busca, setBusca] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingAlunos, setIsLoadingAlunos] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [disciplina, setDisciplina] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [justificada, setJustificada] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Carregar alunos ao montar
  useEffect(() => {
    loadAlunos();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar alunos conforme busca
  useEffect(() => {
    if (busca.length >= 2) {
      const filtrados = alunos.filter(aluno => 
        aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
        aluno.matricula.includes(busca) ||
        aluno.curso?.nome.toLowerCase().includes(busca.toLowerCase())
      );
      setAlunosFiltrados(filtrados.slice(0, 50)); // Limita a 50 resultados
    } else {
      setAlunosFiltrados(alunos.slice(0, 50)); // Mostra primeiros 50
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Registrar falta
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
        message: 'Falta registrada com sucesso'
      });

      // Verificar se gerou alerta de faltas consecutivas
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${alunoSelecionado.matricula}/faltas-consecutivas`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const dados = await response.json();
        
        if (dados.nivel_alerta) {
          addToast({
            type: dados.nivel_alerta === '10_FALTAS' ? 'error' : 'warning',
            title: `Alerta: ${dados.nivel_alerta.replace('_', ' ')}`,
            message: `Aluno possui ${dados.total_consecutivas} faltas consecutivas!`
          });
        }
      }

      // Limpar formulário
      setDisciplina('');
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Lançar Faltas</h1>
          <p className="text-gray-500 mt-1">Registre faltas diárias e acompanhe alertas</p>
        </div>
        <button
          onClick={() => navigate('/faltas/alertas')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-xl font-bold hover:bg-orange-200 transition-all"
        >
          <AlertTriangle className="w-5 h-5" />
          Ver Alertas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Nova Falta
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Aluno - COM BUSCA */}
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

                  {/* Dropdown com Resultados */}
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
                            {alunosFiltrados.length >= 50 && (
                              <div className="p-3 text-center text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700">
                                {alunos.length > 50
                                  ? `+${alunos.length - 50} alunos. Refine sua busca...`
                                  : ''}
                              </div>
                            )}
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
                      <span className="font-bold">Aluno selecionado:</span> {alunoSelecionado.nome}
                    </div>
                  </div>
                )}
              </div>

              {/* Disciplina */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Disciplina *
                </label>
                <input
                  type="text"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Ex: Matemática, Português..."
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Data */}
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
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
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

              {/* Motivo (se justificada) */}
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
                    placeholder="Ex: Atestado médico, motivo familiar..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDisciplina('');
                    setJustificada(false);
                    setMotivo('');
                    setAlunoSelecionado(null);
                    setBusca('');
                  }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Registrar Falta
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Informações */}
        <div className="space-y-6">
          {/* Níveis de Alerta */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6"
          >
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Níveis de Alerta
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-800 dark:text-yellow-300">3 FALTAS</span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Notificar coordenador do curso
                </p>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-bold text-orange-800 dark:text-orange-300">5 FALTAS</span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Acionar psicossocial + contato com família
                </p>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-bold text-red-800 dark:text-red-300">10 FALTAS</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-400">
                  Intervenção URGENTE - Risco iminente de evasão
                </p>
              </div>
            </div>
          </motion.div>

          {/* Dicas */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-50 dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-3">💡 Dicas</h3>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Busque por nome, matrícula ou curso</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Registre faltas diariamente para melhor acompanhamento</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Justifique faltas com atestados quando possível</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
