import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, Role, User } from '../services/AuthContext';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  auth?: AuthState;
  route?: string;
}

const defaultAuth: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

function createMockAuthValue(state: AuthState) {
  return {
    ...state,
    token: state.user ? 'mock-token' : null,
    login: () => Promise.resolve(true),
    logout: () => {},
    hasRole: (role: Role | Role[]) => {
      if (!state.user) return false;
      if (Array.isArray(role)) return role.includes(state.user.role);
      return state.user.role === role;
    },
    can: (recurso: string, acao?: string) => {
      if (!state.user) return false;
      if (state.user.role === 'ADMIN') return true;
      switch (state.user.role) {
        case 'COORDENADOR':
          return recurso !== 'logs' && recurso !== 'usuarios';
        case 'PEDAGOGO':
          if (recurso === 'alunos' && acao === 'delete') return false;
          return recurso !== 'importar' && recurso !== 'usuarios';
        case 'DIRETOR':
          return recurso !== 'usuarios' && recurso !== 'configuracoes';
        case 'PROFESSOR':
          if (recurso === 'usuarios' || recurso === 'importar' || recurso === 'logs' || recurso === 'configuracoes') return false;
          if (recurso === 'alunos' && acao && acao !== 'read') return false;
          return true;
        default:
          return false;
      }
    },
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) {
  const { auth = defaultAuth, route = '/', ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={createMockAuthValue(auth)}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export function createMockUser(role: Role = 'ADMIN'): User {
  return {
    id: 1,
    nome: 'Usuário Teste',
    email: 'teste@example.com',
    role,
    curso_id: 1,
    curso_nome: 'Curso Teste',
    ativo: true,
  };
}
