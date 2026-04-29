/**
 * API Service - Conexão com Backend
 * SAPEE DEWAS Frontend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Tipos
export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  role_id: number;
  curso_id?: number;
  ativo: boolean;
  role?: {
    id: number;
    nome: string;
    descricao?: string;
  };
}

// Funções de API
export const api = {
  /**
   * Fazer login
   */
  auth: {
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
    trocarSenha: async (token: string, senhaAtual: string, senhaNova: string): Promise<any> => {
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
  },

  /**
   * Alunos
   */
  alunos: {
    /**
     * Buscar alunos por nome ou matrícula
     */
    buscar: async (token: string, q: string = '', limit: number = 20): Promise<any[]> => {
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
    listEmRisco: async (token: string): Promise<any> => {
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
    listMonitoramento: async (token: string): Promise<any> => {
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
    ): Promise<any[]> => {
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
    get: async (token: string, matricula: string): Promise<any> => {
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
    create: async (token: string, data: any): Promise<any> => {
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
          const mensagens = error.detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ');
          throw new Error(`Erro de validação: ${mensagens}`);
        }
        
        throw new Error(error.detail || 'Erro ao criar aluno');
      }

      return response.json();
    },

    /**
     * Atualizar aluno existente
     */
    update: async (token: string, matricula: string, data: any): Promise<any> => {
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
    deleteMultiple: async (token: string, matriculas: string[]): Promise<any> => {
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
    importCSV: async (token: string, file: File): Promise<any> => {
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
  },

  /**
   * Dashboard
   */
  dashboard: {
    stats: async (token: string): Promise<any> => {
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
  },

  /**
   * Usuários (APENAS ADMIN)
   */
  usuarios: {
    list: async (token: string, skip = 0, limit = 100): Promise<any[]> => {
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
    }): Promise<any> => {
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
    }): Promise<any> => {
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

    delete: async (token: string, id: number): Promise<any> => {
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

    toggleStatus: async (token: string, id: number, ativo: boolean): Promise<any> => {
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
  },

  /**
   * Predições
   */
  predicoes: {
    /**
     * Gerar predições para todos os alunos sem predição
     * Apenas ADMIN pode executar
     */
    gerarTodas: async (token: string): Promise<any> => {
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
    resumo: async (token: string): Promise<any> => {
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
  },

  /**
   * Notificações Telegram
   */
  notificacoes: {
    /**
     * Enviar alerta de risco de evasão via Telegram
     */
    enviarAlertaRisco: async (token: string, matricula: string): Promise<any> => {
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
    testar: async (token: string): Promise<any> => {
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
  },

  /**
   * Intervenções Pedagógicas
   */
  intervencoes: {
    /**
     * Gerar sugestões automáticas de intervenção
     */
    gerarSugestoes: async (token: string, nivel_risco: string = 'ALTO'): Promise<any> => {
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
     * Listar rascunhos pendentes
     */
    listRascunhos: async (token: string): Promise<any[]> => {
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
    aprovar: async (token: string, id: number): Promise<any> => {
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
    rejeitar: async (token: string, id: number, motivo: string = ''): Promise<any> => {
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
    ): Promise<any[]> => {
      const params = new URLSearchParams();
      params.set('skip', skip.toString());
      params.set('limit', limit.toString());

      if (status) params.set('status', status);
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
    ): Promise<any[]> => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);

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
    get: async (token: string, id: number): Promise<any> => {
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
    }): Promise<any> => {
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
    }): Promise<any> => {
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
    stats: async (token: string): Promise<any> => {
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
    ): Promise<any> => {
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
    ): Promise<any> => {
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
  },

  /**
   * Faltas Consecutivas
   */
  faltas: {
    /**
     * Registrar falta diária
     */
    registrar: async (
      token: string,
      matricula: string,
      data: {
        disciplina: string;
        data: string;
        justificada?: boolean;
        motivo_justificativa?: string;
      }
    ): Promise<any> => {
      const response = await fetch(
        `${API_BASE_URL}/alunos/${matricula}/faltas`,
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
        throw new Error(error.detail || 'Erro ao registrar falta');
      }

      return response.json();
    },

    /**
     * Listar faltas de um aluno
     */
    listar: async (
      token: string,
      matricula: string,
      data_inicio?: string,
      data_fim?: string
    ): Promise<any> => {
      const params = new URLSearchParams();
      if (data_inicio) params.set('data_inicio', data_inicio);
      if (data_fim) params.set('data_fim', data_fim);

      const response = await fetch(
        `${API_BASE_URL}/alunos/${matricula}/faltas?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao listar faltas');
      }

      return response.json();
    },

    /**
     * Verificar faltas consecutivas
     */
    verificarConsecutivas: async (
      token: string,
      matricula: string
    ): Promise<any> => {
      const response = await fetch(
        `${API_BASE_URL}/alunos/${matricula}/faltas-consecutivas`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao verificar faltas consecutivas');
      }

      return response.json();
    },

    /**
     * Listar alertas de faltas
     */
    listarAlertas: async (
      token: string,
      status?: string,
      tipo_alerta?: string
    ): Promise<any> => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (tipo_alerta) params.set('tipo_alerta', tipo_alerta);

      const response = await fetch(
        `${API_BASE_URL}/alertas-faltas?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao listar alertas');
      }

      return response.json();
    },

    /**
     * Atualizar alerta
     */
    atualizarAlerta: async (
      token: string,
      id: number,
      data: {
        status?: string;
        acoes_tomadas?: string;
      }
    ): Promise<any> => {
      const response = await fetch(
        `${API_BASE_URL}/alertas-faltas/${id}`,
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
        throw new Error(error.detail || 'Erro ao atualizar alerta');
      }

      return response.json();
    },

    /**
     * Obter stats de faltas para dashboard
     */
    stats: async (token: string): Promise<any> => {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/faltas-stats`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao obter stats');
      }

      return response.json();
    },
  },

  /**
   * Frequência Escolar
   */
  frequencia: {
    /**
     * Obter histórico de frequência mensal de um aluno
     */
    historico: async (token: string, matricula: string): Promise<any[]> => {
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
    stats: async (token: string): Promise<any> => {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/frequencia-stats`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao obter stats de frequência');
      }

      return response.json();
    },
  },
};

export default api;
