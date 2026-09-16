import { API_BASE_URL } from './client';

export const cursos = {
list: async (token: string): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/cursos`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar cursos');
  return response.json();
},

get: async (token: string, id: number): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/cursos/${id}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao buscar curso');
  return response.json();
},

create: async (token: string, data: { nome: string, modalidade?: string }): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/cursos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao criar curso');
  return response.json();
},

update: async (token: string, id: number, data: Record<string, unknown>): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/cursos/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao atualizar curso');
  return response.json();
},

delete: async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/cursos/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Erro ao excluir curso');
},
};
