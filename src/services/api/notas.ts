import { API_BASE_URL } from './client';

export const notas = {
list: async (token: string, matricula: string, periodo_letivo?: string): Promise<unknown[]> => {
  const params = periodo_letivo ? `?periodo_letivo=${periodo_letivo}` : '';
  const response = await fetch(
    `${API_BASE_URL}/alunos/${matricula}/notas${params}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao listar notas');
  return response.json();
},

create: async (token: string, matricula: string, data: {
  disciplina: string;
  disciplina_id?: number | null;
  periodo_letivo: string;
  bimestre: number;
  nota: number;
  faltas_disciplina?: number;
  situacao?: string;
}): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/alunos/${matricula}/notas`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao criar nota');
  return response.json();
},

update: async (token: string, matricula: string, notaId: number, data: Record<string, unknown>): Promise<unknown> => {
  const response = await fetch(`${API_BASE_URL}/alunos/${matricula}/notas/${notaId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Erro ao atualizar nota');
  return response.json();
},

delete: async (token: string, matricula: string, notaId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/alunos/${matricula}/notas/${notaId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Erro ao excluir nota');
},

resumo: async (token: string, matricula: string): Promise<unknown> => {
  const response = await fetch(
    `${API_BASE_URL}/alunos/${matricula}/notas/resumo`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao obter resumo de notas');
  return response.json();
},
};
