import { API_BASE_URL } from './client';

export const intervencoes = {
  /**
   * Gerar sugestões automáticas de intervenção (lote)
   */
  gerarSugestoes: async (token: string, nivel_risco: string = 'ALTO'): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/gerar-sugestoes?nivel_risco=${nivel_risco}`,
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
   * Sugerir intervenção (pontual) para um aluno por matrícula
   */
  sugerirPorAluno: async (token: string, matricula: string): Promise<unknown[]> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/sugerir/${encodeURIComponent(matricula)}`,
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
   * Listar rascunhos pendentes
   */
  listRascunhos: async (token: string): Promise<unknown[]> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/sugestoes-pendentes`,
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
   * Aprovar rascunho
   */
  aprovar: async (token: string, id: number): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/${id}/aprovar`,
      {
        method: 'POST',
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
   * Rejeitar rascunho
   */
  rejeitar: async (token: string, id: number, motivo: string = ''): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/${id}/rejeitar?motivo=${encodeURIComponent(motivo)}`,
      {
        method: 'POST',
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
   * Listar todas as intervenções (com filtros)
   */
  list: async (
    token: string,
    skip = 0,
    limit = 100,
    status?: string,
    curso_id?: number
  ): Promise<unknown[]> => {
    const params = new URLSearchParams();
    params.set('skip', skip.toString());
    params.set('limit', limit.toString());

    if (status) params.set('status_filter', status);
    if (curso_id !== undefined) params.set('curso_id', curso_id.toString());

    const response = await fetch(
      `${API_BASE_URL}/intervencoes?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao listar intervenções');
    }

    return response.json();
  },

  /**
   * Listar intervenções de um aluno específico
   */
  listByAluno: async (
    token: string,
    matricula: string,
    status?: string
  ): Promise<unknown[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status_filter', status);

    const response = await fetch(
      `${API_BASE_URL}/alunos/${matricula}/intervencoes?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao listar intervenções do aluno');
    }

    return response.json();
  },

  /**
   * Obter intervenção por ID
   */
  get: async (token: string, id: number): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/${id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao obter intervenção');
    }

    return response.json();
  },

  /**
   * Criar nova intervenção para um aluno
   */
  create: async (token: string, matricula: string, data: {
    tipo: string;
    descricao: string;
    status: string;
    prioridade: string;
    data_intervencao: string;
  }): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/alunos/${matricula}/intervencoes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao criar intervenção');
    }

    return response.json();
  },

  /**
   * Atualizar intervenção existente
   */
  update: async (token: string, id: number, data: {
    tipo?: string;
    descricao?: string;
    status?: string;
    prioridade?: string;
    data_conclusao?: string;
    observacoes?: string;
  }): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao atualizar intervenção');
    }

    return response.json();
  },

  /**
   * Excluir intervenção (APENAS ADMIN)
   */
  delete: async (token: string, id: number): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/intervencoes/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao excluir intervenção');
    }
  },

  /**
   * Obter estatísticas de intervenções para dashboard
   */
  stats: async (token: string): Promise<unknown> => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/intervencoes-stats`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao obter estatísticas');
    }

    return response.json();
  },

  /**
   * Obter relatório de eficácia das intervenções
   */
  eficacia: async (
    token: string,
    start_date?: string,
    end_date?: string,
    curso_id?: number
  ): Promise<unknown> => {
    const params = new URLSearchParams();
    if (start_date) params.set('start_date', start_date);
    if (end_date) params.set('end_date', end_date);
    if (curso_id !== undefined) params.set('curso_id', curso_id.toString());

    const response = await fetch(
      `${API_BASE_URL}/relatorios/eficacia?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao obter relatório de eficácia');
    }

    return response.json();
  },

  /**
   * Obter relatório de alunos recuperados
   */
  alunosRecuperados: async (
    token: string,
    start_date?: string,
    end_date?: string
  ): Promise<unknown> => {
    const params = new URLSearchParams();
    if (start_date) params.set('start_date', start_date);
    if (end_date) params.set('end_date', end_date);

    const response = await fetch(
      `${API_BASE_URL}/relatorios/alunos-recuperados?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao obter relatório de alunos recuperados');
    }

    return response.json();
  },
};
