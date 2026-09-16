/**
 * Hook para obter estatísticas do dashboard
 */
import { useState, useEffect } from 'react';
import api from '../services/api';

export interface DashboardStats {
  total_alunos: number;
  risco_muito_alto: number;
  risco_alto: number;
  risco_medio: number;
  risco_baixo: number;
  media_geral_campus: number;
  intervencoes_ativas: number;
}

export interface RiscoPorCurso {
  curso: string;
  muito_alto: number;
  alto: number;
  medio: number;
  baixo: number;
}

export interface AlunoRisco {
  matricula: string;
  nome: string;
  curso: string;
  risco_evasao: number;
  nivel_risco: 'ALTO' | 'MUITO_ALTO' | 'MEDIO' | 'BAIXO';
}

interface Predicao {
  risco_evasao?: number;
  nivel_risco?: string;
}

interface AlunoDashboard {
  matricula: string;
  nome: string;
  curso?: { nome?: string } | string;
  curso_obj?: { nome?: string } | string;
  curso_nome?: string;
  predicao_atual?: Predicao;
  predicao?: Predicao;
}

const getCursoNome = (aluno: AlunoDashboard): string => {
  const curso = aluno.curso || aluno.curso_obj;
  if (typeof curso === 'string') return curso;
  return curso?.nome || aluno.curso_nome || 'Sem Curso';
};

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [riscoPorCurso, setRiscoPorCurso] = useState<RiscoPorCurso[]>([]);
  const [topAlunosRisco, setTopAlunosRisco] = useState<AlunoRisco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const token = localStorage.getItem('sapee_token');
      
      if (!token) {
        setError('Usuário não autenticado');
        setIsLoading(false);
        return;
      }

      try {
        const statsData = await api.dashboard.stats(token);
        setStats(statsData);
        
        const alunos = await api.alunos.list(token, 0, 1000);
        
        // 3. Agrupar risco por curso
        const cursosMap = new Map<string, RiscoPorCurso>();
        
        alunos.forEach((aluno: AlunoDashboard) => {
          const curso = getCursoNome(aluno);
          
          if (!cursosMap.has(curso)) {
            cursosMap.set(curso, {
              curso,
              muito_alto: 0,
              alto: 0,
              medio: 0,
              baixo: 0,
            });
          }

          // Pegar predição (pode vir em diferentes campos)
          const predicao = aluno.predicao_atual || aluno.predicao;

          if (predicao && predicao.nivel_risco) {
            const nivel = predicao.nivel_risco.toLowerCase();
            if (nivel === 'muito_alto') {
              cursosMap.get(curso)!.muito_alto += 1;
            } else if (nivel === 'alto') {
              cursosMap.get(curso)!.alto += 1;
            } else if (nivel === 'medio') {
              cursosMap.get(curso)!.medio += 1;
            } else if (nivel === 'baixo') {
              cursosMap.get(curso)!.baixo += 1;
            }
          }
        });
        
        const cursosArray = Array.from(cursosMap.values());
        setRiscoPorCurso(cursosArray);
        
        // 4. Top 5 alunos em risco crítico (ALTO + MUITO_ALTO)
        const alunosComRisco = alunos
          .filter((aluno: AlunoDashboard) => {
            const predicao = aluno.predicao_atual || aluno.predicao;
            return predicao?.nivel_risco === 'ALTO' || predicao?.nivel_risco === 'MUITO_ALTO';
          })
          .map((aluno: AlunoDashboard) => {
            return {
              matricula: aluno.matricula,
              nome: aluno.nome,
              curso: getCursoNome(aluno),
              risco_evasao: aluno.predicao_atual?.risco_evasao || aluno.predicao?.risco_evasao || 0,
              nivel_risco: (aluno.predicao_atual?.nivel_risco || 'ALTO') as 'ALTO' | 'MUITO_ALTO',
            };
          })
          .sort((a: AlunoRisco, b: AlunoRisco) => b.risco_evasao - a.risco_evasao)
          .slice(0, 5);
        
        setTopAlunosRisco(alunosComRisco);
        
        setError(null);
      } catch (err) {
        console.error('❌ Erro ao carregar stats:', err);
        setError('Erro ao carregar estatísticas: ' + (err as Error).message);
        
        // Definir dados vazios para não travar em "carregando"
        setStats({
          total_alunos: 0,
          risco_muito_alto: 0,
          risco_alto: 0,
          risco_medio: 0,
          risco_baixo: 0,
          media_geral_campus: 0,
          intervencoes_ativas: 0,
        });
        setRiscoPorCurso([]);
        setTopAlunosRisco([]);
      } finally {
        // Sempre definir isLoading como false, mesmo com erro
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  return { stats, riscoPorCurso, topAlunosRisco, isLoading, error };
}
