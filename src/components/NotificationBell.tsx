/**
 * Sino de Notificações - Alertas em Tempo Real
 * SAPEE DEWAS Frontend
 */

import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../services/AuthContext';

interface Alerta {
  id: number;
  aluno: {
    matricula: string;
    nome: string;
    curso: string;
    nome_responsavel_1?: string;
    telefone_responsavel_1?: string;
  };
  risco_evasao: number;
  nivel_risco: string;
  fatores_principais: string;
  data_predicao: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [naoLidos, setNaoLidos] = useState<number>(0);

  // Carregar alertas
  const carregarAlertas = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sapee_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/notificacoes/alertas?nivel=ALTO&limit=10`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAlertas(data.alertas || []);
        setNaoLidos(data.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar ao montar
  useEffect(() => {
    carregarAlertas();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(carregarAlertas, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Enviar alerta individual via Telegram
  const enviarAlertaTelegram = async (matricula: string) => {
    try {
      const token = localStorage.getItem('sapee_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/notificacoes/alerta-geral/${matricula}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        alert('✅ Alerta enviado para Telegram!');
      }
    } catch (error) {
      console.error('Erro ao enviar alerta:', error);
      alert('❌ Erro ao enviar alerta');
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'CRITICO': return 'text-red-600 bg-red-50 dark:bg-red-500/10';
      case 'ALTO': return 'text-orange-600 bg-orange-50 dark:bg-orange-500/10';
      case 'MEDIO': return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-500/10';
    }
  };

  const getIcon = (nivel: string) => {
    switch (nivel) {
      case 'CRITICO':
      case 'ALTO': return <AlertTriangle className="w-5 h-5" />;
      case 'MEDIO': return <AlertCircle className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative">
      {/* Sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge de não lidos */}
        {naoLidos > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {naoLidos > 9 ? '9+' : naoLidos}
          </span>
        )}
      </button>

      {/* Dropdown de Alertas */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alertas de Risco
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Lista de Alertas */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">
                  Carregando alertas...
                </div>
              ) : alertas.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                  <p>Nenhum alerta de risco</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {alertas.map((alerta) => (
                    <div
                      key={alerta.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${getNivelColor(alerta.nivel_risco)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getIcon(alerta.nivel_risco)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {alerta.aluno.nome}
                            </h4>
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/50 dark:bg-black/20">
                              {alerta.nivel_risco}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                            {alerta.aluno.curso}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500"
                                  style={{ width: `${alerta.risco_evasao}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                {alerta.risco_evasao.toFixed(0)}%
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {alerta.aluno.telefone_responsavel_1 && (
                                <a
                                  href={`https://wa.me/${alerta.aluno.telefone_responsavel_1.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-semibold"
                                  title="WhatsApp responsável"
                                >
                                  💬
                                </a>
                              )}
                              <button
                                onClick={() => enviarAlertaTelegram(alerta.aluno.matricula)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                                title="Enviar Telegram"
                              >
                                📱
                              </button>
                            </div>
                          </div>

                          {alerta.aluno.nome_responsavel_1 && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                              👤 {alerta.aluno.nome_responsavel_1}
                              {alerta.aluno.telefone_responsavel_1 && ` • ${alerta.aluno.telefone_responsavel_1}`}
                            </p>
                          )}
                          
                          {alerta.fatores_principais && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                              {alerta.fatores_principais.substring(0, 80)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 text-center">
              <a
                href="/alunos?nivelRisco=ALTO"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
              >
                Ver todos os alunos em risco →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
