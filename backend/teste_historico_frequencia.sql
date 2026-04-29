-- ============================================
-- SCRIPT DE TESTE - HISTÓRICO DE FREQUÊNCIA
-- SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
-- ============================================
-- Este script adiciona histórico de frequência para alunos de teste
-- para permitir visualização completa do histórico no sistema.
-- 
-- Execução: mysql -u root -p sapee_dewas < teste_historico_frequencia.sql
-- ============================================

-- Maria Silva (2025102001) - 6 meses de histórico
INSERT INTO frequencia_mensal (
    aluno_id, mes, ano, frequencia, 
    faltas_justificadas, faltas_nao_justificadas, 
    total_aulas_mes, data_registro
) VALUES
    ('2025102001', 2, 2026, 90.0, 0, 2, 20, NOW()),
    ('2025102001', 1, 2026, 88.0, 1, 2, 20, NOW()),
    ('2025102001', 12, 2025, 85.0, 0, 3, 18, NOW()),
    ('2025102001', 11, 2025, 82.0, 1, 3, 20, NOW()),
    ('2025102001', 10, 2025, 80.0, 0, 4, 20, NOW())
ON DUPLICATE KEY UPDATE
    frequencia = VALUES(frequencia),
    faltas_justificadas = VALUES(faltas_justificadas),
    faltas_nao_justificadas = VALUES(faltas_nao_justificadas),
    total_aulas_mes = VALUES(total_aulas_mes);

-- Antônio Souza Oliveira (2025102007) - 3 meses de histórico
INSERT INTO frequencia_mensal (
    aluno_id, mes, ano, frequencia, 
    faltas_justificadas, faltas_nao_justificadas, 
    total_aulas_mes, data_registro
) VALUES
    ('2025102007', 3, 2026, 72.0, 1, 5, 20, NOW()),
    ('2025102007', 2, 2026, 70.0, 0, 6, 20, NOW()),
    ('2025102007', 1, 2026, 68.0, 1, 6, 20, NOW())
ON DUPLICATE KEY UPDATE
    frequencia = VALUES(frequencia),
    faltas_justificadas = VALUES(faltas_justificadas),
    faltas_nao_justificadas = VALUES(faltas_nao_justificadas),
    total_aulas_mes = VALUES(total_aulas_mes);

-- Francisco Alves da Silva (2025102015) - 4 meses de histórico
INSERT INTO frequencia_mensal (
    aluno_id, mes, ano, frequencia, 
    faltas_justificadas, faltas_nao_justificadas, 
    total_aulas_mes, data_registro
) VALUES
    ('2025102015', 3, 2026, 58.0, 0, 8, 20, NOW()),
    ('2025102015', 2, 2026, 55.0, 1, 8, 20, NOW()),
    ('2025102015', 1, 2026, 52.0, 0, 9, 20, NOW()),
    ('2025102015', 12, 2025, 50.0, 0, 10, 18, NOW())
ON DUPLICATE KEY UPDATE
    frequencia = VALUES(frequencia),
    faltas_justificadas = VALUES(faltas_justificadas),
    faltas_nao_justificadas = VALUES(faltas_nao_justificadas),
    total_aulas_mes = VALUES(total_aulas_mes);

-- Verificar dados inseridos
SELECT 
    a.nome AS aluno,
    f.mes,
    f.ano,
    f.frequencia,
    (f.faltas_justificadas + f.faltas_nao_justificadas) AS total_faltas
FROM frequencia_mensal f
JOIN alunos a ON f.aluno_id = a.matricula
WHERE a.matricula IN ('2025102001', '2025102007', '2025102015')
ORDER BY a.nome, f.ano DESC, f.mes DESC;

-- Mensagem de confirmação
SELECT '✅ Histórico de frequência inserido com sucesso!' AS status;
