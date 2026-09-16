import { API_BASE_URL } from './client';

export const configuracoes = {
list: async (token: string): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/configuracoes`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar configurações');
  return response.json();
},

get: async (token: string, chave: string): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/configuracoes/${chave}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao obter configuração');
  return response.json();
},

update: async (token: string, chave: string, valor: string): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/configuracoes/${chave}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor })
    }
  );
  if (!response.ok) throw new Error('Erro ao atualizar configuração');
  return response.json();
},

updateBatch: async (token: string, configs: Record<string, unknown>): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/configuracoes/batch`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(configs)
    }
  );
  if (!response.ok) throw new Error('Erro ao atualizar configurações em lote');
  return response.json();
},
};
