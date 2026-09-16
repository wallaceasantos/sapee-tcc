import { API_BASE_URL } from './client';

export const usuarios = {
  list: async (token: string, skip = 0, limit = 100): Promise<unknown[]> => {
    const response = await fetch(
      `${API_BASE_URL}/usuarios?skip=${skip}&limit=${limit}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao listar usuários');
    }

    return response.json();
  },

  create: async (token: string, data: {
    nome: string;
    email: string;
    senha: string;
    role_id: number;
    curso_id?: number;
    ativo?: boolean;
  }): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao criar usuário');
    }

    return response.json();
  },

  update: async (token: string, id: number, data: {
    nome?: string;
    email?: string;
    senha?: string;
    role_id?: number;
    curso_id?: number;
    ativo?: boolean;
  }): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao atualizar usuário');
    }

    return response.json();
  },

  delete: async (token: string, id: number): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao excluir usuário');
    }

    return response.json();
  },

  toggleStatus: async (token: string, id: number, ativo: boolean): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ativo }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao alterar status');
    }

    return response.json();
  },
};
