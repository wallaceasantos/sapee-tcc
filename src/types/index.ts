export enum NivelRisco {
  BAIXO = 'BAIXO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  MUITO_ALTO = 'MUITO_ALTO'
}

export enum StatusIntervencao {
  RASCUNHO = 'RASCUNHO',
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA'
}

export enum Turno {
  MATUTINO = 'MATUTINO',
  VESPERTINO = 'VESPERTINO',
  NOTURNO = 'NOTURNO'
}

export enum ZonaResidencial {
  ZONA_NORTE = 'ZONA_NORTE',
  ZONA_SUL = 'ZONA_SUL',
  ZONA_LESTE = 'ZONA_LESTE',
  ZONA_OESTE = 'ZONA_OESTE',
  CENTRO = 'CENTRO',
  INTERIOR = 'INTERIOR'
}

export enum DificuldadeAcesso {
  FACIL = 'FACIL',
  MEDIA = 'MEDIA',
  DIFICIL = 'DIFICIL',
  MUITO_DIFICIL = 'MUITO_DIFICIL'
}

export enum TransporteUtilizado {
  ONIBUS = 'ONIBUS',
  METRO = 'METRO',
  CARRO = 'CARRO',
  MOTO = 'MOTO',
  BICICLETA = 'BICICLETA',
  A_PE = 'A_PE',
  VAN = 'VAN',
  BARCO = 'BARCO',
  TAXI = 'TAXI'
}

export interface Intervencao {
  id: string;
  alunoId: string;
  data: string;
  tipo: string;
  descricao: string;
  responsavel: string;
  status: StatusIntervencao;
}

export interface Predicao {
  risco_evasao: number; // 0 a 100
  nivel_risco: NivelRisco;
  principais_fatores: string[];
}

// Interface completa com todos os 27+ campos do cadastro
export interface Aluno {
  // Identificação Básica
  matricula: string; // ID institucional (chave primária)
  id?: string; // Alias para compatibilidade (usa matricula se não tiver id)
  nome: string;
  email?: string;
  telefone?: string;
  dataNascimento?: string;
  idade?: number;
  sexo?: 'M' | 'F' | 'O';
  
  // Dados Acadêmicos
  curso: string;
  periodo: number; // 1-8
  turno?: Turno;
  mediaGeral: number; // 0-10
  media_geral?: number; // Alias para compatibilidade
  frequencia: number; // 0-100 (%)
  historicoReprovas: number;
  historico_reprovas?: number; // Alias para compatibilidade
  coeficienteRendimento?: number; // 0-10
  anoIngresso?: number; // Ex: 2024
  
  // Endereço Completo
  cidade?: string;
  cep?: string; // 69000-000
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  zonaResidencial?: ZonaResidencial;
  
  // Dados Socioeconômicos
  rendaFamiliar: number; // R$ mensal
  renda_familiar?: number; // Alias para compatibilidade
  rendaPerCapita?: number; // R$ per capita
  possuiAuxilio: boolean;
  possui_auxilio?: boolean; // Alias para compatibilidade
  tipoAuxilio?: string[]; // ['alimentação', 'transporte', 'moradia']
  
  // Situação de Trabalho
  trabalha: boolean;
  cargaHorariaTrabalho?: number; // horas/semana
  
  // Deslocamento e Transporte
  tempoDeslocamento?: number; // minutos (ida)
  custoTransporteDiario?: number; // R$
  dificuldadeAcesso?: DificuldadeAcesso;
  transporteUtilizado?: TransporteUtilizado;
  usaTransporteAlternativo?: boolean; // van, barco, moto-táxi
  
  // Infraestrutura e Tecnologia
  possuiComputador?: boolean;
  possuiInternet?: boolean;
  
  // Vulnerabilidade Social
  beneficiarioBolsaFamilia?: boolean;
  primeiroGeracaoUniversidade?: boolean; // Pais não estudaram
}

export interface AlunoComRisco extends Aluno {
  predicao: Predicao;
}

export interface FiltrosAlunos {
  busca?: string;
  curso?: string;
  nivelRisco?: string;
}

export interface EstatisticasGerais {
  totalAlunos: number;
  riscoAlto: number;
  riscoMedio: number;
  riscoBaixo: number;
  mediaGeral: number | string;
}

// Interfaces auxiliares para formulários
export interface FormDataAluno extends Aluno {
  // Campos específicos do formulário
  confirmacao?: boolean;
}

