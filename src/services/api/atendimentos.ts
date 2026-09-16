import { API_BASE_URL } from './client';

export const atendimentos = {
list: async (token: string, matricula: string, params?: {
  tipo?: string;
  status?: string;
  prioridade?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<unknown[]> => {
  const searchParams = new URLSearchParams();
  if (params?.tipo) searchParams.set('tipo', params.tipo);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.prioridade) searchParams.set('prioridade', params.prioridade);
  if (params?.data_inicio) searchParams.set('data_inicio', params.data_inicio);
  if (params?.data_fim) searchParams.set('data_fim', params.data_fim);
  const query = searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/alunos/${matricula}/atendimentos${query ? '?' + query : ''}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar atendimentos');
  return response.json();
},

listAll: async (token: string, params?: {
  tipo?: string;
  status?: string;
  prioridade?: string;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
}): Promise<unknown[]> => {
  const searchParams = new URLSearchParams();
  if (params?.tipo) searchParams.set('tipo', params.tipo);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.prioridade) searchParams.set('prioridade', params.prioridade);
  if (params?.data_inicio) searchParams.set('data_inicio', params.data_inicio);
  if (params?.data_fim) searchParams.set('data_fim', params.data_fim);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/atendimentos${query ? '?' + query : ''}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar atendimentos');
  return response.json();
},

create: async (token: string, matricula: string, data: {
  tipo_atendimento: string;
  status?: string;
  data_atendimento: string;
  descricao: string;
  usuario_id: number;
  hora_inicio?: string;
  hora_fim?: string;
  local?: string;
  observacoes?: string;
  necessita_encaminhamento?: boolean;
  tipo_encaminhamento?: string;
  data_encaminhamento?: string;
  necessita_followup?: boolean;
  data_proximo_atendimento?: string;
  prioridade?: string;
}): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/alunos/${matricula}/atendimentos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao criar atendimento');
  return response.json();
},

update: async (token: string, matricula: string, id: number, data: Record<string, unknown>): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/alunos/${matricula}/atendimentos/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao atualizar atendimento');
  return response.json();
},

delete: async (token: string, matricula: string, id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/alunos/${matricula}/atendimentos/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Erro ao excluir atendimento');
},

stats: async (token: string): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/atendimentos/stats`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao obter estatísticas');
  return response.json();
},

historico: async (token: string, atendimentoId: number): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/atendimentos/${atendimentoId}/historico`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao obter histórico');
  return response.json();
},

alertasDemora: async (token: string, diasLimite: number = 30): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/atendimentos/alertas-demora?dias_limite=${diasLimite}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao obter alertas de demora');
  return response.json();
},
};
