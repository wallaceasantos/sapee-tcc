/**
 * Tipos TypeScript para Questionário Psicossocial
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 */

// Escala de respostas (1-5)
export type EscalaLikert = 1 | 2 | 3 | 4 | 5;

// Nível de risco psicossocial
export type NivelRiscoPsicossocial = 'BAIXO' | 'MEDIO' | 'ALTO' | 'MUITO_ALTO';

// Fatores críticos
export type FatorCritico =
  | 'ansiedade_severa'
  | 'sintomas_depressivos'
  | 'disturbios_sono'
  | 'isolamento_social'
  | 'falta_pertencimento'
  | 'insatisfacao_curso'
  | 'desmotivacao_curso'
  | 'conflito_trabalho_estudo'
  | 'trabalho_atrapalha_estudos'
  | 'sobrecarga_responsabilidades'
  | 'intencao_evasao_alta'
  | 'risco_evasao_iminente';

// Estrutura de uma pergunta
export interface Pergunta {
  id: string;
  texto: string;
  invertida?: boolean;
}

// Estrutura de um bloco de perguntas
export interface BlocoTematico {
  bloco: string;
  titulo?: string;
  perguntas: Pergunta[];
}

// Resposta da API de perguntas
export interface PerguntasResponse {
  perguntas: BlocoTematico[];
  escalas: Record<string, string>;
  instrucoes: string;
}

// Dados para enviar respostas
export interface RespostasQuestionario {
  aluno_matricula: string;
  q1_ansiedade?: number;
  q2_depressao?: number;
  q3_estresse?: number;
  q4_sono?: number;
  q5_bem_estar?: number;
  q6_pertencimento?: number;
  q7_amizades?: number;
  q8_participacao?: number;
  q9_relacionamento_professores?: number;
  q10_apoio_colegas?: number;
  q11_expectativas?: number;
  q12_qualidade_aulas?: number;
  q13_infraestrutura?: number;
  q14_conteudo_programatico?: number;
  q15_motivacao_curso?: number;
  q16_trabalho_estudo?: number;
  q17_familia_estudo?: number;
  q18_tempo_lazer?: number;
  q19_cansaco?: number;
  q20_sobrecarga?: number;
  q21_pensou_abandonar?: number;
  q22_frequencia_pensamento?: number;
  q23_motivacao_permanencia?: number;
  q24_plano_abandonar?: number;
  q25_previsao_abandono?: number;
  termo_consentimento: boolean;
  ip_address?: string;
  dispositivo?: string;
  tempo_resposta_segundos?: number;
}

// Resposta do questionário
export interface QuestionarioResponse {
  id: number;
  aluno_matricula: string;
  score_saude_mental: number;
  score_integracao_social: number;
  score_satisfacao_curso: number;
  score_conflitos: number;
  score_intencao_evasao: number;
  score_psicossocial_total: number;
  nivel_risco_psicossocial: NivelRiscoPsicossocial;
  fatores_criticos: string | null;
  data_resposta: string;
  termo_consentimento: boolean;
}

// Histórico de questionários
export interface HistoricoQuestionario {
  matricula: string;
  total_respostas: number;
  historico: {
    id: number;
    data_resposta: string;
    score_total: number;
    nivel_risco: NivelRiscoPsicossocial;
  }[];
}

// Estatísticas do dashboard
export interface DashboardQuestionarioStats {
  total_respostas: number;
  alunos_com_questionario: number;
  alunos_sem_questionario: number;
  percentual_respostas: number;
  distribuicao_risco: {
    risco_baixo: number;
    risco_medio: number;
    risco_alto: number;
    risco_muito_alto: number;
  };
  medias_dimensoes: {
    media_saude_mental: number | null;
    media_integracao_social: number | null;
    media_satisfacao_curso: number | null;
    media_conflitos: number | null;
    media_intencao_evasao: number | null;
    media_score_total: number | null;
  };
  fatores_criticos_frequentes: {
    fator: FatorCritico;
    quantidade: number;
  }[];
}

// Aluno sem responder
export interface AlunoSemQuestionario {
  matricula: string;
  nome: string;
  curso: string | null;
  email: string | null;
}

// Props para componentes
export interface BarraProgressoProps {
  atual: number;
  total: number;
  porcentagem?: number;
}

export interface PerguntaProps {
  pergunta: Pergunta;
  valor?: number;
  onChange: (valor: EscalaLikert) => void;
  erro?: string;
}

export interface TermoConsentimentoProps {
  onAceitar: () => void;
  onRecusar: () => void;
}

export interface BlocoTemasProps {
  bloco: BlocoTematico;
  respostas: Record<string, number>;
  onResponder: (questaoId: string, valor: EscalaLikert) => void;
  erros: Record<string, string>;
}
