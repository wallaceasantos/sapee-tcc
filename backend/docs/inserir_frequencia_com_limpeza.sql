-- ============================================
-- DADOS DE EXEMPLO - FREQUÊNCIA MENSAL
-- SAPEE DEWAS Backend
-- ============================================
-- Script COM LIMPEZA prévia para evitar erros
-- ============================================

USE sapee_dewas;

-- ============================================
-- LIMPAR DADOS EXISTENTES
-- ============================================

-- Deletar dados dos alunos que vamos inserir
DELETE FROM frequencia_mensal 
WHERE aluno_id IN (
    '2024101001', '2024101002', '2024101003', '2024101004',
    '2024101005', '2024101007', '2024101008', '2024101024',
    '2024101025', '2026101005'
);

-- Confirmar limpeza
SELECT 'Dados existentes limpos!' AS mensagem;
SELECT COUNT(*) AS registros_restantes FROM frequencia_mensal;

-- ============================================
-- INSERIR NOVOS DADOS
-- ============================================

-- ALUNO 1: Renata Carvalho Gomes (2024101001) - QUEDA
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101001', 8, 2025, 88.0, 0, 2, 20, 'Boa frequência inicial'),
('2024101001', 9, 2025, 82.5, 1, 3, 20, 'Começou a faltar mais'),
('2024101001', 10, 2025, 76.0, 2, 4, 20, 'Queda contínua - atenção'),
('2024101001', 11, 2025, 71.5, 2, 5, 20, 'Queda acentuada'),
('2024101001', 12, 2025, 68.0, 3, 6, 20, 'Situação preocupante'),
('2024101001', 1, 2026, 65.5, 3, 7, 20, 'Necessária intervenção');

-- ALUNO 2: Priscila Gomes Costa (2024101002) - CRÍTICA
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101002', 8, 2025, 72.0, 2, 4, 20, 'Frequência já baixa'),
('2024101002', 9, 2025, 65.5, 3, 6, 20, 'Piorando'),
('2024101002', 10, 2025, 58.0, 4, 8, 20, 'Queda brusca - ALERTA'),
('2024101002', 11, 2025, 52.5, 5, 10, 20, 'Risco crítico de evasão'),
('2024101002', 12, 2025, 48.0, 6, 12, 20, 'Intervenção urgente necessária'),
('2024101002', 1, 2026, 45.5, 7, 13, 20, 'Caso prioritário');

-- ALUNO 3: Gabriela Barbosa Souza (2024101003) - ESTÁVEL
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101003', 8, 2025, 85.0, 1, 2, 20, 'Frequência boa'),
('2024101003', 9, 2025, 84.5, 1, 2, 20, 'Estável'),
('2024101003', 10, 2025, 83.0, 2, 2, 20, 'Estável'),
('2024101003', 11, 2025, 84.5, 1, 2, 20, 'Estável'),
('2024101003', 12, 2025, 83.5, 2, 2, 20, 'Estável'),
('2024101003', 1, 2026, 82.0, 2, 3, 20, 'Leve queda mas estável');

-- ALUNO 4: Daniel Gomes Soares (2024101004) - SUBINDO
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101004', 8, 2025, 75.0, 2, 4, 20, 'Frequência regular'),
('2024101004', 9, 2025, 79.5, 1, 3, 20, 'Melhoria'),
('2024101004', 10, 2025, 84.0, 1, 2, 20, 'Boa evolução'),
('2024101004', 11, 2025, 87.5, 0, 2, 20, 'Excelente melhoria'),
('2024101004', 12, 2025, 91.0, 0, 1, 20, 'Ótimo desempenho'),
('2024101004', 1, 2026, 93.5, 0, 1, 20, 'Parabéns pela evolução');

-- ALUNO 5: Beatriz Ferreira Pereira (2024101005) - EXCELENTE
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101005', 8, 2025, 98.0, 0, 0, 20, 'Frequência excelente'),
('2024101005', 9, 2025, 99.5, 0, 0, 20, 'Perfeita'),
('2024101005', 10, 2025, 98.5, 0, 0, 20, 'Excelente'),
('2024101005', 11, 2025, 99.0, 0, 0, 20, 'Perfeita'),
('2024101005', 12, 2025, 100.0, 0, 0, 20, '100% de frequência!'),
('2024101005', 1, 2026, 99.2, 0, 0, 20, 'Modelo de aluna');

-- ALUNO 6: Alexandre Oliveira Santos (2024101007) - QUEDA BRUSCA
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101007', 8, 2025, 90.0, 0, 2, 20, 'Ótima frequência'),
('2024101007', 9, 2025, 85.5, 1, 2, 20, 'Leve queda'),
('2024101007', 10, 2025, 78.0, 2, 4, 20, 'Queda acentuada - ALERTA'),
('2024101007', 11, 2025, 68.5, 3, 6, 20, 'Queda brusca - intervenção'),
('2024101007', 12, 2025, 62.0, 4, 8, 20, 'Situação grave'),
('2024101007', 1, 2026, 58.5, 5, 9, 20, 'Risco alto de evasão');

