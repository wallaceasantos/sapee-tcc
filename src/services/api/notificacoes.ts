import { API_BASE_URL } from './client';

export const notificacoes = {
  /**
   * Enviar alerta de risco de evasão via Telegram
   */
  enviarAlertaRisco: async (token: string, matricula: string): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/notificacoes/alerta-geral/${matricula}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao enviar alerta');
    }

    return response.json();
  },

  /**
   * Testar conexão com Telegram
   */
  testar: async (token: string): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/notificacoes/testar-telegram`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao testar Telegram');
    }

    return response.json();
  },
};
