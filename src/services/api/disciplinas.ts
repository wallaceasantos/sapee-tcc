import { API_BASE_URL } from './client';

export const disciplinas = {
list: async (token: string, ativas_only: boolean = true): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/disciplinas?ativas_only=${ativas_only}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar disciplinas');
  return response.json();
},

create: async (token: string, data: { nome: string, ativa: boolean, curso_id?: number | null }): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/disciplinas`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao criar disciplina');
  return response.json();
},

update: async (token: string, id: number, data: Record<string, unknown>): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/disciplinas/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao atualizar disciplina');
  return response.json();
},

delete: async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/disciplinas/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Erro ao excluir disciplina');
},
};
