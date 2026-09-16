import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../../services/AuthContext';
import { ProtectedRoute } from '../ProtectedRoute';
import { createMockUser } from '../../test/utils';

function renderWithRouter(auth: { user: ReturnType<typeof createMockUser> | null; isLoading: boolean }) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthContext.Provider
        value={{
          user: auth.user,
          token: null,
          isAuthenticated: !!auth.user,
          isLoading: auth.isLoading,
          login: () => Promise.resolve(true),
          logout: () => {},
          hasRole: () => false,
          can: () => false,
        }}
      >
        <Routes>
          <Route path="/login" element={<span>Página de Login</span>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <span>Área Restrita</span>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('renderiza loading enquanto autenticação está carregando', () => {
    renderWithRouter({ user: null, isLoading: true });

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('redireciona para login quando não autenticado', async () => {
    renderWithRouter({ user: null, isLoading: false });

    expect(await screen.findByText('Página de Login')).toBeInTheDocument();
  });

  it('renderiza conteúdo quando autenticado com role correta', () => {
    renderWithRouter({ user: createMockUser('ADMIN'), isLoading: false });

    expect(screen.getByText('Área Restrita')).toBeInTheDocument();
  });
});
