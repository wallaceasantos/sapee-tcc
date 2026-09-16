import { API_BASE_URL } from './client';

export const predicoes = {
  /**
   * Gerar predições para todos os alunos sem predição
   * Apenas ADMIN pode executar
   */
  gerarTodas: async (token: string): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/predicoes/gerar-todas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao gerar predições');
    }

    return response.json();
  },

  /**
   * Obter resumo das predições
   */
  resumo: async (token: string): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/predicoes/resumo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao obter resumo');
    }

    return response.json();
  },
};
