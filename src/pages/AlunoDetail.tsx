/**
 * - Dados completos do aluno
 * - Predição atual
 * - Histórico de intervenções
 * - Gráfico de evolução de risco
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, User, GraduationCap, Wallet, MapPin, AlertCircle, TrendingDown, Calendar, ClipboardList, CheckCircle2, Clock, AlertTriangle, Loader2, TrendingUp, TrendingDown as TrendingDownIcon, XCircle, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { cn, getRiscoColor } from '../utils';
import { StatusIntervencao, NivelRisco } from '../types';
import { RiskBadge, RiskProgressBar } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { logAction } from '../services/logService';
import api from '../services/api';

// Interface do Histórico de Frequência
interface FrequenciaMensal {
  id: number;
  aluno_id: string;
  mes: number;
  ano: number;
  frequencia: number;
  faltas_justificadas: number;
  faltas_nao_justificadas: number;
  total_aulas_mes: number;
  observacoes?: string;
  data_registro: string;
}

// Interface do Aluno (API)
interface Aluno {
  matricula: string;
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  idade?: number;
  sexo?: 'M' | 'F' | 'O';
  curso_id?: number;
  curso?: {
    id: number;
    nome: string;
    modalidade: string;
  };
  periodo?: number;
  turno?: string;
  media_geral?: number;
  frequencia?: number;
  historico_reprovas?: number;
  coeficiente_rendimento?: number;
  ano_ingresso?: number;
  cidade?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  zona_residencial?: string;
  renda_familiar?: number;
  renda_per_capita?: number;
  possui_auxilio?: boolean;
  tipo_auxilio?: string;
  trabalha?: boolean;
  carga_horaria_trabalho?: number;
  tempo_deslocamento?: number;
  custo_transporte_diario?: number;
  dificuldade_acesso?: string;
  transporte_utilizado?: string;
  usa_transporte_alternativo?: boolean;
  possui_computador?: boolean;
  possui_internet?: boolean;
  beneficiario_bolsa_familia?: boolean;
  primeiro_geracao_universidade?: boolean;
  predicao_atual?: {
    id: number;
    risco_evasao: number;
    nivel_risco: NivelRisco;
    fatores_principais?: string;
    modelo_ml_versao?: string;
    data_predicao: string;
  };
}

// Interface de Intervenção
interface Intervencao {
  id: string;
  aluno_id: string;
  data_intervencao: string;
  tipo: string;
  descricao: string;
  status: StatusIntervencao;
  prioridade: string;
  usuario?: {
    nome: string;
  };
}

export default function AlunoDetail() {
  const { matricula } = useParams<{ matricula: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [historicoFrequencia, setHistoricoFrequencia] = useState<FrequenciaMensal[]>([]);
  const [tendencia, setTendencia] = useState<'subindo' | 'descendo' | 'estavel'>('estavel');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do aluno
  useEffect(() => {
    // Rola a página para o topo ao entrar nos detalhes
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const loadAluno = async () => {
      if (!matricula) {
        setError('Matrícula não fornecida');
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('sapee_token');
        if (!token) {
          throw new Error('Usuário não autenticado');
        }

        // Buscar aluno da API
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${matricula}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Aluno não encontrado');
          }
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setAluno(data);

        // Log de auditoria
        logAction('Visualização de Aluno', `Acessou detalhes do aluno: ${data.nome} (${data.matricula})`);

        // Carregar histórico de frequência
        try {
          console.log('🔍 Buscando frequência para:', matricula);
          const freqData = await api.frequencia.historico(token, matricula);
          console.log('✅ Frequência encontrada:', freqData);
          setHistoricoFrequencia(freqData);

          // Calcular tendência (últimos 3 meses)
          if (freqData.length >= 2) {
            const ultimasDuas = freqData.slice(-2);
            const diff = ultimasDuas[1].frequencia - ultimasDuas[0].frequencia;
            if (diff > 3) setTendencia('subindo');
            else if (diff < -3) setTendencia('descendo');
            else setTendencia('estavel');
          }
        } catch (freqError) {
          console.error('❌ Erro ao carregar frequência:', freqError);
          console.error('Detalhes:', freqError instanceof Error ? freqError.message : freqError);
          setHistoricoFrequencia([]);
        }

        // Carregar intervenções (mock por enquanto - implementar endpoint depois)
        setIntervencoes([]);
        
      } catch (err) {
        console.error('Erro ao carregar aluno:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        addToast({
          type: 'error',
          title: 'Erro ao carregar',
          message: err instanceof Error ? err.message : 'Não foi possível carregar os dados do aluno',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAluno();
  }, [matricula, addToast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
          <p className="text-gray-600 dark:text-slate-400 font-medium">Carregando dados do aluno...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !aluno) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {error || 'Aluno não encontrado'}
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            O aluno que você está procurando não existe ou foi removido do sistema.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              Voltar
            </button>
            <Link
              to="/alunos"
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              Ir para Listagem
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const riscoColor = getRiscoColor(aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{aluno.nome}</h2>
              {aluno.predicao_atual && (
                <RiskBadge nivel={aluno.predicao_atual.nivel_risco} />
              )}
            </div>
            <p className="text-gray-500 dark:text-slate-400">Matrícula: {aluno.matricula}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/cadastro?edit=${aluno.matricula}`)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-md flex items-center gap-2"
          >
            <User className="w-4 h-4" /> Editar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Informações */}
        <div className="lg:col-span-2 space-y-8">
          {/* Cards de Informação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dados Pessoais */}
            <InfoCard title="Dados Pessoais" icon={User}>
              <div className="space-y-3">
                <InfoItem label="Idade" value={
                  aluno.idade
                    ? `${aluno.idade} anos`
                    : aluno.data_nascimento
                      ? `${Math.floor((Date.now() - new Date(aluno.data_nascimento).getTime()) / 31557600000)} anos`
                      : 'N/A'
                } />
                <InfoItem label="Sexo" value={aluno.sexo === 'M' ? 'Masculino' : aluno.sexo === 'F' ? 'Feminino' : 'Outro'} />
                <InfoItem label="Cidade" value={aluno.cidade || 'N/A'} icon={MapPin} />
                {aluno.email && <InfoItem label="Email" value={aluno.email} icon={Mail} />}
              </div>
            </InfoCard>

            {/* Dados Acadêmicos */}
            <InfoCard title="Dados Acadêmicos" icon={GraduationCap}>
              <div className="space-y-3">
                <InfoItem label="Curso" value={aluno.curso?.nome || 'N/A'} />
                <InfoItem label="Período" value={`${aluno.periodo || 'N/A'}º Semestre`} />
                <InfoItem label="Turno" value={aluno.turno || 'N/A'} />
                <InfoItem label="Reprovações" value={aluno.historico_reprovas?.toString() || '0'} />
              </div>
            </InfoCard>

            {/* Socioeconômico */}
            <InfoCard title="Dados Socioeconômicos" icon={Wallet}>
              <div className="space-y-3">
                <InfoItem label="Renda Familiar" value={formatCurrency(aluno.renda_familiar || 0)} />
                <InfoItem label="Renda per Capita" value={formatCurrency(aluno.renda_per_capita || 0)} />
                <InfoItem label="Possui Auxílio" value={aluno.possui_auxilio ? 'Sim' : 'Não'} />
                <InfoItem label="Trabalha" value={aluno.trabalha ? 'Sim' : 'Não'} />
              </div>
            </InfoCard>

            {/* Performance */}
            <InfoCard title="Performance Acadêmica" icon={TrendingDown}>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-1">
                    <span>Média Geral</span>
                    <span>{aluno.media_geral?.toFixed(1) || 'N/A'} / 10</span>
                  </div>
                  <RiskProgressBar 
                    value={(aluno.media_geral || 0) * 10}
                    nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
                    size="sm"
                    showLabel={false}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-1">
                    <span>Frequência</span>
                    <span>{aluno.frequencia?.toFixed(0) || 'N/A'}%</span>
                  </div>
                  <RiskProgressBar 
                    value={aluno.frequencia || 0}
                    nivel={aluno.predicao_atual?.nivel_risco || NivelRisco.BAIXO}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              </div>
            </InfoCard>
          </div>

          {/* Endereço */}
          <InfoCard title="Endereço Residencial" icon={MapPin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="CEP" value={aluno.cep || 'N/A'} />
              <InfoItem label="Logradouro" value={aluno.logradouro || 'N/A'} />
              <InfoItem label="Número" value={aluno.numero || 'N/A'} />
              <InfoItem label="Complemento" value={aluno.complemento || 'N/A'} />
              <InfoItem label="Bairro" value={aluno.bairro || 'N/A'} />
              <InfoItem label="Zona" value={formatZona(aluno.zona_residencial)} />
            </div>
          </InfoCard>

          {/* Deslocamento */}
          <InfoCard title="Deslocamento e Transporte" icon={AlertCircle}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Tempo de Deslocamento" value={`${aluno.tempo_deslocamento || 0} min/dia`} />
              <InfoItem label="Custo Diário" value={formatCurrency(aluno.custo_transporte_diario || 0)} />
              <InfoItem label="Dificuldade" value={formatDificuldade(aluno.dificuldade_acesso)} />
              <InfoItem label="Transporte" value={aluno.transporte_utilizado || 'N/A'} />
              <InfoItem label="Transporte Alternativo" value={aluno.usa_transporte_alternativo ? 'Sim' : 'Não'} />
            </div>
          </InfoCard>

          {/* Infraestrutura */}
          <InfoCard title="Infraestrutura e Tecnologia" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Possui Computador" value={aluno.possui_computador ? 'Sim' : 'Não'} />
              <InfoItem label="Possui Internet" value={aluno.possui_internet ? 'Sim' : 'Não'} />
              <InfoItem label="Bolsa Família" value={aluno.beneficiario_bolsa_familia ? 'Sim' : 'Não'} />
              <InfoItem label="1ª Geração Universidade" value={aluno.primeiro_geracao_universidade ? 'Sim' : 'Não'} />
            </div>
          </InfoCard>

          {/* Histórico de Frequência */}
          <InfoCard title="📊 Histórico de Frequência" icon={Calendar}>
            {historicoFrequencia.length === 0 ? (
              // SEM DADOS - Mostra aviso completo
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">
                        ⚠️ Nenhum Histórico de Frequência
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-500 mb-2">
                        Este aluno ainda não possui nenhum mês de frequência registrado.
                      </p>
                      <div className="text-xs text-amber-600 dark:text-amber-500 space-y-1">
                        <p>• <strong>Para começar:</strong> Vá em "Lançar Frequência"</p>
                        <p>• <strong>Mínimo recomendado:</strong> 3 meses para análise inicial</p>
                        <p>• <strong>Ideal:</strong> 6 meses para análise completa</p>
                        <p>• <strong>Atual:</strong> 0 meses - Aguardando primeiro lançamento</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado de frequência disponível</p>
                </div>
              </div>
            ) : (
              // COM DADOS - Mostra histórico + aviso se < 3 meses
              <div className="space-y-4">
                {/* Aviso de Dados Insuficientes */}
                {historicoFrequencia.length < 3 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-1">
                          ⚠️ Dados Insuficientes para Análise Completa
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500 mb-2">
                          Este aluno possui apenas <strong>{historicoFrequencia.length} mês(es)</strong> de histórico registrado.
                        </p>
                        <div className="text-xs text-amber-600 dark:text-amber-500 space-y-1">
                          <p>• <strong>Mínimo recomendado:</strong> 3 meses para análise inicial</p>
                          <p>• <strong>Ideal:</strong> 6 meses para análise completa</p>
                          <p>• <strong>Atual:</strong> {historicoFrequencia.length} mês(es) - {historicoFrequencia.length < 3 ? 'Aguardando mais dados' : 'Análise disponível'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tendência */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Tendência</span>
                  <div className="flex items-center gap-2">
                    {historicoFrequencia.length < 2 ? (
                      <>
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-400">Aguardando dados</span>
                      </>
                    ) : tendencia === 'subindo' ? (
                      <>
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-bold text-green-600">Subindo</span>
                      </>
                    ) : tendencia === 'descendo' ? (
                      <>
                        <TrendingDownIcon className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-bold text-red-600">Descendo</span>
                      </>
                    ) : (
                      <>
                        <ClipboardList className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-400">Estável</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Tabela de Histórico */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="text-left py-2 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Mês/Ano</th>
                        <th className="text-center py-2 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Freq</th>
                        <th className="text-center py-2 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Faltas</th>
                        <th className="text-right py-2 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicoFrequencia.slice(-6).reverse().map((freq) => (
                        <tr key={freq.id} className="border-b border-gray-100 dark:border-slate-800">
                          <td className="py-2 text-gray-900 dark:text-white">
                            {String(freq.mes).padStart(2, '0')}/{freq.ano}
                          </td>
                          <td className="text-center">
                            <span className={cn(
                              "font-bold",
                              freq.frequencia >= 90 ? "text-green-600" :
                              freq.frequencia >= 75 ? "text-blue-600" :
                              freq.frequencia >= 60 ? "text-amber-600" : "text-red-600"
                            )}>
                              {freq.frequencia.toFixed(0)}%
                            </span>
                          </td>
                          <td className="text-center text-gray-600 dark:text-slate-400">
                            {freq.faltas_justificadas + freq.faltas_nao_justificadas}
                          </td>
                          <td className="text-right">
                            {freq.frequencia >= 90 ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                            ) : freq.frequencia >= 75 ? (
                              <CheckCircle2 className="w-4 h-4 text-blue-600 inline" />
                            ) : freq.frequencia >= 60 ? (
                              <AlertTriangle className="w-4 h-4 text-amber-600 inline" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Gráfico de Evolução */}
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicoFrequencia.slice(-6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="#6B7280" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#6B7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="frequencia"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </InfoCard>
        </div>

        {/* Coluna Direita: Predição */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 sticky top-24"
          >
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Análise de Predição</h3>
            </div>

            {aluno.predicao_atual ? (
              <>
                <div className="text-center py-8 bg-gray-50 dark:bg-slate-800 rounded-2xl mb-6">
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">Score de Risco</p>
                  <p className={cn(
                    "text-6xl font-black",
                    aluno.predicao_atual.nivel_risco === NivelRisco.MUITO_ALTO ? "text-purple-600" :
                    aluno.predicao_atual.nivel_risco === NivelRisco.ALTO ? "text-red-500" :
                    aluno.predicao_atual.nivel_risco === NivelRisco.MEDIO ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {aluno.predicao_atual.risco_evasao.toFixed(1)}%
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Principais Fatores
                  </h4>
                  {aluno.predicao_atual.fatores_principais ? (
                    <ul className="space-y-3">
                      {aluno.predicao_atual.fatores_principais.split(',').map((fator, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                          {fator.trim()}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400">Nenhum fator de risco identificado</p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    <p className="font-semibold mb-1">Informações da Predição:</p>
                    <p>ID: {aluno.predicao_atual.id}</p>
                    <p>Data: {new Date(aluno.predicao_atual.data_predicao).toLocaleDateString('pt-BR')}</p>
                    <p>Modelo: {aluno.predicao_atual.modelo_ml_versao || '1.0.0'}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400 font-medium">
                  Nenhuma predição disponível para este aluno.
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                  A predição é gerada automaticamente após o cadastro ou edição.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Componentes Auxiliares
// ============================================

function InfoCard({ title, icon: Icon, children }: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }: { 
  label: string; 
  value: string; 
  icon?: React.ComponentType<{ className?: string }> 
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400 dark:text-slate-500 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />}
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}

// Ícone de Email (adicionei aqui pois não estava importado)
function Mail({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

// Utilitários de formatação
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatZona(zona?: string): string {
  if (!zona) return 'N/A';
  return zona.replace('_', ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDificuldade(dificuldade?: string): string {
  if (!dificuldade) return 'N/A';
  return dificuldade.replace('_', ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
