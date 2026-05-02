-- ============================================================
-- DADOS DE TESTE - Consolidação Frequência/Faltas
-- MySQL - Executar no MySQL Workbench
-- ============================================================
-- Usuário: Administrador DEWAS (ID: 2)
-- Faltas simuladas de Março/2026 para testar consolidação
-- ============================================================

-- ============================================================
-- ALUNO 1: Antônio Souza Oliveira (2025102007)
-- Curso: Técnico em Informática (Integrado) | Risco: MÉDIO
-- 6 faltas em Março/2026 → Frequência esperada: 70%
-- ============================================================
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada, motivo_justificativa, criado_por) VALUES
('2025102007', 'Matemática', '2026-03-03', 0, NULL, 2),
('2025102007', 'Português', '2026-03-05', 0, NULL, 2),
('2025102007', 'Física', '2026-03-07', 0, NULL, 2),
('2025102007', 'Química', '2026-03-10', 0, NULL, 2),
('2025102007', 'Biologia', '2026-03-12', 0, NULL, 2),
('2025102007', 'História', '2026-03-14', 0, NULL, 2);

-- ============================================================
-- ALUNO 2: Josefa Barbosa Nunes (2024102010)
-- Curso: Técnico em Informática (Integrado) | Risco: MÉDIO
-- 7 faltas (2 justificadas) em Março/2026 → Frequência: 65%
-- ============================================================
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada, motivo_justificativa, criado_por) VALUES
('2024102010', 'Matemática', '2026-03-03', 0, NULL, 2),
('2024102010', 'Português', '2026-03-05', 0, NULL, 2),
('2024102010', 'Física', '2026-03-07', 1, 'Atestado médico', 2),
('2024102010', 'Química', '2026-03-10', 0, NULL, 2),
('2024102010', 'Biologia', '2026-03-12', 0, NULL, 2),
('2024102010', 'História', '2026-03-14', 0, NULL, 2),
('2024102010', 'Geografia', '2026-03-17', 1, 'Atestado médico', 2);

-- ============================================================
-- ALUNO 3: Francisco Alves da Silva (2025102015)
-- Curso: Técnico em Informática (Integrado) | Risco: ALTO
-- 9 faltas consecutivas em Março/2026 → Frequência: 55%
-- ⚠️ Deve gerar alerta de 5+ faltas consecutivas
-- ============================================================
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada, motivo_justificativa, criado_por) VALUES
('2025102015', 'Matemática', '2026-03-02', 0, NULL, 2),
('2025102015', 'Português', '2026-03-03', 0, NULL, 2),
('2025102015', 'Física', '2026-03-04', 0, NULL, 2),
('2025102015', 'Química', '2026-03-05', 0, NULL, 2),
('2025102015', 'Biologia', '2026-03-06', 0, NULL, 2),
('2025102015', 'História', '2026-03-07', 0, NULL, 2),
('2025102015', 'Geografia', '2026-03-09', 0, NULL, 2),
('2025102015', 'Matemática', '2026-03-10', 0, NULL, 2),
('2025102015', 'Português', '2026-03-11', 0, NULL, 2);

-- ============================================================
-- ALUNO 4: Sebastiana Araújo Santos (2024102020)
-- Curso: Técnico em Informática (Integrado) | Risco: MUITO_ALTO
-- 12 faltas consecutivas em Março/2026 → Frequência: 40%
-- 🔴 Deve gerar alerta de 10+ faltas consecutivas (URGENTE)
-- ============================================================
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada, motivo_justificativa, criado_por) VALUES
('2024102020', 'Matemática', '2026-03-02', 0, NULL, 2),
('2024102020', 'Português', '2026-03-03', 0, NULL, 2),
('2024102020', 'Física', '2026-03-04', 0, NULL, 2),
('2024102020', 'Química', '2026-03-05', 0, NULL, 2),
('2024102020', 'Biologia', '2026-03-06', 0, NULL, 2),
('2024102020', 'História', '2026-03-07', 0, NULL, 2),
('2024102020', 'Geografia', '2026-03-09', 0, NULL, 2),
('2024102020', 'Matemática', '2026-03-10', 0, NULL, 2),
('2024102020', 'Português', '2026-03-11', 0, NULL, 2),
('2024102020', 'Física', '2026-03-12', 0, NULL, 2),
('2024102020', 'Química', '2026-03-13', 0, NULL, 2),
('2024102020', 'Biologia', '2026-03-14', 0, NULL, 2);

-- ============================================================
-- VALIDAÇÃO - Ver dados inseridos
-- ============================================================

-- 1. Total de faltas por aluno
SELECT 
    rfd.aluno_matricula,
    a.nome,
    COUNT(*) as total_faltas,
    SUM(CASE WHEN rfd.justificada = 1 THEN 1 ELSE 0 END) as justificadas,
    SUM(CASE WHEN rfd.justificada = 0 THEN 1 ELSE 0 END) as nao_justificadas
FROM registro_faltas_diarias rfd
LEFT JOIN alunos a ON rfd.aluno_matricula = a.matricula
WHERE rfd.aluno_matricula IN ('2025102007', '2024102010', '2025102015', '2024102020')
  AND rfd.data >= '2026-03-01'
GROUP BY rfd.aluno_matricula, a.nome;

-- 2. Frequência calculada (simulação do endpoint)
SELECT 
    rfd.aluno_matricula,
    a.nome,
    COUNT(*) as total_faltas,
    SUM(CASE WHEN rfd.justificada = 0 THEN 1 ELSE 0 END) as nao_justificadas,
    20 as total_aulas_mes,
    ROUND((20 - SUM(CASE WHEN rfd.justificada = 0 THEN 1 ELSE 0 END)) * 100.0 / 20, 2) as frequencia_calc
FROM registro_faltas_diarias rfd
LEFT JOIN alunos a ON rfd.aluno_matricula = a.matricula
WHERE rfd.aluno_matricula IN ('2025102007', '2024102010', '2025102015', '2024102020')
  AND rfd.data >= '2026-03-01'
GROUP BY rfd.aluno_matricula, a.nome;

-- 3. Verificar alertas gerados
SELECT 
    id,
    aluno_matricula,
    a.nome,
    tipo_alerta,
    quantidade_faltas,
    status,
    disciplinas_afetadas,
    criado_at
FROM alertas_faltas_consecutivas afc
LEFT JOIN alunos a ON afc.aluno_matricula = a.matricula
WHERE afc.aluno_matricula IN ('2025102007', '2024102010', '2025102015', '2024102020')
ORDER BY afc.criado_at DESC;
