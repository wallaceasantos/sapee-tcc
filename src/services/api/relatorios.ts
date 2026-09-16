import { API_BASE_URL } from './client';

export const relatorios = {
getAlunosRisco: async (token: string, nivel: string = 'ALTO'): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/relatorios/gerenciais/alunos-risco?nivel=${nivel}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao buscar alunos em risco');
  return response.json();
},

getMapaCalor: async (token: string): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/relatorios/gerenciais/mapa-calor`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao buscar mapa de calor');
  return response.json();
},

getEficacia: async (token: string): Promise<unknown[]> => {
  const response = await fetch(
    `${API_BASE_URL}/relatorios/gerenciais/eficacia`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Erro ao buscar dados de eficácia');
  return response.json();
},
};
