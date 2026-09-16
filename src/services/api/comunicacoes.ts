import { API_BASE_URL } from './client';

export const comunicacoes = {
list: async (token: string, params?: {
  tipo?: string;
  canal?: string;
  status?: string;
  eh_lembrete?: boolean;
  limit?: number;
}): Promise<unknown[]> => {
  const searchParams = new URLSearchParams();
  if (params?.tipo) searchParams.set('tipo', params.tipo);
  if (params?.canal) searchParams.set('canal', params.canal);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.eh_lembrete !== undefined) searchParams.set('eh_lembrete', String(params.eh_lembrete));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/comunicacoes${query ? '?' + query : ''}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar comunicações');
  return response.json();
},

listByAluno: async (token: string, matricula: string, params?: {
  tipo?: string;
  canal?: string;
  status?: string;
  eh_lembrete?: boolean;
  limit?: number;
}): Promise<unknown[]> => {
  const searchParams = new URLSearchParams();
  if (params?.tipo) searchParams.set('tipo', params.tipo);
  if (params?.canal) searchParams.set('canal', params.canal);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.eh_lembrete !== undefined) searchParams.set('eh_lembrete', String(params.eh_lembrete));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/alunos/${matricula}/comunicacoes${query ? '?' + query : ''}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar comunicações do aluno');
  return response.json();
},

create: async (token: string, data: {
  aluno_matricula: string;
  destinatario_tipo: string;
  destinatario_nome: string;
  destinatario_contato?: string;
  tipo_comunicacao: string;
  canal?: string;
  assunto?: string;
  mensagem: string;
  template_id?: string;
  eh_lembrete?: boolean;
  data_agendada?: string;
}): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/comunicacoes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao criar comunicação');
  return response.json();
},

update: async (token: string, id: number, data: Record<string, unknown>): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/comunicacoes/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao atualizar comunicação');
  return response.json();
},

delete: async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/comunicacoes/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Erro ao excluir comunicação');
},

stats: async (token: string): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/comunicacoes/stats`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao obter estatísticas');
  return response.json();
},

/**
 * Endpoint unificado para gerar mensagem, enviar e registrar no histórico
 */
disparar: async (token: string, data: {
  aluno_matricula: string;
  template_id: string;
  contexto: Record<string, unknown>;
  canal: string; // 'WHATSAPP', 'TELEGRAM', 'SISTEMA', 'EMAIL'
  destinatario_tipo?: string;
  destinatario_nome?: string;
  destinatario_contato?: string;
  modulo_origem?: string;
  eh_lembrete?: boolean;
  data_agendada?: string;
}): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/comunicacoes/disparar`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao disparar comunicação');
  }

  return response.json();
},

/**
 * Templates
 */
templates: {
  list: async (token: string, tipo?: string, canal?: string): Promise<unknown[]> => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (canal) params.set('canal', canal);
    const response = await fetch(
      `${API_BASE_URL}/templates-comunicacao${params.toString() ? '?' + params.toString() : ''}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Erro ao listar templates');
    return response.json();
  },

  create: async (token: string, data: Record<string, unknown>): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/templates-comunicacao`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erro ao criar template');
    return response.json();
  },

  update: async (token: string, id: number, data: Record<string, unknown>): Promise<unknown> => {
    const response = await fetch(`${API_BASE_URL}/templates-comunicacao/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erro ao atualizar template');
    return response.json();
  },
},
};
