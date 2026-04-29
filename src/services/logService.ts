import { useAuth } from './AuthContext';

export interface AuditLog {
  id: number;
  usuario_email: string;
  acao: string;
  detalhes?: string;
  ip_address?: string;
  criado_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const logAction = async (acao: string, detalhes?: string) => {
  const userEmail = localStorage.getItem('sapee_user_email') || 'sistema@dewas.com.br';
  const token = localStorage.getItem('sapee_token');

  // Salva sempre no localStorage (fallback)
  const logs = JSON.parse(localStorage.getItem('sapee_audit_logs') || '[]');
  const newLog = {
    id: Date.now(),
    usuario_email: userEmail,
    acao,
    detalhes,
    criado_at: new Date().toISOString(),
  };
  localStorage.setItem('sapee_audit_logs', JSON.stringify([newLog, ...logs].slice(0, 100)));

  // Envia para backend
  if (token) {
    try {
      const response = await fetch(`${API_BASE_URL}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          acao,
          detalhes,
          ip_address: '127.0.0.1'
        }),
      });

      if (!response.ok) {
        console.warn('Falha ao salvar log no servidor');
      }
    } catch (error) {
      console.warn('Backend offline, log salvo apenas localmente:', error);
    }
  }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const token = localStorage.getItem('sapee_token');

  // Tenta buscar do backend primeiro
  if (token) {
    try {
      const response = await fetch(`${API_BASE_URL}/audit-logs?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const logs = await response.json();
        return logs.map((log: any) => ({
          id: log.id,
          usuario_email: log.usuario?.email || 'sistema',
          acao: log.acao,
          detalhes: log.detalhes,
          ip_address: log.ip_address,
          criado_at: log.criado_at,
        }));
      }
    } catch (error) {
      console.warn('Backend offline, usando logs locais:', error);
    }
  }

  // Fallback para localStorage
  return JSON.parse(localStorage.getItem('sapee_audit_logs') || '[]');
};
