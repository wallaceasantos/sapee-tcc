-- ============================================================
-- CORRIGIR SCORE NAS INTERVENÇÕES EXISTENTES (MySQL)
-- Executar no MySQL Workbench
-- ============================================================

-- 1. Atualiza intervenções que têm predição associada
UPDATE intervencoes i
INNER JOIN alunos a ON i.aluno_id = a.matricula
INNER JOIN (
    SELECT p1.aluno_id, p1.nivel_risco, p1.risco_evasao, p1.data_predicao
    FROM predicoes p1
    INNER JOIN (
        SELECT aluno_id, MAX(data_predicao) as max_data
        FROM predicoes
        GROUP BY aluno_id
    ) p2 ON p1.aluno_id = p2.aluno_id AND p1.data_predicao = p2.max_data
) p ON a.matricula = p.aluno_id
SET i.motivo_risco = JSON_OBJECT(
    'nivel', p.nivel_risco,
    'score', ROUND(p.risco_evasao),
    'fatores', CONCAT(
        CASE 
            WHEN a.frequencia < 75 THEN CONCAT('Freq ', ROUND(a.frequencia), '%')
            WHEN a.media_geral < 6 THEN CONCAT('Media ', ROUND(a.media_geral, 1))
            WHEN COALESCE(a.historico_reprovas, 0) > 1 THEN CONCAT(COALESCE(a.historico_reprovas, 0), ' repr')
            WHEN a.trabalha = 1 THEN 'Trabalha'
            ELSE 'Score alto'
        END
    )
)
WHERE i.motivo_risco IS NULL;

-- 2. Para alunos sem predição, cria score estimado baseado em dados básicos
UPDATE intervencoes i
INNER JOIN alunos a ON i.aluno_id = a.matricula
SET i.motivo_risco = JSON_OBJECT(
    'nivel', 
        CASE 
            WHEN (
                CASE WHEN a.frequencia < 75 THEN 30 ELSE 0 END +
                CASE WHEN a.media_geral < 6 THEN 40 ELSE 0 END +
                CASE WHEN COALESCE(a.historico_reprovas, 0) > 0 THEN 20 ELSE 0 END
            ) >= 70 THEN 'ALTO'
            WHEN (
                CASE WHEN a.frequencia < 75 THEN 30 ELSE 0 END +
                CASE WHEN a.media_geral < 6 THEN 40 ELSE 0 END +
                CASE WHEN COALESCE(a.historico_reprovas, 0) > 0 THEN 20 ELSE 0 END
            ) >= 40 THEN 'MEDIO'
            ELSE 'BAIXO'
        END,
    'score',
        (CASE WHEN a.frequencia < 75 THEN 30 ELSE 0 END +
         CASE WHEN a.media_geral < 6 THEN 40 ELSE 0 END +
         CASE WHEN COALESCE(a.historico_reprovas, 0) > 0 THEN 20 ELSE 0 END),
    'fatores',
        CASE 
            WHEN a.frequencia < 75 THEN CONCAT('Freq ', ROUND(a.frequencia), '%')
            WHEN a.media_geral < 6 THEN CONCAT('Media ', ROUND(a.media_geral, 1))
            WHEN COALESCE(a.historico_reprovas, 0) > 1 THEN CONCAT(COALESCE(a.historico_reprovas, 0), ' repr')
            WHEN a.trabalha = 1 THEN 'Trabalha'
            ELSE 'Score alto'
        END
)
WHERE i.motivo_risco IS NULL;

-- 3. Verificar resultado
SELECT 
    COUNT(*) as total_intervencoes,
    COUNT(motivo_risco) as com_motivo_risco,
    COUNT(*) - COUNT(motivo_risco) as sem_motivo_risco,
    CONCAT(ROUND(COUNT(motivo_risco) * 100.0 / COUNT(*), 2), '%') as taxa_preenchimento
FROM intervencoes;