export interface ImportRow {
  id: string;
  nome: string;
  curso: string;
  media: number;
  frequencia: number;
  status: 'valid' | 'error' | 'warning';
  errors: string[];
}

export interface ImportHistory {
  id: string;
  arquivo: string;
  data: string;
  registros: number;
  usuario: string;
  status: 'success' | 'partial';
}

// ============================================
// INTERFACES DA API (Backend FastAPI)
// ============================================

/**
 * Predição vinda da API backend
 */
export interface PredicaoAPI {
  id: number;
  risco_evasao: number;
  nivel_risco: NivelRisco;
  fatores_principais?: string;
  modelo_ml_versao?: string;
  data_predicao: string;
}

/**
 * Curso vindo da API backend
 */
export interface CursoAPI {
  id: number;
  nome: string;
  modalidade: string;
}

/**
 * Aluno completo vindo da API backend
 * Usa snake_case para compatibilidade com Python/FastAPI
 */
export interface AlunoAPI {
  // Identificação
  matricula: string;
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  idade?: number;
  sexo?: 'M' | 'F' | 'O';

  // Acadêmicos
  curso_id?: number;
  curso?: CursoAPI;
  periodo?: number;
  turno?: string;
  media_geral?: number;
  frequencia?: number;
  historico_reprovas?: number;
  coeficiente_rendimento?: number;
  ano_ingresso?: number;

  // Endereço
  cidade?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  zona_residencial?: string;

  // Socioeconômicos
  renda_familiar?: number;
  renda_per_capita?: number;
  possui_auxilio?: boolean;
  tipo_auxilio?: string;

  // Trabalho
  trabalha?: boolean;
  carga_horaria_trabalho?: number;

  // Deslocamento
  tempo_deslocamento?: number;
  custo_transporte_diario?: number;
  dificuldade_acesso?: string;
  transporte_utilizado?: string;
  usa_transporte_alternativo?: boolean;

  // Infraestrutura
  possui_computador?: boolean;
  possui_internet?: boolean;

  // Vulnerabilidade
  beneficiario_bolsa_familia?: boolean;
  primeiro_geracao_universidade?: boolean;

  // Questionário Psicossocial
  questionario_respondido?: boolean;
  data_ultimo_questionario?: string;

  // Predição atual (última)
  predicao_atual?: PredicaoAPI;
}

/**
 * Filtros para listagem de alunos na API
 */
export interface FiltrosAlunosAPI {
  busca?: string;
  curso_id?: number;
  nivel_risco?: NivelRisco;
  skip?: number;
  limit?: number;
}

/**
 * Estatísticas do dashboard
 */
export interface DashboardStatsAPI {
  total_alunos: number;
  risco_alto: number;
  risco_medio: number;
  risco_baixo: number;
  media_geral_campus: number;
  intervencoes_ativas: number;
}

/**
 * Resposta de importação CSV
 */
export interface ImportCSVResponse {
  message: string;
  alunos_importados: number;
  predicoes_geradas: number;
  erros: string[];
  total_erros: number;
}

/**
 * Resposta de exclusão em massa
 */
export interface DeleteMultipleResponse {
  message: string;
  excluidos: number;
  matriculas: string[];
}

// ============================================
// INTERFACES DE INTERVENÇÕES
// ============================================

/**
 * Intervenção pedagógica
 */
export interface IntervencaoAPI {
  id: number;
  aluno_id: string;
  usuario_id: number;
  data_intervencao: string;
  tipo: string;
  descricao?: string;
  status: StatusIntervencao;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  data_conclusao?: string;
  observacoes?: string;
  criado_at: string;
  
  // Relacionamentos
  aluno?: AlunoAPI;
  usuario?: {
    id: number;
    nome: string;
    email: string;
  };
}

/**
 * Estatísticas de intervenções
 */
export interface IntervencoesStatsAPI {
  total: number;
  ativas: number;
  pendentes: number;
  em_andamento: number;
  concluidas: number;
  canceladas: number;
  urgentes: number;
  altas: number;
  taxa_conclusao: number;
}

/**
 * Dados para criar intervenção
 */
export interface IntervencaoCreate {
  tipo: string;
  descricao: string;
  status: StatusIntervencao;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  data_intervencao: string;
}

/**
 * Dados para atualizar intervenção
 */
export interface IntervencaoUpdate {
  tipo?: string;
  descricao?: string;
  status?: StatusIntervencao;
  prioridade?: string;
  data_conclusao?: string;
  observacoes?: string;
}

