-- ============================================================
-- SCRIPT DE DADOS PARA TESTE: Validação do Modelo de Predição
-- SAPEE DEWAS - Usando PREDICOES REAIS do banco
-- ============================================================
-- VALIDADO contra a estrutura atual da tabela 'egressos'
-- Execute: mysql -u seu_usuario -p sapee_db < seed_validacao_modelo.sql
-- ============================================================

-- =============================================
-- Cenário 1: Verdadeiros Positivos (VP)
-- Modelo alertou ALTO/MUITO_ALTO e aluno ABANDONOU
-- =============================================

-- Aluno 2024101001 - Predição REAL: ALTO (61%, id=488) → ABANDONOU = VP
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2024101001', NOW() - INTERVAL 1 MONTH, 'ABANDONO', 
 'Desistiu do curso por dificuldades financeiras e pessoais', 'FINANCEIRO', 
 'DESEMPREGADO', 0, 1, 
 'Aluno trabalhava e não conseguiu conciliar estudos', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'VERDADEIRO_POSITIVO', 1
FROM predicoes p
WHERE p.id = 488
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- Aluno 2025102015 - Predição REAL: MUITO_ALTO (100%, id=548) → ABANDONOU = VP
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2025102015', NOW() - INTERVAL 1 MONTH, 'ABANDONO', 
 'Frequência crítica e problemas financeiros graves', 'FINANCEIRO',
 'DESEMPREGADO', 0, 1,
 'Precisou trabalhar integralmente para sustentar a família', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'VERDADEIRO_POSITIVO', 1
FROM predicoes p
WHERE p.id = 548
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- Aluno 2025102017 - Predição REAL: MUITO_ALTO (100%, id=484) → ABANDONOU = VP
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2025102017', NOW() - INTERVAL 1 MONTH, 'ABANDONO',
 'Dificuldade acadêmica extrema e financeira', 'DIFICULDADE_ACADEMICA',
 'EMPREGADO', 0, 1,
 'Não conseguia acompanhar o conteúdo das aulas', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'VERDADEIRO_POSITIVO', 1
FROM predicoes p
WHERE p.id = 484
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- =============================================
-- Cenário 2: Falsos Negativos (FN)
-- Modelo alertou BAIXO/MEDIO mas aluno ABANDONOU
-- =============================================

-- Aluno 2024101002 - Predição REAL: MEDIO (54%, id=490) → ABANDONOU = FN
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2024101002', NOW() - INTERVAL 1 MONTH, 'ABANDONO',
 'Problemas familiares agravaram subitamente', 'FAMILIA',
 'OUTROS', 0, 0,
 'Situação familiar crítica não detectada pelo modelo', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'FALSO_NEGATIVO', 0
FROM predicoes p
WHERE p.id = 490
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- Aluno 2024101003 - Predição REAL: MEDIO (35%, id=491) → ABANDONOU = FN
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2024101003', NOW() - INTERVAL 1 MONTH, 'ABANDONO',
 'Perda de interesse súbita e mudança de curso', 'FALTA_INTERESSE',
 'ESTUDANDO', 1, 0,
 'Transferiu para outro curso em outra instituição', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'FALSO_NEGATIVO', 0
FROM predicoes p
WHERE p.id = 491
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- Aluno 2024101023 - Predição REAL: MEDIO (49%, id=514) → ABANDONOU = FN
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2024101023', NOW() - INTERVAL 1 MONTH, 'ABANDONO',
 'Múltiplos fatores socioeconômicos não detectados', 'FINANCEIRO',
 'EMPREGADO', 0, 1,
 'Acumulou dificuldades financeiras e de transporte', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'FALSO_NEGATIVO', 0
FROM predicoes p
WHERE p.id = 514
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- Aluno 2024101038 - Predição REAL: MEDIO (45%, id=529) → ABANDONOU = FN
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2024101038', NOW() - INTERVAL 1 MONTH, 'ABANDONO',
 'Motivos pessoais não mapeados pelo modelo', 'OUTROS',
 'EMPREGADO', 0, 1,
 'Fatores externos não capturados pelo sistema', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'FALSO_NEGATIVO', 0
