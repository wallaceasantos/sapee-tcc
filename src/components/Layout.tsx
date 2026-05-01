import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, User, FileUp, BarChart3, GraduationCap, Menu, X, LogOut, Bell, Moon, Sun, Search, ChevronRight, AlertCircle, History, UserCircle, Shield, Calendar, TrendingUp, Heart, Target, AlertTriangle, FileText, ClipboardList, PieChart, Key, LogOut as LogOutIcon, Eye } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import HelpDrawer from './HelpDrawer';
import OnboardingTour from './OnboardingTour';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useAuth } from '../services/AuthContext';
import { logAction } from '../services/logService';
import { CanAccess } from './CanAccess';
import { HelpCircle } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alunos', label: 'Alunos', icon: Users },
  { path: '/cadastro', label: 'Cadastro', icon: User },
  { path: '/frequencia', label: 'Lançar Frequência', icon: Calendar, requiresPermission: 'frequencia' },
  { path: '/faltas/lancar', label: 'Lançar Faltas', icon: AlertTriangle },
  { path: '/faltas/alertas', label: 'Alertas de Faltas', icon: AlertCircle },
  { path: '/intervencoes', label: 'Intervenções', icon: GraduationCap },
  { path: '/alunos-em-risco', label: '⚠️ Alunos em Risco', icon: AlertTriangle },
  { path: '/alunos-monitoramento', label: '👀 Monitoramento', icon: Eye },
  { path: '/planos-acao', label: 'Planos de Ação', icon: Target },
  { path: '/questionario', label: 'Questionário Psicossocial', icon: ClipboardList },
  { path: '/gestao-tokens', label: 'Gestão de Tokens', icon: Key },
  { path: '/egressos', label: 'Egressos', icon: LogOutIcon },
  { path: '/questionario-dashboard', label: 'Dashboard Questionário', icon: PieChart },
  { path: '/relatorios-gerenciais', label: 'Relatórios Gerenciais', icon: FileText },
  { path: '/relatorio-eficacia', label: 'Relatório de Eficácia', icon: TrendingUp },
  { path: '/indicadores-eficacia', label: 'Indicadores de Eficácia', icon: Heart },
  { path: '/importar', label: 'Importar Dados', icon: FileUp },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { path: '/logs', label: 'Logs do Sistema', icon: History, requiresPermission: 'logs' },
  { path: '/usuarios', label: 'Usuários', icon: UserCircle, requiresPermission: 'usuarios' },
];

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'alert' | 'info' | 'success';
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Risco Crítico Detectado', description: '3 alunos de Informática subiram para risco ALTO.', time: '5 min atrás', read: false, type: 'alert' },
  { id: '2', title: 'Importação Concluída', description: 'Arquivo alunos_2024_1.csv processado com sucesso.', time: '1h atrás', read: true, type: 'success' },
  { id: '3', title: 'Novo Relatório Disponível', description: 'O relatório mensal de evasão foi gerado.', time: '2h atrás', read: true, type: 'info' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('sapee_theme') === 'dark');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  
  // Estados para Ajuda e Tour
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Verifica se é o primeiro acesso para exibir o tour
    const hasVisited = localStorage.getItem('sapee_has_visited');
    const skipTour = localStorage.getItem('sapee_skip_tour');

    // Só mostra o tour se o usuário nunca visitou E não marcou "não mostrar novamente"
    if (!hasVisited && !skipTour) {
      setShowTour(true);
      localStorage.setItem('sapee_has_visited', 'true');
    }
  }, []);

  const handleResetTour = () => {
    localStorage.removeItem('sapee_has_visited');
    setShowTour(true);
    setIsHelpOpen(false);
  };

  const tourSteps = [
    {
      title: "Bem-vindo ao SAPEE! 🎓",
      text: "O Sistema de Alerta de Predição de Evasão Escolar ajuda a identificar alunos em risco antes que seja tarde demais."
    },
    {
      title: "Alertas Inteligentes 🧠",
      text: "O algoritmo analisa frequência, notas e fatores sociais para gerar um Score de Risco. Quanto maior o score, maior a urgência."
    },
    {
      title: "Intervenções e Ciclos 🔄",
      text: "Ao criar uma intervenção, inicia-se um ciclo de 6 meses. O sistema guiará você através de checkpoints automáticos para garantir o sucesso do aluno."
    },
    {
      title: "Guia de Ajuda 📘",
      text: "Sempre que tiver dúvidas, clique no ícone de '?' no topo para acessar o Guia Completo do Ciclo de 6 Meses."
    }
  ];

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('sapee_theme', 'dark');
      console.log('🌙 Dark mode ativado');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('sapee_theme', 'light');
      console.log('☀️ Light mode ativado');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    logAction('Logout', 'Usuário encerrou a sessão');
    logout();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/alunos?busca=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 sticky top-0 h-screen z-40">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none rotate-3">
            <GraduationCap className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-2xl text-gray-900 dark:text-white tracking-tight leading-none">SAPEE</h1>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">DEWAS</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;

            // Verificar se requer permissão específica
            if (item.requiresPermission) {
              return (
                <React.Fragment key={item.path}>
                  <CanAccess
                    permission={item.requiresPermission}
                    fallback={null}
                  >
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden",
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm"
                          : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-slate-500")} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="active-pill"
                          className="absolute left-0 w-1.5 h-6 bg-emerald-600 rounded-r-full"
                        />
                      )}
                    </Link>
                  </CanAccess>
                </React.Fragment>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm"
                    : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-slate-500")} />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1.5 h-6 bg-emerald-600 rounded-r-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800">
          <UserProfile />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Desktop */}
        <header className="hidden md:flex items-center justify-between px-8 py-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 sticky top-0 z-30">
          <form onSubmit={handleSearch} className="flex items-center gap-4 flex-1 max-xl:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alunos, cursos..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>
          </form>

          <div className="flex items-center gap-4">
            {/* Sino de Notificações */}
            <NotificationBell />

            {/* Botão de Ajuda */}
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
              title="Guia e Ajuda"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-700">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user?.nome || 'Usuário'}</p>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">{user?.role || 'Role'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-3 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all min-w-11 min-h-11 flex items-center justify-center"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="bg-emerald-600 p-2 rounded-xl rotate-3">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Sino de Notificações Mobile */}
            <NotificationBell />

            {/* Botão de Ajuda Mobile */}
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-2.5 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all min-w-11 min-h-11 flex items-center justify-center"
              title="Guia e Ajuda"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all min-w-11 min-h-11 flex items-center justify-center"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto bg-gray-50 dark:bg-slate-950 min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 h-full w-[85vw] max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2.5 rounded-2xl rotate-3">
                    <GraduationCap className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="font-black text-xl text-gray-900 dark:text-white">SAPEE</h1>
                    <span className="text-xs font-bold text-emerald-600 uppercase">DEWAS</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-100px)]">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;

                  if (item.requiresPermission) {
                    return (
                      <React.Fragment key={item.path}>
                        <CanAccess permission={item.requiresPermission} fallback={null}>
                          <Link
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                                : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </Link>
                        </CanAccess>
                      </React.Fragment>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                          : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold">Sair do Sistema</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Componentes de Ajuda */}
      <HelpDrawer 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        onResetTour={handleResetTour}
      />
      
      <OnboardingTour 
        steps={tourSteps}
        isRunning={showTour}
        onFinish={() => setShowTour(false)}
        onClose={() => setShowTour(false)}
      />
    </div>
  );
}

function UserProfile() {
  const { user } = useAuth();

  return (
    <Link
      to="/perfil"
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all group"
    >
      <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-black shadow-md group-hover:shadow-lg transition-all">
        {user?.nome ? user.nome.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.nome || 'Usuário'}</p>
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase truncate">{user?.role || 'Role'}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-all" />
    </Link>
  );
}
