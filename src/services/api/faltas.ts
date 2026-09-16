import { API_BASE_URL } from './client';

export const faltas = {
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
): Promise<unknown> => {
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
): Promise<unknown> => {
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
 * Enviar notificação rápida via WhatsApp/Telegram (Gatilho)
 */
enviarRapido: async (token: string, matricula: string, data: {
  mensagem: string;
  canal: string; // 'WHATSAPP', 'TELEGRAM', 'SISTEMA'
  tipo: string;  // 'FALTAS', 'RISCO', 'INTERVENCAO'
  destinatario_nome: string;
  destinatario_contato: string;
}): Promise<unknown> => {
  // Chama o endpoint de comunicações para garantir o log
  const response = await fetch(`${API_BASE_URL}/comunicacoes`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      aluno_matricula: matricula,
      destinatario_tipo: 'RESPONSAVEL',
      destinatario_nome: data.destinatario_nome,
      destinatario_contato: data.destinatario_contato,
      tipo_comunicacao: data.tipo,
      canal: data.canal,
      mensagem: data.mensagem,
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao enviar notificação');
  }

  return response.json();
},

/**
 * Verificar faltas consecutivas
 */
verificarConsecutivas: async (
  token: string,
  matricula: string
): Promise<unknown> => {
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
 * Obter faltas agrupadas por disciplina
 */
porDisciplina: async (
  token: string,
  matricula: string,
  periodo_letivo?: string
): Promise<unknown[]> => {
  const params = new URLSearchParams();
  if (periodo_letivo) params.set('periodo_letivo', periodo_letivo);
  const response = await fetch(
    `${API_BASE_URL}/alunos/${matricula}/faltas-por-disciplina?${params.toString()}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao buscar faltas por disciplina');
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
): Promise<unknown> => {
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
): Promise<unknown> => {
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
stats: async (token: string): Promise<unknown> => {
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
};
