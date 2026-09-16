import { API_BASE_URL } from './client';

export const alunos = {
  /**
   * Buscar alunos por nome ou matrícula
   */
  buscar: async (token: string, q: string = '', limit: number = 20): Promise<unknown[]> => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/alunos/buscar?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Listar alunos em risco sem intervenção ativa
   */
  listEmRisco: async (token: string): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/alunos/em-risco`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Listar alunos em monitoramento preventivo (risco MÉDIO)
   */
  listMonitoramento: async (token: string): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/alunos/monitoramento`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Listar alunos com filtros opcionais
   */
  list: async (
    token: string,
    skip = 0,
    limit = 100,
    curso_id?: number,
    nivel_risco?: string
  ): Promise<unknown[]> => {
    const params = new URLSearchParams();
    params.set('skip', skip.toString());
    params.set('limit', limit.toString());
    
    if (curso_id !== undefined) params.set('curso_id', curso_id.toString());
    if (nivel_risco) params.set('nivel_risco', nivel_risco);

    const response = await fetch(
      `${API_BASE_URL}/alunos?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Obter aluno específico por matrícula
   */
  get: async (token: string, matricula: string): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/alunos/${matricula}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Criar novo aluno
   */
  create: async (token: string, data: Record<string, unknown>): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/alunos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro na criação do aluno:', error);
      
      // Extrair detalhes do erro de validação
      if (error.detail && Array.isArray(error.detail)) {
        const mensagens = error.detail.map((d: Record<string, unknown>) => `${(d.loc as string[] | undefined)?.join('.')}: ${d.msg as string}`).join(', ');
        throw new Error(`Erro de validação: ${mensagens}`);
      }
      
      throw new Error(error.detail || 'Erro ao criar aluno');
    }

    return response.json();
  },

  /**
   * Atualizar aluno existente
   */
  update: async (token: string, matricula: string, data: Record<string, unknown>): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/alunos/${matricula}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao atualizar aluno');
    }

    return response.json();
  },

  /**
   * Excluir aluno por matrícula
   */
  delete: async (token: string, matricula: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/alunos/${matricula}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ${response.status}: ${response.statusText}`);
    }
  },

  /**
   * Excluir múltiplos alunos (em massa)
   */
  deleteMultiple: async (token: string, matriculas: string[]): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/alunos/delete-multiple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(matriculas),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao excluir alunos');
    }

    return response.json();
  },

  /**
   * Importar alunos de arquivo CSV
   */
  importCSV: async (token: string, file: File): Promise<unknown> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/alunos/importar-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao importar CSV');
    }

    return response.json();
  },
};
