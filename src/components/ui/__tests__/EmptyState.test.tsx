import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renderiza título e descrição', () => {
    render(
      <EmptyState
        icon={Search}
        title="Nenhum resultado"
        description="Tente ajustar os filtros da busca."
      />,
    );

    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument();
    expect(screen.getByText('Tente ajustar os filtros da busca.')).toBeInTheDocument();
  });

  it('renderiza botão de ação e dispara callback', async () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Search}
        title="Vazio"
        description="Nada aqui"
        action={{ label: 'Recarregar', onClick: handleAction }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Recarregar' });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
