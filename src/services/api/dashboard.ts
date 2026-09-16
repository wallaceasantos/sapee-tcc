import { API_BASE_URL } from './client';

export const dashboard = {
  stats: async (token: string): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao obter estatísticas');
    }

    return response.json();
  },
};
