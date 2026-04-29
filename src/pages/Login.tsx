import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, ShieldCheck, GraduationCap, AlertCircle, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logAction } from '../services/logService';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('sapee_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sapee_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sapee_theme', 'light');
    }
  }, [isDarkMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Login com novo AuthContext
    login(email, password).then((success) => {
      if (success) {
        localStorage.setItem('sapee_user_email', email);
        navigate('/');
      } else {
        setError('E-mail ou senha inválidos. Verifique suas credenciais.');
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center p-4 font-sans transition-colors duration-300">
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="fixed top-4 right-4 p-3 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all shadow-md z-50"
        aria-label="Alternar tema"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-50 dark:bg-emerald-500/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-50 dark:bg-blue-500/5 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-200 dark:shadow-emerald-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            SAPEE <span className="text-emerald-600 dark:text-emerald-400"></span>
          </h1>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Sistema de Alerta de Predição de Evasão Escolar</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail Institucional</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-600"
                  placeholder="exemplo@dewas.com.br"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error-message"
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl text-sm font-semibold border border-red-100 dark:border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 dark:shadow-emerald-500/20 hover:bg-emerald-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Acessar Sistema</span>
                  <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 dark:border-slate-800 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500 font-medium flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Acesso restrito a servidores autorizados
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 dark:text-slate-600 font-bold uppercase tracking-widest">
            DEWAS Sistemas todos os direitos reservados 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
