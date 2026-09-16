import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renderiza título e valor', () => {
    render(<StatCard title="Alunos" value={42} icon={Users} color="blue" />);

    expect(screen.getByText('Alunos')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renderiza tendência positiva', () => {
    render(
      <StatCard
        title="Taxa"
        value="85%"
        icon={Users}
        color="emerald"
        trend={{ value: 12, label: 'vs mês anterior', isPositive: true }}
      />,
    );

    expect(screen.getByText('+12% vs mês anterior')).toBeInTheDocument();
  });

  it('renderiza tendência negativa', () => {
    render(
      <StatCard
        title="Taxa"
        value="85%"
        icon={Users}
        color="red"
        trend={{ value: 5, label: 'vs mês anterior', isPositive: false }}
      />,
    );

    expect(screen.getByText('-5% vs mês anterior')).toBeInTheDocument();
  });

  it('chama onClick ao clicar no card', async () => {
    const handleClick = vi.fn();
    const { container } = render(
      <StatCard title="Clique" value={1} icon={Users} color="purple" onClick={handleClick} />,
    );

    await userEvent.click(container.firstElementChild as HTMLElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
