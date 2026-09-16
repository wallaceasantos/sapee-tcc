import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pergunta } from '../Pergunta';

describe('Pergunta', () => {
  const perguntaBase = {
    id: 'q1',
    texto: 'Como você se sente em relação aos estudos?',
  };

  it('renderiza o texto da pergunta', () => {
    render(<Pergunta pergunta={perguntaBase} onChange={() => {}} />);

    expect(screen.getByText(perguntaBase.texto)).toBeInTheDocument();
  });

  it('renderiza indicador para pergunta invertida', () => {
    render(<Pergunta pergunta={{ ...perguntaBase, invertida: true }} onChange={() => {}} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('chama onChange ao selecionar uma opção', async () => {
    const handleChange = vi.fn();
    render(<Pergunta pergunta={perguntaBase} onChange={handleChange} />);

    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('destaca opção selecionada', () => {
    render(<Pergunta pergunta={perguntaBase} valor={4} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
  });

  it('exibe mensagem de erro quando fornecida', () => {
    render(<Pergunta pergunta={perguntaBase} onChange={() => {}} erro="Resposta obrigatória" />);

    expect(screen.getByText('Resposta obrigatória')).toBeInTheDocument();
  });
});
