import { API_BASE_URL } from './client';

export interface EventoJornada {
  tipo: string;
  data: string | null;
  titulo: string;
  detalhes: Record<string, unknown>;
  cor: string;
  icone: string;
}

export interface JornadaResponse {
  matricula: string;
  nome: string;
  total_eventos: number;
  eventos: EventoJornada[];
}

export const jornada = {
  get: async (token: string, matricula: string): Promise<JornadaResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/alunos/${matricula}/jornada`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Erro ao obter jornada do aluno');
    return response.json();
  },
};
