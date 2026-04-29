-- ============================================
-- DISTRIBUIÇÃO REALISTA: Alunos por Cursos IFAM
-- VERSÃO CORRIGIDA E SIMPLIFICADA
-- SAPEE DEWAS Backend
-- ============================================
-- Distribui os 53 alunos em TODOS os cursos
-- com dados realistas de Manaus/AM
-- ============================================

USE sapee_dewas;

-- ============================================
-- PASSO 1: CRIAR TABELA TEMPORÁRIA COM DISTRIBUIÇÃO
-- ============================================

SELECT '=== PREPARANDO DISTRIBUIÇÃO ===' AS '';

-- Criar tabela temporária com a distribuição desejada
CREATE TEMPORARY TABLE distribuicao_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT,
    quantidade INT
);

-- Inserir distribuição planejada (53 alunos total)
INSERT INTO distribuicao_cursos (curso_id, quantidade) VALUES
-- TÉCNICO INTEGRADO (25 alunos)
(12, 8),  -- Informática
(13, 7),  -- Edificações
(14, 6),  -- Administração
(15, 4),  -- Agropecuária

-- TÉCNICO SUBSEQUENTE (8 alunos)
(16, 4),  -- Edificações Subsequente
(17, 4),  -- Meio Ambiente

-- SUPERIOR (15 alunos)
(1, 3),   -- Engenharia Civil
(2, 3),   -- Engenharia Mecânica
(8, 3),   -- ADS
(6, 3),   -- Química Licenciatura
(5, 3),   -- Matemática Licenciatura

-- PÓS-GRADUAÇÃO (5 alunos)
(21, 3),  -- ProfEPT
(22, 2);  -- PPGET

SELECT '=== DISTRIBUIÇÃO PLANEJADA ===' AS '';

SELECT 
    c.nome AS curso,
    d.quantidade AS alunos_previstos
FROM distribuicao_cursos d
JOIN cursos c ON d.curso_id = c.id
ORDER BY d.quantidade DESC;

-- ============================================
-- PASSO 2: ATRIBUIR CURSOS AOS ALUNOS
-- ============================================

SELECT '=== ATRIBUINDO CURSOS ===' AS '';

-- Usar variável para iterar pelos cursos
SET @row_number = 0;
SET @curso_index = 1;

-- Atualizar alunos com cursos baseado na distribuição
UPDATE alunos a
JOIN (
    SELECT 
        matricula,
        @row_number := @row_number + 1 AS row_num
    FROM alunos
    WHERE curso_id IS NOT NULL
    ORDER BY matricula
) AS numbered_alunos ON a.matricula = numbered_alunos.matricula
JOIN (
    SELECT 
        curso_id,
        quantidade,
        @curso_index := @curso_index + quantidade AS cumulative,
        @curso_index - quantidade AS start_pos,
        @curso_index - 1 AS end_pos
    FROM distribuicao_cursos
    ORDER BY curso_id
) AS curso_dist ON numbered_alunos.row_num BETWEEN curso_dist.start_pos + 1 AND curso_dist.end_pos
SET a.curso_id = curso_dist.curso_id;

SELECT '✅ Cursos atribuídos!' AS '';

-- ============================================
-- PASSO 3: VERIFICAR DISTRIBUIÇÃO
-- ============================================

SELECT '=== VERIFICAÇÃO DA DISTRIBUIÇÃO ===' AS '';

SELECT 
    c.id,
    c.nome AS curso,
    c.modalidade,
    COUNT(a.matricula) AS alunos
FROM cursos c
LEFT JOIN alunos a ON c.id = a.curso_id
WHERE a.matricula IS NOT NULL
GROUP BY c.id, c.nome, c.modalidade
ORDER BY alunos DESC;

-- ============================================
-- PASSO 4: ATUALIZAR DADOS REALISTAS
-- ============================================

SELECT '=== ATUALIZANDO DADOS REALISTAS ===' AS '';

-- Atualizar endereços de Manaus
UPDATE alunos SET 
    cidade = 'Manaus',
    cep = CONCAT('690', FLOOR(RAND() * 999), '-', FLOOR(RAND() * 999)),
    logradouro = CASE FLOOR(RAND() * 10)
        WHEN 0 THEN 'Avenida Constantino Nery'
        WHEN 1 THEN 'Rua Paraíba'
        WHEN 2 THEN 'Avenida Torquato Tapajós'
        WHEN 3 THEN 'Rua São José'
        WHEN 4 THEN 'Avenida Brasil'
        WHEN 5 THEN 'Rua Djalma Batista'
        WHEN 6 THEN 'Avenida André Araújo'
        WHEN 7 THEN 'Rua Henrique Martins'
        WHEN 8 THEN 'Avenida Mário Ypiranga'
        WHEN 9 THEN 'Rua Epaminondas Pinto'
    END,
    numero = CAST(FLOOR(RAND() * 999) + 1 AS CHAR),
    complemento = CASE WHEN RAND() > 0.5 THEN CONCAT('Apto ', FLOOR(RAND() * 99) + 1) ELSE '' END,
    bairro = CASE FLOOR(RAND() * 8)
        WHEN 0 THEN 'Centro'
        WHEN 1 THEN 'Adrianópolis'
        WHEN 2 THEN 'Nossa Senhora das Graças'
        WHEN 3 THEN 'Flores'
        WHEN 4 THEN 'São Geraldo'
        WHEN 5 THEN 'Petrópolis'
        WHEN 6 THEN 'Chapada'
        WHEN 7 THEN 'Educandos'
    END,
    zona_residencial = CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'ZONA_NORTE'
        WHEN 1 THEN 'ZONA_SUL'
        WHEN 2 THEN 'ZONA_LESTE'
        WHEN 3 THEN 'ZONA_OESTE'
    END