-- ALUNO 7: Carlos Ribeiro Lima (2024101008) - EXCELENTE
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101008', 8, 2025, 96.0, 0, 1, 20, 'Excelente'),
('2024101008', 9, 2025, 97.5, 0, 0, 20, 'Perfeita'),
('2024101008', 10, 2025, 98.0, 0, 0, 20, 'Perfeita'),
('2024101008', 11, 2025, 97.5, 0, 1, 20, 'Excelente'),
('2024101008', 12, 2025, 98.5, 0, 0, 20, 'Perfeita'),
('2024101008', 1, 2026, 97.9, 0, 0, 20, 'Excelente frequência');

-- ALUNO 8: Tatiane Ribeiro Silva (2024101024) - PERFEITA
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101024', 8, 2025, 100.0, 0, 0, 20, '100% - Perfeito!'),
('2024101024', 9, 2025, 100.0, 0, 0, 20, '100% - Perfeito!'),
('2024101024', 10, 2025, 100.0, 0, 0, 20, '100% - Perfeito!'),
('2024101024', 11, 2025, 99.5, 0, 0, 20, 'Quase perfeita'),
('2024101024', 12, 2025, 100.0, 0, 0, 20, '100% - Perfeito!'),
('2024101024', 1, 2026, 99.9, 0, 0, 20, 'Excelência');

-- ALUNO 9: Matheus Pereira Lopes (2024101025) - BAIXA
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2024101025', 8, 2025, 62.0, 3, 5, 20, 'Frequência baixa'),
('2024101025', 9, 2025, 60.5, 3, 6, 20, 'Continua baixa'),
('2024101025', 10, 2025, 59.0, 4, 6, 20, 'Estável mas baixa'),
('2024101025', 11, 2025, 57.5, 4, 7, 20, 'Precisa melhorar'),
('2024101025', 12, 2025, 58.5, 4, 6, 20, 'Estável'),
('2024101025', 1, 2026, 58.0, 4, 7, 20, 'Necessita apoio');

-- ALUNO 10: Lucas Henrique Souza Lima (2026101005) - BOA
INSERT INTO frequencia_mensal 
(aluno_id, mes, ano, frequencia, faltas_justificadas, faltas_nao_justificadas, total_aulas_mes, observacoes)
VALUES
('2026101005', 8, 2025, 93.0, 0, 1, 20, 'Boa frequência'),
('2026101005', 9, 2025, 92.5, 1, 1, 20, 'Estável'),
('2026101005', 10, 2025, 91.0, 1, 1, 20, 'Estável'),
('2026101005', 11, 2025, 92.5, 0, 1, 20, 'Boa'),
('2026101005', 12, 2025, 93.0, 0, 1, 20, 'Boa'),
('2026101005', 1, 2026, 92.0, 1, 1, 20, 'Estável');

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar dados inseridos
SELECT 
    f.aluno_id,
    a.nome AS aluno_nome,
    a.frequencia AS frequencia_atual,
    COUNT(f.id) AS meses_registrados,
    MIN(f.frequencia) AS menor_freq,
    MAX(f.frequencia) AS maior_freq,
    AVG(f.frequencia) AS media_freq
FROM frequencia_mensal f
JOIN alunos a ON f.aluno_id = a.matricula
WHERE f.aluno_id IN (
    '2024101001', '2024101002', '2024101003', '2024101004',
    '2024101005', '2024101007', '2024101008', '2024101024',
    '2024101025', '2026101005'
)
GROUP BY f.aluno_id, a.nome, a.frequencia
ORDER BY f.aluno_id;

-- ============================================
-- MENSAGENS FINAIS
-- ============================================

SELECT '========================================' AS '';
SELECT '✅ DADOS INSERIDOS COM SUCESSO!' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';
SELECT 'Total de alunos com histórico:' AS '';
SELECT COUNT(DISTINCT aluno_id) AS total_alunos FROM frequencia_mensal;
SELECT '' AS '';
SELECT 'Total de registros mensais:' AS '';
SELECT COUNT(*) AS total_registros FROM frequencia_mensal;
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'ALUNOS PARA TESTE:' AS '';
SELECT '========================================' AS '';
SELECT 'Queda Brusca: 2024101007 - Alexandre Oliveira Santos' AS '';
SELECT 'Melhoria: 2024101004 - Daniel Gomes Soares' AS '';
SELECT 'Estável: 2024101003 - Gabriela Barbosa Souza' AS '';
SELECT 'Crítico: 2024101002 - Priscila Gomes Costa' AS '';
SELECT 'Excelente: 2024101005 - Beatriz Ferreira Pereira' AS '';
SELECT '========================================' AS '';
