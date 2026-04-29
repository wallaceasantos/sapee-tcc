import { useState, useEffect } from 'react';
import { MOCK_ALUNOS } from '../services/mockData';
import { AlunoComRisco, FiltrosAlunos } from '../types';

interface UseMockAlunosOptions {
  filtros?: Partial<FiltrosAlunos>;
  delay?: number; // Simular loading em ms
}

export function useMockAlunos(options: UseMockAlunosOptions = {}) {
  const { filtros, delay = 600 } = options;
  const [data, setData] = useState<AlunoComRisco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    const timer = setTimeout(() => {
      try {
        let filtered = [...MOCK_ALUNOS];

        // Filtrar por busca
        if (filtros?.busca) {
          const busca = filtros.busca.toLowerCase();
          filtered = filtered.filter(
            a => a.nome.toLowerCase().includes(busca) || a.id.toLowerCase().includes(busca)
          );
        }

        // Filtrar por curso
        if (filtros?.curso) {
          filtered = filtered.filter(a => a.curso === filtros.curso);
        }

        // Filtrar por nível de risco
        if (filtros?.nivelRisco) {
          filtered = filtered.filter(a => a.predicao.nivel_risco === filtros.nivelRisco);
        }

        setData(filtered);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [filtros?.busca, filtros?.curso, filtros?.nivelRisco, delay]);

  return { data, isLoading, error };
}
