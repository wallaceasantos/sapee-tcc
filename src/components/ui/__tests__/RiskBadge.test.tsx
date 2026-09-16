import { render, screen } from '@testing-library/react';
import { RiskBadge } from '../RiskBadge';
import { NivelRisco } from '../../../types';

describe('RiskBadge', () => {
  it.each([
    [NivelRisco.BAIXO, 'Baixo Risco'],
    [NivelRisco.MEDIO, 'Médio Risco'],
    [NivelRisco.ALTO, 'Alto Risco'],
    [NivelRisco.MUITO_ALTO, 'Muito Alto Risco'],
  ] as const)('renderiza label correta para %s', (nivel, expectedLabel) => {
    render(<RiskBadge nivel={nivel} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('renderiza variante label sem ícone visível como badge', () => {
    render(<RiskBadge nivel={NivelRisco.ALTO} variant="label" />);
    expect(screen.getByText('Alto Risco')).toBeInTheDocument();
  });

  it('renderiza variante dot com label', () => {
    render(<RiskBadge nivel={NivelRisco.MEDIO} variant="dot" />);
    expect(screen.getByText('Médio Risco')).toBeInTheDocument();
  });
});
