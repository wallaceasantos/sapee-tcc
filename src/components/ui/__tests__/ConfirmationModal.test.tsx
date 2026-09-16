import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationModal } from '../ConfirmationModal';

describe('ConfirmationModal', () => {
  it('não renderiza quando isOpen é false', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Excluir?"
        description="Ação irreversível"
      />,
    );

    expect(screen.queryByText('Excluir?')).not.toBeInTheDocument();
  });

  it('renderiza título, descrição e botões quando aberto', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        title="Confirmar ação"
        description="Deseja prosseguir?"
        confirmText="Sim"
        cancelText="Não"
      />,
    );

    expect(screen.getByText('Confirmar ação')).toBeInTheDocument();
    expect(screen.getByText('Deseja prosseguir?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sim' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Não' })).toBeInTheDocument();
  });

  it('chama onClose ao clicar em cancelar', async () => {
    const onClose = vi.fn();
    render(
      <ConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={() => {}}
        title="Confirmar"
        description="Teste"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onConfirm ao clicar em confirmar', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Confirmar"
        description="Teste"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('desabilita botões durante confirmação e mostra spinner', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        title="Confirmar"
        description="Teste"
        isConfirming
      />,
    );

    expect(screen.getByText('Processando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Processando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
