import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import AlunoDetail from './pages/AlunoDetail';
import CadastroAlunos from './pages/CadastroAlunos';
import ImportarDados from './pages/ImportarDados';
import Relatorios from './pages/Relatorios';
import AuditLogs from './pages/AuditLogs';
import Usuarios from './pages/Usuarios';
import Perfil from './pages/Perfil';
import LancarFrequencia from './pages/LancarFrequencia';
import Login from './pages/Login';
import Intervencoes from './pages/Intervencoes';
import AlunosEmRisco from './pages/AlunosEmRisco';
import AlunosMonitoramento from './pages/AlunosMonitoramento';
import RelatorioEficacia from './pages/RelatorioEficacia';
import IndicadoresEficacia from './pages/IndicadoresEficacia';
import PlanosAcao from './pages/PlanosAcao';
import LancarFaltas from './pages/LancarFaltas';
import AlertasFaltas from './pages/AlertasFaltas';
import RelatoriosGerenciais from './pages/RelatoriosGerenciais';
import QuestionarioPsicossocial from './pages/QuestionarioPsicossocial';
import QuestionarioPublico from './pages/QuestionarioPublico';
import GestaoTokens from './pages/GestaoTokens';
import Egressos from './pages/Egressos';
import DashboardQuestionario from './pages/DashboardQuestionario';

/**
 * MAPEAMENTO DE ROTAS - Módulo Alunos
 * 
 * ROTAS NOVAS (recomendadas):
 * /alunos              → Lista de alunos
 * /alunos/novo         → Cadastrar novo aluno
 * /alunos/:id          → Detalhes do aluno
 * /alunos/:id/editar   → Editar aluno (formulário completo)
 * 
 * ROTAS LEGADAS (mantidas para compatibilidade):
 * /cadastro            → Redireciona para /alunos/novo
 * /cadastro?edit=:id   → Redireciona para /alunos/:id/editar
 * /aluno/:id           → Redireciona para /alunos/:id
 */

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Rotas Protegidas */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        
                        {/* Módulo Alunos - Novas Rotas Semânticas */}
                        <Route path="/alunos" element={<Alunos />} />
                        <Route path="/alunos/novo" element={<CadastroAlunos />} />
                        <Route path="/alunos/:matricula" element={<AlunoDetail />} />
                        <Route path="/alunos/:matricula/editar" element={<CadastroAlunos />} />
                        
                        {/* Rotas Legadas (mantidas para compatibilidade) */}
                        <Route path="/aluno/:matricula" element={<AlunoDetail />} />
                        <Route path="/cadastro" element={<CadastroAlunos />} />
                        
                        <Route path="/frequencia" element={<LancarFrequencia />} />
                        <Route path="/faltas/lancar" element={<LancarFaltas />} />
                        <Route path="/faltas/alertas" element={<AlertasFaltas />} />
                        <Route path="/importar" element={<ImportarDados />} />
                        <Route path="/relatorios" element={<Relatorios />} />
                        <Route path="/relatorios-gerenciais" element={<RelatoriosGerenciais />} />
                        <Route path="/relatorio-eficacia" element={<RelatorioEficacia />} />
                        <Route path="/indicadores-eficacia" element={<IndicadoresEficacia />} />
                        <Route path="/planos-acao" element={<PlanosAcao />} />
                        <Route path="/intervencoes" element={<Intervencoes />} />
                        <Route path="/alunos-em-risco" element={<AlunosEmRisco />} />
                        <Route path="/alunos-monitoramento" element={<AlunosMonitoramento />} />
                        <Route path="/questionario" element={<QuestionarioPsicossocial />} />
                        <Route path="/gestao-tokens" element={<GestaoTokens />} />
                        <Route path="/egressos" element={<Egressos />} />
                        <Route path="/questionario-dashboard" element={<DashboardQuestionario />} />
                        <Route path="/logs" element={<AuditLogs />} />
                        <Route path="/usuarios" element={<Usuarios />} />
                        <Route path="/perfil" element={<Perfil />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              {/* Rota Pública do Questionário (Sem Login) */}
              <Route path="/questionario-publico" element={<QuestionarioPublico />} />

              {/* Rota de Acesso Negado */}
              <Route path="/unauthorized" element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                  <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white">403</h1>
                    <p className="text-gray-500 dark:text-slate-400">Acesso não autorizado</p>
                    <button
                      onClick={() => window.history.back()}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              } />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
