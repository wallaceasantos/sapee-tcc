-- Preencher campo motivo_risco para intervenções existentes que não possuem
-- Este script deve ser executado no banco PostgreSQL para migrar dados existentes

-- Atualiza intervenções que não têm motivo_risco mas têm predicao associada
UPDATE intervencoes i
SET motivo_risco = format(
    '{"nivel":"%s","score":%s,"fatores":"%s"}',
    p.nivel_risco,
    ROUND(p.risco_evasao),
    CASE 
        WHEN a.frequencia < 75 THEN format('Freq %s%%', a.frequencia)
        WHEN a.media_geral < 6 THEN format('Media %s', a.media_geral)
        ELSE 'Score alto'
    END
)
FROM alunos a
INNER JOIN predicoes p ON a.matricula = p.aluno_id
WHERE i.aluno_id = a.matricula
  AND i.motivo_risco IS NULL
  AND p.id = (
      SELECT p2.id 
      FROM predicoes p2 
      WHERE p2.aluno_id = a.matricula 
      ORDER BY p2.data_predicao DESC 
      LIMIT 1
  );

-- Para alunos sem predicao, cria um score estimado baseado em dados basicos
UPDATE intervencoes i
SET motivo_risco = format(
    '{"nivel":"%s","score":%s,"fatores":"%s"}',
    CASE 
        WHEN (CASE WHEN a.frequencia < 75 THEN 30 ELSE 0 END + 
              CASE WHEN a.media_geral < 6 THEN 40 ELSE 0 END + 
              CASE WHEN a.historico_reprovas > 0 THEN 20 ELSE 0 END) >= 70 THEN 'ALTO'
        WHEN (CASE WHEN a.frequencia < 75 THEN 30 ELSE 0 END + 
              CASE WHEN a.media_geral < 6 THEN 40 ELSE 0 END + 
              CASE WHEN a.historico_reprovas > 0 THEN 20 ELSE 0 END) >= 40 THEN 'MEDIO'
        ELSE 'BAIXO'
    END,
    (CASE WHEN a.frequencia < 75 THEN 30 ELSE 0 END + 
     CASE WHEN a.media_geral < 6 THEN 40 ELSE 0 END + 
     CASE WHEN a.historico_reprovas > 0 THEN 20 ELSE 0 END),
    CASE 
        WHEN a.frequencia < 75 THEN format('Freq %s%%', a.frequencia)
        WHEN a.media_geral < 6 THEN format('Media %s', a.media_geral)
        ELSE 'Score alto'
    END
)
FROM alunos a
WHERE i.aluno_id = a.matricula
  AND i.motivo_risco IS NULL;

-- Verificar quantas intervenções foram atualizadas
SELECT 
    COUNT(*) as total_intervencoes,
    COUNT(motivo_risco) as com_motivo_risco,
    COUNT(*) - COUNT(motivo_risco) as sem_motivo_risco
FROM intervencoes;
