/**
 * Página de Lançamento Mensal de Frequência
 * SAPEE DEWAS Frontend
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, AlertCircle, Loader2, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../components/ui/Toast';
import { useAlunos } from '../hooks/useAlunos';
import { useAuth } from '../services/AuthContext';

interface AlunoSelecionado {
  matricula: string;
  nome: string;
  curso: string;
  frequencia: number;
  faltas_justificadas: number;
  faltas_nao_justificadas: number;
  total_aulas_mes: number;
}

export default function LancarFrequencia() {
  const { addToast } = useToast();
  const { user, can } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [curso, setCurso] = useState('');
  
  // Dados do lançamento
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [observacoes, setObservacoes] = useState('');
  const [erroAnoMes, setErroAnoMes] = useState<string | null>(null);
  
  // Calcular ano mínimo e máximo
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;  // 1-12
  const anoMinimo = anoAtual - 1;  // Ano anterior (correções)
  const anoMaximo = anoAtual;      // Ano atual (apenas meses já iniciados)
  
  // Nomes dos meses para mensagens
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  // Validar ano e mês
  const validarAnoMes = (anoSelecionado: number, mesSelecionado: number) => {
    // Futuro: NUNCA
    if (anoSelecionado > anoAtual) {
      return `Não é possível lançar frequência de ${anoSelecionado}. Ano futuro não permitido.`;
    }
    
    // Ano atual: só até mês atual
    if (anoSelecionado === anoAtual && mesSelecionado > mesAtual) {
      return `Não é possível lançar ${nomesMeses[mesSelecionado-1]}/${anoSelecionado}. Este mês ainda não iniciou. Estamos em ${nomesMeses[mesAtual-1]}.`;
    }
    
    // Ano anterior: permite (correções)
    if (anoSelecionado === anoAtual - 1) {
      return null;  // Válido
    }
    
    // Muito antigo: não permite
    if (anoSelecionado < anoAtual - 1) {
      return `Ano ${anoSelecionado} muito antigo. Permitido: ${anoAtual-1} (correções) e ${anoAtual} (até ${nomesMeses[mesAtual-1]}).`;
    }
    
    return null;  // Válido
  };
  
  // Alunos selecionados
  const [alunosSelecionados, setAlunosSelecionados] = useState<AlunoSelecionado[]>([]);
  
  // Carregar alunos da API
  const { data: alunos, isLoading: loadingAlunos } = useAlunos({
    skip: 0,
    limit: 1000,
  });
  
  // Verificar permissão
  useEffect(() => {
    if (user && !can('alunos', 'update')) {
      addToast({
        type: 'error',
        title: 'Permissão negada',
        message: 'Apenas ADMIN e COORDENADOR podem lançar frequência.',
      });
    }
  }, [user, can, addToast]);
  
  // Filtrar alunos
  const alunosFiltrados = alunos.filter(aluno => {
    const matchesBusca = aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
                         aluno.matricula.toLowerCase().includes(busca.toLowerCase());
    const alunoCurso = aluno.curso?.nome || '';
    const matchesCurso = !curso || alunoCurso === curso;
    return matchesBusca && matchesCurso;
  });
  
  // Selecionar/desmarcar aluno
  const toggleAluno = (aluno: any) => {
    const jaSelecionado = alunosSelecionados.find(a => a.matricula === aluno.matricula);
    
    if (jaSelecionado) {
      setAlunosSelecionados(prev => prev.filter(a => a.matricula !== aluno.matricula));
    } else {
      setAlunosSelecionados(prev => [
        ...prev,
        {
          matricula: aluno.matricula,
          nome: aluno.nome,
          curso: aluno.curso?.nome || 'N/A',
          frequencia: aluno.frequencia || 0,
          faltas_justificadas: 0,
          faltas_nao_justificadas: 0,
          total_aulas_mes: 20,
        },
      ]);
    }
  };
  
  // Atualizar frequência do aluno
  const atualizarFrequencia = (matricula: string, frequencia: number) => {
    setAlunosSelecionados(prev => prev.map(aluno =>
      aluno.matricula === matricula ? { ...aluno, frequencia } : aluno
    ));
  };
  
  // Atualizar faltas
  const atualizarFaltas = (matricula: string, tipo: 'justificadas' | 'nao_justificadas', valor: number) => {
    setAlunosSelecionados(prev => prev.map(aluno =>
      aluno.matricula === matricula ? { ...aluno, [`faltas_${tipo}`]: valor } : aluno
    ));
  };
  
  // Remover aluno da seleção
  const removerAluno = (matricula: string) => {
    setAlunosSelecionados(prev => prev.filter(a => a.matricula !== matricula));
  };
  
  // Salvar frequência
  const salvarFrequencia = async () => {
    if (alunosSelecionados.length === 0) {
      addToast({
        type: 'error',
        title: 'Nenhum aluno selecionado',
        message: 'Selecione pelo menos um aluno para lançar frequência.',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('sapee_token');
      
      const dados = {
        mes,
        ano,
        alunos: alunosSelecionados.map(aluno => ({
          aluno_id: aluno.matricula,
          frequencia: aluno.frequencia,
          faltas_justificadas: aluno.faltas_justificadas,
          faltas_nao_justificadas: aluno.faltas_nao_justificadas,
          total_aulas_mes: aluno.total_aulas_mes,
        })),
        observacoes: observacoes || undefined,
      };
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/frequencias/lancar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dados),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao salvar frequência');
      }
      
      const resultado = await response.json();
      
      addToast({
        type: 'success',
        title: 'Frequência lançada!',
        message: `${resultado.registros_criados} aluno(s) registrado(s) com sucesso.`,
      });
      
      // Limpar seleção
      setAlunosSelecionados([]);
      setObservacoes('');
      
    } catch (error) {
      console.error('Erro ao salvar frequência:', error);
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: error instanceof Error ? error.message : 'Erro ao salvar frequência',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Meses do ano
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  // Cursos disponíveis
  const cursos = Array.from(new Set(alunos.map(a => a.curso?.nome).filter(Boolean)));
  
  // Verificar permissão
  if (user && !can('alunos', 'update')) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">
            ⛔ Acesso Negado
          </h3>
          <p className="text-red-600 dark:text-red-300">
            Apenas ADMIN e COORDENADOR podem lançar frequência.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
            📊 Lançamento de Frequência Mensal
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
            Registre a frequência mensal dos alunos
          </p>
        </div>
      </header>

      {/* Configurações do Mês */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-slate-800">
        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
          Período de Referência
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Mês
            </label>
            <select
              value={mes}
              onChange={(e) => {
                const mesSelecionado = Number(e.target.value);
                const erro = validarAnoMes(ano, mesSelecionado);
                setErroAnoMes(erro);
                setMes(mesSelecionado);
              }}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
            >
              {nomesMeses.map((m, i) => {
                const desabilitado = (ano === anoAtual && (i + 1) > mesAtual);
                return (
                  <option key={i} value={i + 1} disabled={desabilitado}>
                    {m} {desabilitado && '(Não iniciado)'}
                  </option>
                );
              })}
            </select>
            {erroAnoMes && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {erroAnoMes}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Ano
            </label>
            <input
              type="number"
              value={ano}
              onChange={(e) => {
                const valor = Number(e.target.value);
                const erro = validarAnoMes(valor, mes);
                setErroAnoMes(erro);
                if (!erro || valor === anoAtual - 1) {
                  setAno(valor);
                }
              }}
              min={anoMinimo}
              max={anoMaximo}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              Permitido: {anoMinimo} (correções) e {anoAtual} (até {nomesMeses[mesAtual-1]})
            </p>
            {erroAnoMes && ano !== anoAtual && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {erroAnoMes}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Observações (opcional)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Período normal de aulas"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>
      
      {/* Seleção de Alunos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-emerald-600" />
          Selecionar Alunos
        </h3>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
          />
          
          <select
            value={curso}
            onChange={(e) => setCurso(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
          >
            <option value="">Todos os cursos</option>
            {cursos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        
        {/* Lista de alunos disponíveis */}
        {loadingAlunos ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {alunosFiltrados.map(aluno => {
              const selecionado = alunosSelecionados.find(a => a.matricula === aluno.matricula);
              return (
                <div
                  key={aluno.matricula}
                  onClick={() => toggleAluno(aluno)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selecionado
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500'
                      : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{aluno.nome}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {aluno.matricula} • {aluno.curso?.nome || 'N/A'}
                      </p>
                    </div>
                    {selecionado ? (
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-slate-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Alunos Selecionados */}
      {alunosSelecionados.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
              <span className="truncate">Alunos Selecionados ({alunosSelecionados.length})</span>
            </h3>

            <button
              onClick={() => setAlunosSelecionados([])}
              className="text-xs md:text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              Limpar seleção
            </button>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {alunosSelecionados.map(aluno => (
              <div
                key={aluno.matricula}
                className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{aluno.nome}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {aluno.curso} • {aluno.matricula}
                    </p>
                  </div>
                  <button
                    onClick={() => removerAluno(aluno.matricula)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                      Frequência (%)
                    </label>
                    <input
                      type="number"
                      value={aluno.frequencia}
                      onChange={(e) => atualizarFrequencia(aluno.matricula, Number(e.target.value))}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                      Faltas Just.
                    </label>
                    <input
                      type="number"
                      value={aluno.faltas_justificadas}
                      onChange={(e) => atualizarFaltas(aluno.matricula, 'justificadas', Number(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                      Faltas Não Just.
                    </label>
                    <input
                      type="number"
                      value={aluno.faltas_nao_justificadas}
                      onChange={(e) => atualizarFaltas(aluno.matricula, 'nao_justificadas', Number(e.target.value))}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                      Total Aulas
                    </label>
                    <input
                      type="number"
                      value={aluno.total_aulas_mes}
                      onChange={(e) => setAlunosSelecionados(prev => prev.map(a =>
                        a.matricula === aluno.matricula ? { ...a, total_aulas_mes: Number(e.target.value) } : a
                      ))}
                      min="1"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Botão Salvar */}
          <div className="mt-6 flex flex-col sm:flex-row justify-end">
            <button
              onClick={salvarFrequencia}
              disabled={isSaving}
              className="px-6 md:px-8 py-3 md:py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Frequência ({meses[mes - 1]}/{ano})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
