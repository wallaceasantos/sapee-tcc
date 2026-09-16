import { API_BASE_URL } from './client';
import type { LoginRequest, LoginResponse, User } from './types';

export const auth = {
  /**
   * Fazer login
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao fazer login');
    }

    return response.json();
  },

  /**
   * Obter usuário atual
   */
  me: async (token: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro /auth/me:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Trocar senha
   */
  trocarSenha: async (token: string, senhaAtual: string, senhaNova: string): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/auth/trocar-senha`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        senha_atual: senhaAtual,
        senha_nova: senhaNova,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao trocar senha');
    }

    return response.json();
  },
};
