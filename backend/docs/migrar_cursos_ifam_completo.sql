-- ============================================
-- MIGRAÇÃO AUTOMÁTICA - CURSOS IFAM
-- SAPEE DEWAS Backend
-- ============================================
-- Remove cursos fictícios e migra alunos
-- para cursos reais do IFAM AUTOMATICAMENTE
-- ============================================

USE sapee_dewas;

-- ============================================
-- PASSO 1: BACKUP DOS DADOS ATUAIS
-- ============================================

SELECT '=== BACKUP: Alunos com cursos atuais ===' AS '';

CREATE TABLE IF NOT EXISTS backup_alunos_cursos AS
SELECT 
    a.matricula,
    a.nome AS aluno_nome,
    a.curso_id AS curso_id_antigo,
    c.nome AS curso_nome_antigo,
    c.modalidade AS curso_modalidade_antiga
FROM alunos a
LEFT JOIN cursos c ON a.curso_id = c.id
WHERE a.curso_id IS NOT NULL;

SELECT '✅ Backup criado: tabela backup_alunos_cursos' AS '';

-- ============================================
-- PASSO 2: MAPEAMENTO AUTOMÁTICO
-- ============================================

SELECT '=== MAPEAMENTO: Cursos Antigos → Novos ===' AS '';

-- Mapeamento inteligente baseado no nome do curso
-- Informática (13) → Técnico em Informática (Integrado) (12)
-- Edificações (14) → Técnico em Edificações (Integrado) (13)
-- Mecânica (15) → Engenharia Mecânica (SUPERIOR) (2)
-- Química (16) → Química (Licenciatura) (6)
-- Eletrotécnica (17) → Engenharia Elétrica (similar) ou Informática
-- Administração (18) → Técnico em Administração (Integrado) (14)
-- Contabilidade (19) → Técnico em Administração (Integrado) (14)

-- ============================================
-- PASSO 3: ATUALIZAR ALUNOS PARA CURSOS NOVOS
-- ============================================

SELECT '=== MIGRANDO ALUNOS ===' AS '';

-- Informática → Técnico em Informática (Integrado)
UPDATE alunos 
SET curso_id = 12 
WHERE curso_id = 13;
SELECT '✅ Informática → Téc. Informática (Integrado)' AS '', 
       ROW_COUNT() AS 'alunos_migrados';

-- Edificações → Técnico em Edificações (Integrado)
UPDATE alunos 
SET curso_id = 13 
WHERE curso_id = 14;
SELECT '✅ Edificações → Téc. Edificações (Integrado)' AS '', 
       ROW_COUNT() AS 'alunos_migrados';

-- Mecânica → Engenharia Mecânica (SUPERIOR)
UPDATE alunos 
SET curso_id = 2 
WHERE curso_id = 15;
SELECT '✅ Mecânica → Engenharia Mecânica' AS '', 
       ROW_COUNT() AS 'alunos_migrados';

-- Química → Química (Licenciatura)
UPDATE alunos 
SET curso_id = 6 
WHERE curso_id = 16;
SELECT '✅ Química → Química (Licenciatura)' AS '', 
       ROW_COUNT() AS 'alunos_migrados';

-- Eletrotécnica → Engenharia Mecânica (próximo)
UPDATE alunos 
SET curso_id = 2 
WHERE curso_id = 17;
SELECT '✅ Eletrotécnica → Engenharia Mecânica' AS '', 
       ROW_COUNT() AS 'alunos_migrados';

-- Administração → Técnico em Administração (Integrado)
UPDATE alunos 
SET curso_id = 14 
WHERE curso_id = 18;
SELECT '✅ Administração → Téc. Administração (Integrado)' AS '', 
       ROW_COUNT() AS 'alunos_migrados';

-- Contabilidade → Técnico em Administração (Integrado)
UPDATE alunos 
SET curso_id = 14 
WHERE curso_id = 19;
SELECT '✅ Contabilidade → Téc. Administração (Integrado)' AS '', 
       ROW_COUNT() AS 'alunos_migrados';

-- ============================================
-- PASSO 4: VERIFICAR MIGRAÇÃO
-- ============================================

SELECT '=== VERIFICAÇÃO: Alunos migrados ===' AS '';

SELECT 
    'Total de alunos:' AS '',
    COUNT(*) AS total
FROM alunos;

SELECT 
    'Alunos com curso:' AS '',
    COUNT(*) AS com_curso
FROM alunos 
WHERE curso_id IS NOT NULL;

SELECT 
    'Alunos SEM curso (atenção!):' AS '',
    COUNT(*) AS sem_curso
FROM alunos 
WHERE curso_id IS NULL;

-- ============================================
-- PASSO 5: LISTAR DISTRIBUIÇÃO FINAL
-- ============================================

SELECT '=== DISTRIBUIÇÃO FINAL: Alunos por Curso ===' AS '';

SELECT 
    c.id AS id,
    c.nome AS curso,
    c.modalidade AS modalidade,
    COUNT(a.matricula) AS alunos
FROM cursos c
LEFT JOIN alunos a ON c.id = a.curso_id
GROUP BY c.id, c.nome, c.modalidade
HAVING COUNT(a.matricula) > 0
ORDER BY alunos DESC;

-- ============================================
-- PASSO 6: REMOVER CURSOS ANTIGOS
-- ============================================

SELECT '=== REMOVENDO CURSOS ANTIGOS ===' AS '';

-- Verificar se todos os alunos foram migrados
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todos alunos migrados! Seguro para remover.'
        ELSE CONCAT('⚠️  ', COUNT(*), ' alunos SEM curso! Não remova cursos ainda!')
    END AS status_migracao
