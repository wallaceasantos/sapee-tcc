import { screen } from '@testing-library/react';
import { CanAccess } from '../CanAccess';
import { createMockUser, renderWithProviders } from '../../test/utils';

describe('CanAccess', () => {
  it('renderiza children para usuário ADMIN sem restrições', () => {
    renderWithProviders(
      <CanAccess role={['PROFESSOR']}>
        <span>Conteúdo restrito</span>
      </CanAccess>,
      { auth: { user: createMockUser('ADMIN'), isAuthenticated: true, isLoading: false } },
    );

    expect(screen.getByText('Conteúdo restrito')).toBeInTheDocument();
  });

  it('renderiza children quando role coincide', () => {
    renderWithProviders(
      <CanAccess role="PEDAGOGO">
        <span>Área pedagógica</span>
      </CanAccess>,
      { auth: { user: createMockUser('PEDAGOGO'), isAuthenticated: true, isLoading: false } },
    );

    expect(screen.getByText('Área pedagógica')).toBeInTheDocument();
  });

  it('renderiza fallback quando role não coincide', () => {
    renderWithProviders(
      <CanAccess role="ADMIN" fallback={<span>Sem acesso</span>}>
        <span>Área administrativa</span>
      </CanAccess>,
      { auth: { user: createMockUser('PROFESSOR'), isAuthenticated: true, isLoading: false } },
    );

    expect(screen.getByText('Sem acesso')).toBeInTheDocument();
    expect(screen.queryByText('Área administrativa')).not.toBeInTheDocument();
  });

  it('renderiza fallback quando não há usuário', () => {
    renderWithProviders(
      <CanAccess fallback={<span>Faça login</span>}>
        <span>Conteúdo</span>
      </CanAccess>,
      { auth: { user: null, isAuthenticated: false, isLoading: false } },
    );

    expect(screen.getByText('Faça login')).toBeInTheDocument();
  });

  it('verifica permissão granular com can', () => {
    renderWithProviders(
      <CanAccess recurso="alunos" acao="delete" fallback={<span>Não pode excluir</span>}>
        <span>Botão excluir</span>
      </CanAccess>,
      { auth: { user: createMockUser('PEDAGOGO'), isAuthenticated: true, isLoading: false } },
    );

    expect(screen.getByText('Não pode excluir')).toBeInTheDocument();
  });
});
