import { render, screen } from '@testing-library/react';
import { BarraProgresso } from '../BarraProgresso';

describe('BarraProgresso', () => {
  it('calcula e exibe porcentagem padrão', () => {
    render(<BarraProgresso atual={2} total={10} />);

    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('2 de 10 questões')).toBeInTheDocument();
  });

  it('usa porcentagem fornecida quando disponível', () => {
    render(<BarraProgresso atual={1} total={10} porcentagem={75} />);

    expect(screen.getByText('75%', { selector: 'p.text-2xl' })).toBeInTheDocument();
  });

  it.each([
    [10, 'Iniciando...'],
    [40, 'Continuando...'],
    [70, 'Quase lá!'],
    [90, 'Completo!'],
  ])('mostra mensagem correta para progresso %s', (porcentagem, mensagem) => {
    render(<BarraProgresso atual={porcentagem} total={100} porcentagem={porcentagem} />);
    expect(screen.getByText(mensagem)).toBeInTheDocument();
  });
});
