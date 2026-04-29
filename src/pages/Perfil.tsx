import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, Clock, Key, Save, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth, Role } from '../services/AuthContext';
import { useToast } from '../components/ui/Toast';
import { cn } from '../utils';
import api from '../services/api';

export default function Perfil() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [isEditingSenha, setIsEditingSenha] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [senhaData, setSenhaData] = useState({
    atual: '',
    nova: '',
    confirmacao: '',
  });

  if (!user) return null;

  const roleColors = {
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    COORDENADOR: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    PEDAGOGO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    DIRETOR: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  };

  const permissoesList = user.role === 'ADMIN' 
    ? ['Acesso total ao sistema']
    : user.role === 'COORDENADOR'
    ? ['Gerenciar alunos', 'Ver relatórios', 'Intervenções']
    : user.role === 'PEDAGOGO'
    ? ['Questionários', 'Intervenções', 'Relatórios']
    : ['Visualizar dashboard', 'Relatórios gerenciais'];

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (senhaData.nova !== senhaData.confirmacao) {
      addToast({
        type: 'error',
        title: 'Senhas não coincidem',
        message: 'A nova senha e confirmação devem ser iguais.',
      });
      return;
    }

    if (senhaData.nova.length < 6) {
      addToast({
        type: 'error',
        title: 'Senha muito curta',
        message: 'A senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    try {
      const token = localStorage.getItem('sapee_token');
      if (!token) {
        addToast({
          type: 'error',
          title: 'Erro de autenticação',
          message: 'Faça login novamente.',
        });
        return;
      }

      await api.auth.trocarSenha(token, senhaData.atual, senhaData.nova);

      addToast({
        type: 'success',
        title: 'Senha alterada!',
        message: 'Sua senha foi atualizada com sucesso.',
      });

      setIsEditingSenha(false);
      setSenhaData({ atual: '', nova: '', confirmacao: '' });
    } catch (error: any) {
      console.error('Erro ao trocar senha:', error);
      addToast({
        type: 'error',
        title: 'Erro ao trocar senha',
        message: error.message || 'Não foi possível alterar sua senha.',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Meu Perfil</h2>
        <p className="text-gray-500 dark:text-slate-400">Gerencie suas informações pessoais e senha.</p>
      </div>

      {/* Card de Informações do Usuário */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden"
      >
        {/* Banner */}
        <div className="h-32 bg-linear-to-r from-emerald-600 to-emerald-700" />
        
        {/* Avatar e Info */}
        <div className="px-8 pb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-12 gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <User className="w-12 h-12" />
            </div>
            
            {/* Nome e Role */}
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{user.nome}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", roleColors[user.role])}>
                  {user.role}
                </span>
                {user.curso_nome && (
                  <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    {user.curso_nome}
                  </span>
                )}
              </div>
            </div>

            {/* Botão de Logout */}
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl
                         font-bold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors
                         flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Sair do Sistema
            </button>
          </div>

          {/* Informações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Email
                </label>
                <div className="flex items-center gap-2 mt-1 text-gray-900 dark:text-white">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{user.email}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Último Acesso
                </label>
                <div className="flex items-center gap-2 mt-1 text-gray-900 dark:text-white">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {'Acesso atual'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Status da Conta
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase">
                    Ativo
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Membro desde
                </label>
                <div className="flex items-center gap-2 mt-1 text-gray-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Permissões */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-8"
      >
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          Suas Permissões
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {permissoesList.map((recurso) => (
            <div
              key={recurso}
              className={cn(
                "p-3 rounded-xl border flex items-center gap-2",
                "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
              )}
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">
                {recurso}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trocar Senha */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            Segurança
          </h4>
          {!isEditingSenha && (
            <button
              onClick={() => setIsEditingSenha(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm 
                         hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Trocar Senha
            </button>
          )}
        </div>

        {isEditingSenha ? (
          <form onSubmit={handleTrocarSenha} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Senha Atual
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={senhaData.atual}
                  onChange={(e) => setSenhaData({...senhaData, atual: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                             rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                             text-gray-900 dark:text-white pr-12"
                  placeholder="Digite sua senha atual"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senhaData.nova}
                  onChange={(e) => setSenhaData({...senhaData, nova: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                             rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                             text-gray-900 dark:text-white pr-12"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type={showSenha ? 'text' : 'password'}
                value={senhaData.confirmacao}
                onChange={(e) => setSenhaData({...senhaData, confirmacao: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                           rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                           text-gray-900 dark:text-white"
                placeholder="Repita a nova senha"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditingSenha(false);
                  setSenhaData({ atual: '', nova: '', confirmacao: '' });
                }}
                className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 
                           rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold 
                           hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 
                           flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salvar Nova Senha
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Clique em "Trocar Senha" para alterar sua senha de acesso.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
