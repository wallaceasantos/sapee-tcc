import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, Search, Filter, Download, User, Activity, Clock, Shield } from 'lucide-react';
import { getAuditLogs, AuditLog, logAction } from '../services/logService';
import { cn } from '../utils';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    carregarLogs();
  }, []);

  const carregarLogs = async () => {
    const logsData = await getAuditLogs();
    setLogs(logsData);
  };

  const exportToCSV = () => {
    const headers = 'Data;Usuario;Acao;Detalhes\n';
    const csvContent = logs.map(log => 
      `${new Date(log.criado_at).toLocaleString('pt-BR')};${log.usuario_email};${log.acao};${log.detalhes || ''}`
    ).join('\n');
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logAction('Exportação de Logs', 'Usuário exportou o histórico de auditoria para CSV');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.usuario_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.detalhes?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && log.acao.toLowerCase().includes(filter.toLowerCase());
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Logs de Auditoria</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1 font-medium">Rastreabilidade completa das ações realizadas no SAPEE.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar Logs (CSV)
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-4xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por usuário, ação ou detalhe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium dark:text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['all', 'Login', 'Export', 'Risco', 'Intervenção'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-3.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                filter === f 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none" 
                  : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              )}
            >
              {f === 'all' ? 'Todos os Logs' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-4xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Data / Hora</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Ação</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={log.id} 
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors">
                          <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-slate-300">{formatDate(log.criado_at)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-slate-400">{log.usuario_email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider",
                        log.acao.includes('Login') ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                        log.acao.includes('Export') ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" :
                        log.acao.includes('Risco') ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      )}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-gray-500 dark:text-slate-500 italic leading-relaxed">
                        {log.detalhes || 'Sem detalhes adicionais'}
                      </p>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-[2.5rem] bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                        <Shield className="w-10 h-10 text-gray-200 dark:text-slate-700" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">Nenhum log encontrado</p>
                        <p className="text-sm text-gray-500 dark:text-slate-500">Tente ajustar seus filtros de busca.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