FROM predicoes p
WHERE p.id = 529
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- Aluno 2025102019 - Predição REAL: MUITO_ALTO (100%, id=486) → ABANDONOU = VP
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2025102019', NOW() - INTERVAL 1 MONTH, 'ABANDONO',
 'Dificuldade financeira agravada e transporte', 'FINANCEIRO',
 'DESEMPREGADO', 0, 1,
 'Perdeu emprego e não conseguiu pagar transporte', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'VERDADEIRO_POSITIVO', 1
FROM predicoes p
WHERE p.id = 486
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- =============================================
-- Cenário 3: Falsos Positivos (FP)
-- Modelo alertou ALTO/MUITO_ALTO mas aluno NAO abandonou (transferiu)
-- =============================================

-- Aluno 2026102018 - Predição REAL: MUITO_ALTO (100%, id=485) → TRANSFERIU
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2026102018', NOW() - INTERVAL 1 MONTH, 'TRANSFERENCIA',
 'Transferiu para outra instituição por mudança de cidade', NULL,
 'ESTUDANDO', 1, 0,
 'Família mudou de cidade, aluno continua estudando', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'TRANSFERENCIA', 'FALSO_POSITIVO', 0
FROM predicoes p
WHERE p.id = 485
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- =============================================
-- Cenário 4: Verdadeiros Negativos (VN)
-- Modelo alertou MEDIO e aluno CONCLUIU o curso
-- =============================================

-- Aluno 2024101015 - Predição REAL: MEDIO (54%, id=504) → CONCLUIU
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2024101015', NOW() - INTERVAL 1 MONTH, 'CONCLUSAO',
 'Concluiu o curso com sucesso', NULL,
 'EMPREGADO', 0, 1,
 'Se formou e está trabalhando na área', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'CONCLUSAO', 'VERDADEIRO_NEGATIVO', 1
FROM predicoes p
WHERE p.id = 504
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- =============================================
-- Cenário 5: VP Parcial (MEDIO que evadiu)
-- =============================================

-- Aluno 2024101048 - Predição REAL: MEDIO (43%, id=539) → ABANDONOU
INSERT INTO egressos (
    aluno_matricula, data_saida, motivo_saida, motivo_detalhes,
    motivo_abandono_principal, situacao_atual, esta_estudando,
    esta_trabalhando, observacoes, data_cadastro
) VALUES
('2024101048', NOW() - INTERVAL 1 MONTH, 'ABANDONO',
 'Nota em queda e frequência oscilante levaram ao abandono', 'DIFICULDADE_ACADEMICA',
 'DESEMPREGADO', 0, 0,
 'Oscilou entre presença e ausência ao longo do semestre', NOW() - INTERVAL 1 MONTH);

INSERT INTO predicao_historico (
    aluno_matricula, predicao_id, nivel_risco, risco_evasao,
    fatores_principais, modelo_ml_versao, data_predicao,
    data_evasao, motivo_saida, tipo_erro, predicao_correta
)
SELECT 
    p.aluno_id, p.id, p.nivel_risco, p.risco_evasao,
    p.fatores_principais, p.modelo_ml_versao, p.data_predicao,
    NOW() - INTERVAL 1 MONTH, 'ABANDONO', 'VERDADEIRO_POSITIVO_PARCIAL', 1
FROM predicoes p
WHERE p.id = 539
AND NOT EXISTS (SELECT 1 FROM predicao_historico ph WHERE ph.predicao_id = p.id);

-- ============================================================
-- VERIFICAÇÃO: Conferir dados inseridos
-- ============================================================
-- SELECT tipo_erro, COUNT(*) as quantidade FROM predicao_historico GROUP BY tipo_erro;
-- SELECT motivo_saida, COUNT(*) as total FROM egressos GROUP BY motivo_saida;

-- RESUMO FINAL (11 egressos, 11 predicoes historicas):
-- VP: 4 | FN: 4 | FP: 1 | VN: 1 | VP Parcial: 1
-- Acurácia esperada: ~55% | F1-Score: ~0.42
-- ============================================================