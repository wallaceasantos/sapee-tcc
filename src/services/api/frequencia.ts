import { API_BASE_URL } from './client';

export const frequencia = {
/**
 * Obter histórico de frequência mensal de um aluno
 */
historico: async (token: string, matricula: string): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/alunos/${matricula}/frequencia-historico`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao obter histórico de frequência');
  }

  return response.json();
},

/**
 * Obter stats de frequência para dashboard
 */
stats: async (token: string): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/dashboard/frequencia-stats`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao obter stats');
  return response.json();
},
};
