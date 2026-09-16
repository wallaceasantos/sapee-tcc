import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { TermoConsentimento } from '../TermoConsentimento';

describe('TermoConsentimento', () => {
  it('renderiza título do termo', () => {
    render(<TermoConsentimento onAceitar={() => {}} onRecusar={() => {}} />);

    expect(screen.getByText('Termo de Consentimento')).toBeInTheDocument();
  });

  it('chama onRecusar ao clicar em Não Concordo', async () => {
    const onRecusar = vi.fn();
    render(<TermoConsentimento onAceitar={() => {}} onRecusar={onRecusar} />);

    await userEvent.click(screen.getByRole('button', { name: /Não Concordo/i }));
    expect(onRecusar).toHaveBeenCalledTimes(1);
  });

  it('não chama onAceitar se checkbox não estiver marcado', async () => {
    const onAceitar = vi.fn();
    const { container } = render(<TermoConsentimento onAceitar={onAceitar} onRecusar={() => {}} />);

    const scrollArea = container.querySelector('.overflow-y-auto') as HTMLElement;
    act(() => {
      scrollArea.scrollTop = scrollArea.scrollHeight;
      scrollArea.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    await userEvent.click(screen.getByRole('button', { name: /Li e Concordo|Leia o Termo Primeiro/i }));
    expect(onAceitar).not.toHaveBeenCalled();
  });

  it('chama onAceitar após scroll completo e checkbox marcado', async () => {
    const onAceitar = vi.fn();
    const { container } = render(<TermoConsentimento onAceitar={onAceitar} onRecusar={() => {}} />);

    const scrollArea = container.querySelector('.overflow-y-auto') as HTMLElement;
    act(() => {
      scrollArea.scrollTop = scrollArea.scrollHeight;
      scrollArea.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await userEvent.click(checkbox);

    await userEvent.click(screen.getByRole('button', { name: /Li e Concordo/i }));
    expect(onAceitar).toHaveBeenCalledTimes(1);
  });
});
