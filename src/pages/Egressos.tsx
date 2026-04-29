/**
 * Página de Egressos - Alunos que Saíram
 * SAPEE DEWAS - Acompanhamento de ex-alunos
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';

interface Egresso {
  id: number;
  aluno_matricula: string;
  aluno_nome: string;
  curso: string;
  data_saida: string;
  motivo_saida: string;
  motivo_abandono_principal?: string;
  tinha_predicao_risco: boolean;
  nivel_risco_predito?: string;
  recebeu_intervencao: boolean;
}

interface Estatisticas {
  total_egressos: number;
  total_abandonos: number;
  abandonos_preditos: number;
  percentual_predicao_correta: number;
}

export const Egressos: React.FC = () => {
  const { addToast } = useToast();
  const [egressos, setEgressos] = useState<Egresso[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [filtroMotivo, setFiltroMotivo] = useState<string>('todos');

  // Form state
  const [formData, setFormData] = useState({
    aluno_matricula: '',
    data_saida: new Date().toISOString().split('T')[0],
    motivo_saida: 'ABANDONO',
    motivo_detalhes: '',
    motivo_abandono_principal: 'FINANCEIRO',
  });

  useEffect(() => {
    carregarEgressos();
  }, []);

  const carregarEgressos = async () => {
    try {
      setCarregando(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Carregar egressos
      const response = await fetch(`${API_URL}/egressos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sapee_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEgressos(data.egressos || []);
        setEstatisticas(data.estatisticas || null);
      }
    } catch (erro) {
      console.error('Erro ao carregar egressos:', erro);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: 'Não foi possível carregar dados de egressos',
      });
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_URL}/egressos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sapee_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Egresso cadastrado com sucesso!');
        setMostrarForm(false);
        carregarEgressos();
        setFormData({
          aluno_matricula: '',
          data_saida: new Date().toISOString().split('T')[0],
          motivo_saida: 'ABANDONO',
          motivo_detalhes: '',
          motivo_abandono_principal: 'FINANCEIRO',
        });
      } else {
        const error = await response.json();
        alert(error.detail || 'Erro ao cadastrar');
      }
    } catch (erro) {
      alert('Erro ao cadastrar egresso');
    }
  };

  const egressosFiltrados = filtroMotivo === 'todos' 
    ? egressos 
    : egressos.filter(e => e.motivo_saida === filtroMotivo);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            Egressos - Alunos que Saíram
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Acompanhe ex-alunos e meça a eficácia do SAPEE
          </p>
        </div>

        {/* Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total de Egressos</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{estatisticas.total_egressos}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-lg p-6">
              <p className="text-sm text-red-600 dark:text-red-400 mb-1">Abandonos</p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-400">{estatisticas.total_abandonos}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl shadow-lg p-6">
              <p className="text-sm text-green-600 dark:text-green-400 mb-1">Abandonos Preditos</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">{estatisticas.abandonos_preditos}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-lg p-6">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Precisão da Predição</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{estatisticas.percentual_predicao_correta}%</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {mostrarForm ? 'Cadastrar Egresso' : 'Egressos'}
                </h2>
                <button
                  onClick={() => setMostrarForm(!mostrarForm)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {mostrarForm ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              </div>

              {mostrarForm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Matrícula */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Aluno (Matrícula) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.aluno_matricula}
                      onChange={(e) => setFormData({...formData, aluno_matricula: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="2024101001"
                    />
                  </div>

                  {/* Data de Saída */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Data de Saída *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.data_saida}
                      onChange={(e) => setFormData({...formData, data_saida: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Motivo da Saída */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Motivo da Saída *
                    </label>
                    <select
                      required
                      value={formData.motivo_saida}
                      onChange={(e) => setFormData({...formData, motivo_saida: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TRANSFERENCIA">Transferência</option>
                      <option value="ABANDONO">Abandono</option>
                      <option value="CONCLUSAO">Conclusão</option>
                      <option value="TRANCAMENTO">Trancamento</option>
                      <option value="JUBILAMENTO">Jubilamento</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>

                  {/* Motivo de Abandono (se aplicável) */}
                  {formData.motivo_saida === 'ABANDONO' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Motivo do Abandono *
                      </label>
                      <select
                        required
                        value={formData.motivo_abandono_principal}
                        onChange={(e) => setFormData({...formData, motivo_abandono_principal: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="FINANCEIRO">Financeiro</option>
                        <option value="SAUDE">Saúde</option>
                        <option value="FAMILIA">Família</option>
                        <option value="TRABALHO">Trabalho</option>
                        <option value="DIFICULDADE_ACADEMICA">Dificuldade Acadêmica</option>
                        <option value="FALTA_INTERESSE">Falta de Interesse</option>
                        <option value="OUTROS">Outros</option>
                      </select>
                    </div>
                  )}

                  {/* Detalhes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Detalhes
                    </label>
                    <textarea
                      value={formData.motivo_detalhes}
                      onChange={(e) => setFormData({...formData, motivo_detalhes: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Observações adicionais..."
                    />
                  </div>

                  {/* Botão Salvar */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Cadastrar Egresso
                    </span>
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {egressos.length} egressos cadastrados
                  </p>
                  <button
                    onClick={() => setMostrarForm(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    Cadastrar Novo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista de Egressos */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Lista de Egressos
                </h2>
                
                {/* Filtros */}
                <select
                  value={filtroMotivo}
                  onChange={(e) => setFiltroMotivo(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Motivos</option>
                  <option value="ABANDONO">Abandono</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="CONCLUSAO">Conclusão</option>
                  <option value="TRANCAMENTO">Trancamento</option>
                </select>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Aluno
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Curso
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Saída
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Motivo
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Predição
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {egressosFiltrados.length > 0 ? (
                      egressosFiltrados.map(egresso => (
                        <tr
                          key={egresso.id}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">
                                {egresso.aluno_nome}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {egresso.aluno_matricula}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                            {egresso.curso}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                            {new Date(egresso.data_saida).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              egresso.motivo_saida === 'ABANDONO'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : egresso.motivo_saida === 'TRANSFERENCIA'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : egresso.motivo_saida === 'CONCLUSAO'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                              {egresso.motivo_saida}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {egresso.tinha_predicao_risco ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {egresso.nivel_risco_predito}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          Nenhum egresso encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Egressos;
