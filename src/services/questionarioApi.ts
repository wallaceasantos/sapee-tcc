/**
 * Serviço de API para Questionário Psicossocial
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 */

import api from './axios';
import {
  PerguntasResponse,
  RespostasQuestionario,
  QuestionarioResponse,
  HistoricoQuestionario,
  DashboardQuestionarioStats,
  AlunoSemQuestionario,
} from '../types/questionario';

/**
 * Obtém todas as perguntas do questionário
 */
export const getPerguntas = async (): Promise<PerguntasResponse> => {
  const response = await api.get('/questionario/perguntas');
  return response.data;
};

/**
 * Registra as respostas do questionário
 */
export const responderQuestionario = async (
  dados: RespostasQuestionario
): Promise<QuestionarioResponse> => {
  const response = await api.post('/questionario/responder', dados);
  return response.data;
};

/**
 * Obtém as respostas de um aluno específico
 */
export const getQuestionarioAluno = async (
  matricula: string
): Promise<QuestionarioResponse> => {
  const response = await api.get(`/questionario/${matricula}`);
  return response.data;
};

/**
 * Obtém histórico de questionários de um aluno
 */
export const getHistoricoQuestionario = async (
  matricula: string
): Promise<HistoricoQuestionario> => {
  const response = await api.get(`/questionario/${matricula}/historico`);
  return response.data;
};

/**
 * Obtém estatísticas do dashboard do questionário
 */
export const getDashboardStats = async (): Promise<DashboardQuestionarioStats> => {
  const response = await api.get('/questionario/dashboard/stats');
  return response.data;
};

/**
 * Obtém lista de alunos que ainda não responderam
 */
export const getAlunosSemResponder = async (): Promise<{
  total: number;
  alunos: AlunoSemQuestionario[];
}> => {
  const response = await api.get('/questionario/alunos/sem-responder');
  return response.data;
};

export default {
  getPerguntas,
  responderQuestionario,
  getQuestionarioAluno,
  getHistoricoQuestionario,
  getDashboardStats,
  getAlunosSemResponder,
};
