import { storage } from '../utils/storage';

export interface AuditLog {
  id: number;
  usuario_email: string;
  acao: string;
  detalhes?: string;
  ip_address?: string;
  criado_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const logAction = async (acao: string, detalhes?: string) => {
  const userEmail = storage.userEmail.get() || 'sistema@dewas.com.br';
  const token = storage.token.get();

  const logs = storage.auditLogs.get();
  const newLog = {
    id: Date.now(),
    usuario_email: userEmail,
    acao,
    detalhes,
    criado_at: new Date().toISOString(),
  };
  storage.auditLogs.set([newLog, ...logs].slice(0, 100));

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
  const token = storage.token.get();

  if (token) {
    try {
      const response = await fetch(`${API_BASE_URL}/audit-logs?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const logs = await response.json();
        return logs.map((log: unknown) => {
          const logRecord = log as Record<string, unknown>;
          return {
            id: logRecord.id as number,
            usuario_email: (logRecord.usuario as { email?: string } | undefined)?.email || 'sistema',
            acao: logRecord.acao as string,
            detalhes: logRecord.detalhes as string | undefined,
            ip_address: logRecord.ip_address as string | undefined,
            criado_at: logRecord.criado_at as string,
          };
        });
      }
    } catch (error) {
      console.warn('Backend offline, usando logs locais:', error);
    }
  }

  return storage.auditLogs.get<AuditLog>();
};