FROM alunos 
WHERE curso_id IS NULL;

-- Contar alunos sem curso
SET @alunos_sem_curso = (SELECT COUNT(*) FROM alunos WHERE curso_id IS NULL);

-- Se tiver 0 alunos sem curso, remove cursos antigos
-- Nota: Em MySQL puro, usamos lógica condicional diferente
DELETE FROM cursos 
WHERE id IN (13, 14, 15, 16, 17, 18, 19)
AND @alunos_sem_curso = 0;

SELECT 
    CASE 
        WHEN @alunos_sem_curso = 0 THEN '✅ Cursos antigos removidos com sucesso!'
        ELSE CONCAT('⚠️  ', @alunos_sem_curso, ' alunos ainda sem curso. Atualize manualmente antes de remover.')
    END AS resultado;

-- ============================================
-- PASSO 7: ADICIONAR CURSOS IFAM FALTANTES
-- ============================================

SELECT '=== ADICIONANDO CURSOS IFAM ===' AS '';

-- SUPERIOR (GRADUAÇÃO)
INSERT IGNORE INTO cursos (id, nome, modalidade) VALUES 
(1, 'Engenharia Civil', 'SUPERIOR'),
(2, 'Engenharia Mecânica', 'SUPERIOR'),
(3, 'Ciências Biológicas (Licenciatura)', 'SUPERIOR'),
(4, 'Física (Licenciatura)', 'SUPERIOR'),
(5, 'Matemática (Licenciatura)', 'SUPERIOR'),
(6, 'Química (Licenciatura)', 'SUPERIOR'),
(7, 'Tecnologia em Alimentos', 'SUPERIOR'),
(8, 'Análise e Desenvolvimento de Sistemas', 'SUPERIOR'),
(9, 'Construção de Edifícios', 'SUPERIOR'),
(10, 'Processos Químicos', 'SUPERIOR'),
(11, 'Produção Publicitária', 'SUPERIOR');

-- TÉCNICO INTEGRADO
INSERT IGNORE INTO cursos (id, nome, modalidade) VALUES 
(12, 'Técnico em Informática (Integrado)', 'INTEGRADO'),
(13, 'Técnico em Edificações (Integrado)', 'INTEGRADO'),
(14, 'Técnico em Administração (Integrado)', 'INTEGRADO'),
(15, 'Técnico em Agropecuária (Integrado)', 'INTEGRADO');

-- TÉCNICO SUBSEQUENTE
INSERT IGNORE INTO cursos (id, nome, modalidade) VALUES 
(16, 'Técnico em Edificações (Subsequente)', 'SUBSEQUENTE'),
(17, 'Técnico em Meio Ambiente (Subsequente)', 'SUBSEQUENTE');

-- PÓS-GRADUAÇÃO
INSERT IGNORE INTO cursos (id, nome, modalidade) VALUES 
(18, 'Especialização em Gestão em Segurança do Trabalho', 'POS_GRADUACAO'),
(19, 'Especialização em Gestão Ambiental', 'POS_GRADUACAO'),
(20, 'Especialização em Investigações Educacionais', 'POS_GRADUACAO'),
(21, 'Mestrado em Educação Profissional e Tecnológica (ProfEPT)', 'POS_GRADUACAO'),
(22, 'Mestrado em Ensino Tecnológico (PPGET)', 'POS_GRADUACAO'),
(23, 'Mestrado em Ensino de Física (MNPEF)', 'POS_GRADUACAO'),
(24, 'Mestrado em Química (PROFQUI)', 'POS_GRADUACAO'),
(25, 'Mestrado em Educação Inclusiva (PROFEI)', 'POS_GRADUACAO');

SELECT '✅ Cursos IFAM adicionados!' AS '';

-- ============================================
-- PASSO 8: RESETAR AUTO_INCREMENT
-- ============================================

ALTER TABLE cursos AUTO_INCREMENT = 26;

-- ============================================
-- PASSO 9: RELATÓRIO FINAL
-- ============================================

SELECT '=== RELATÓRIO FINAL ===' AS '';

SELECT 
    'RESUMO DA MIGRAÇÃO:' AS '',
    CONCAT(
        '✅ Alunos totais: ', (SELECT COUNT(*) FROM alunos),
        ' | ✅ Com curso: ', (SELECT COUNT(*) FROM alunos WHERE curso_id IS NOT NULL),
        ' | ⚠️  Sem curso: ', (SELECT COUNT(*) FROM alunos WHERE curso_id IS NULL),
        ' | ✅ Cursos IFAM: ', (SELECT COUNT(*) FROM cursos)
    ) AS resumo;

SELECT '=== CURSOS IFAM CADASTRADOS ===' AS '';

SELECT 
    modalidade,
    COUNT(*) AS quantidade,
    GROUP_CONCAT(nome ORDER BY nome SEPARATOR ', ') AS cursos
FROM cursos
GROUP BY modalidade
ORDER BY 
    CASE modalidade
        WHEN 'INTEGRADO' THEN 1
        WHEN 'SUBSEQUENTE' THEN 2
        WHEN 'SUPERIOR' THEN 3
        WHEN 'POS_GRADUACAO' THEN 4
    END;

-- ============================================
-- PASSO 10: LIMPAR BACKUP (OPCIONAL)
-- ============================================

-- Se quiser manter o backup, comente a linha abaixo
-- DROP TABLE IF EXISTS backup_alunos_cursos;

SELECT '✅ Migração concluída com sucesso!' AS mensagem;
SELECT '📝 Backup disponível em: backup_alunos_cursos' AS aviso;
SELECT '🎯 Agora você pode cadastrar alunos com cursos IFAM!' AS proximo_passo;
