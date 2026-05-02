/**
 * Hook para consumir API real de Alunos
 * SAPEE DEWAS Frontend
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Aluno, NivelRisco } from '../types';

export interface AlunoAPI {
  matricula: string;
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  idade?: number;
  sexo?: 'M' | 'F' | 'O';
  curso_id?: number;
  curso?: {
    id: number;
    nome: string;
    modalidade: string;
  };
  periodo?: number;
  turno?: string;
  media_geral?: number;
  frequencia?: number;
  historico_reprovas?: number;
  coeficiente_rendimento?: number;
  ano_ingresso?: number;
  cidade?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  zona_residencial?: string;
  renda_familiar?: number;
  renda_per_capita?: number;
  possui_auxilio?: boolean;
  tipo_auxilio?: string;
  trabalha?: boolean;
  carga_horaria_trabalho?: number;
  tempo_deslocamento?: number;
  custo_transporte_diario?: number;
  dificuldade_acesso?: string;
  transporte_utilizado?: string;
  usa_transporte_alternativo?: boolean;
  possui_computador?: boolean;
  possui_internet?: boolean;
  beneficiario_bolsa_familia?: boolean;
  primeiro_geracao_universidade?: boolean;

  // Dados dos Responsáveis
  nome_responsavel_1?: string;
  parentesco_responsavel_1?: string;
  telefone_responsavel_1?: string;
  email_responsavel_1?: string;
  nome_responsavel_2?: string;
  parentesco_responsavel_2?: string;
  telefone_responsavel_2?: string;

  predicao_atual?: {
    id: number;
    risco_evasao: number;
    nivel_risco: NivelRisco;
    fatores_principais?: string;
    modelo_ml_versao?: string;
    data_predicao: string;
  };
}

export interface FiltrosAlunosAPI {
  busca?: string;
  curso_id?: number;
  nivel_risco?: NivelRisco;
  skip?: number;
  limit?: number;
}

export interface UseAlunosReturn {
  data: AlunoAPI[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  deleteAluno: (matricula: string) => Promise<void>;
  deleteMultiple: (matriculas: string[]) => Promise<void>;
}

export function useAlunos(filtros: FiltrosAlunosAPI = {}): UseAlunosReturn {
  const [data, setData] = useState<AlunoAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadAlunos = useCallback(async () => {
    const token = localStorage.getItem('sapee_token');

    if (!token) {
      setError('Usuário não autenticado');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Construir query string com filtros
      const params = new URLSearchParams();
      
      if (filtros.skip !== undefined) params.set('skip', filtros.skip.toString());
      if (filtros.limit !== undefined) params.set('limit', filtros.limit.toString());
      if (filtros.curso_id !== undefined) params.set('curso_id', filtros.curso_id.toString());
      if (filtros.nivel_risco) params.set('nivel_risco', filtros.nivel_risco);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const alunosData: AlunoAPI[] = await response.json();
      
      // Aplicar filtro de busca no frontend (backend não suporta ainda)
      let filtered = alunosData;
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        filtered = filtered.filter(
          a => a.nome.toLowerCase().includes(busca) || 
               a.matricula.toLowerCase().includes(busca)
        );
      }

      setData(filtered);
      setTotal(filtered.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar alunos';
      setError(errorMessage);
      console.error('Erro ao carregar alunos:', err);
      
      // Definir dados vazios para não travar em loading
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [filtros.busca, filtros.curso_id, filtros.nivel_risco, filtros.skip, filtros.limit]);

  useEffect(() => {
    loadAlunos();
  }, [loadAlunos]);

  const deleteAluno = async (matricula: string) => {
    const token = localStorage.getItem('sapee_token');
    
    if (!token) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/alunos/${matricula}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao excluir aluno');
    }

    // Recarregar lista após exclusão
    await loadAlunos();
  };

  const deleteMultiple = async (matriculas: string[]) => {
    const token = localStorage.getItem('sapee_token');
    
    if (!token) {
      throw new Error('Usuário não autenticado');
    }

    // Deletar um por um (backend poderia ter endpoint em massa)
    for (const matricula of matriculas) {
      await deleteAluno(matricula);
    }

    await loadAlunos();
  };

  return {
    data,
    isLoading,
    error,
    total,
    refetch: loadAlunos,
    deleteAluno,
    deleteMultiple,
  };
}