WHERE curso_id IS NOT NULL;

-- Atualizar dados socioeconômicos realistas
UPDATE alunos SET 
    renda_familiar = ROUND(RAND() * 6000 + 800, 2),
    renda_per_capita = ROUND((renda_familiar / (FLOOR(RAND() * 4) + 2)), 2),
    possui_auxilio = RAND() > 0.6,
    trabalha = RAND() > 0.7,
    carga_horaria_trabalho = CASE WHEN trabalha THEN FLOOR(RAND() * 40) + 10 ELSE 0 END,
    tempo_deslocamento = FLOOR(RAND() * 90) + 20,
    custo_transporte_diario = ROUND(RAND() * 15 + 3, 2),
    dificuldade_acesso = CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'FACIL'
        WHEN 1 THEN 'MEDIA'
        WHEN 2 THEN 'DIFICIL'
        WHEN 3 THEN 'MUITO_DIFICIL'
    END,
    transporte_utilizado = CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'ONIBUS'
        WHEN 1 THEN 'CARRO'
        WHEN 2 THEN 'MOTO'
        WHEN 3 THEN 'A_PE'
    END,
    possui_computador = RAND() > 0.3,
    possui_internet = RAND() > 0.2,
    beneficiario_bolsa_familia = RAND() > 0.8,
    primeiro_geracao_universidade = RAND() > 0.5
WHERE curso_id IS NOT NULL;

-- Atualizar dados acadêmicos realistas
UPDATE alunos SET 
    media_geral = ROUND(RAND() * 5 + 4, 1),
    frequencia = ROUND(RAND() * 30 + 65, 1),
    historico_reprovas = FLOOR(RAND() * 4),
    coeficiente_rendimento = ROUND(media_geral * (0.95 + RAND() * 0.1), 2),
    periodo = CASE 
        WHEN curso_id IN (12, 13, 14, 15) THEN FLOOR(RAND() * 4) + 1
        WHEN curso_id IN (16, 17) THEN FLOOR(RAND() * 2) + 1
        WHEN curso_id IN (1, 2, 5, 6, 8) THEN FLOOR(RAND() * 10) + 1
        WHEN curso_id IN (21, 22) THEN FLOOR(RAND() * 4) + 1
    END,
    turno = CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'MATUTINO'
        WHEN 1 THEN 'VESPERTINO'
        WHEN 2 THEN 'NOTURNO'
    END
WHERE curso_id IS NOT NULL;

SELECT '✅ Dados realistas atualizados!' AS '';

-- ============================================
-- PASSO 5: RELATÓRIO FINAL
-- ============================================

SELECT '=== RELATÓRIO FINAL ===' AS '';

SELECT 
    'Total de alunos:' AS '',
    COUNT(*) AS total
FROM alunos
WHERE curso_id IS NOT NULL;

SELECT '=== DISTRIBUIÇÃO POR CURSO ===' AS '';

SELECT 
    c.id,
    c.nome AS curso,
    c.modalidade,
    COUNT(a.matricula) AS alunos,
    ROUND(AVG(a.media_geral), 2) AS media_geral,
    ROUND(AVG(a.frequencia), 2) AS frequencia
FROM cursos c
LEFT JOIN alunos a ON c.id = a.curso_id
WHERE a.matricula IS NOT NULL
GROUP BY c.id, c.nome, c.modalidade
ORDER BY alunos DESC;

SELECT '=== DISTRIBUIÇÃO POR MODALIDADE ===' AS '';

SELECT 
    c.modalidade,
    COUNT(*) AS alunos,
    ROUND(COUNT(*) * 100.0 / 53, 1) AS percentual
FROM alunos a
JOIN cursos c ON a.curso_id = c.id
GROUP BY c.modalidade
ORDER BY 
    CASE c.modalidade
        WHEN 'INTEGRADO' THEN 1
        WHEN 'SUBSEQUENTE' THEN 2
        WHEN 'SUPERIOR' THEN 3
        WHEN 'POS_GRADUACAO' THEN 4
    END;

-- ============================================
-- LIMPAR TABELA TEMPORÁRIA
-- ============================================

DROP TEMPORARY TABLE IF EXISTS distribuicao_cursos;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ DISTRIBUIÇÃO CONCLUÍDA!' AS '';
SELECT CONCAT('53 alunos distribuídos em ', (SELECT COUNT(DISTINCT curso_id) FROM alunos WHERE curso_id IS NOT NULL), ' cursos!') AS resumo;
SELECT '📊 Dashboard agora mostrará Risco por Curso variado!' AS aviso;
SELECT '🔄 Recarregue o Dashboard (F5)' AS proximo_passo;
