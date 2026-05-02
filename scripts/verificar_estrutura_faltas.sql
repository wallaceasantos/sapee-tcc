-- ============================================================
-- VERIFICAR Estrutura e Dados - Faltas e Disciplinas
-- MySQL - Executar no MySQL Workbench
-- ============================================================

-- 1. Ver colunas da tabela registro_faltas_diarias
DESCRIBE registro_faltas_diarias;

-- 2. Ver colunas da tabela alertas_faltas_consecutivas
DESCRIBE alertas_faltas_consecutivas;

-- 3. Verificar se existem dados de faltas registrados
SELECT COUNT(*) as total_faltas_registradas
FROM registro_faltas_diarias;

-- 4. Ver disciplinas existentes nas faltas (distintas)
SELECT DISTINCT disciplina, COUNT(*) as total_faltas
FROM registro_faltas_diarias
GROUP BY disciplina
ORDER BY total_faltas DESC;

-- 5. Ver alertas de faltas existentes
SELECT 
    id,
    aluno_matricula,
    tipo_alerta,
    quantidade_faltas,
    status,
    disciplinas_afetadas,
    criado_at
FROM alertas_faltas_consecutivas
ORDER BY criado_at DESC
LIMIT 20;

-- 6. Verificar estrutura completa de registro_faltas_diarias
SHOW CREATE TABLE registro_faltas_diarias;

-- 7. Verificar se há alunos sem matrícula válida
SELECT *
FROM registro_faltas_diarias
WHERE aluno_matricula NOT IN (SELECT matricula FROM alunos);

-- 8. Últimas 10 faltas registradas (com dados do aluno)
SELECT 
    rfd.id,
    rfd.aluno_matricula,
    a.nome as nome_aluno,
    rfd.disciplina,
    rfd.data,
    rfd.justificada,
    rfd.motivo_justificativa,
    rfd.criado_at
FROM registro_faltas_diarias rfd
LEFT JOIN alunos a ON rfd.aluno_matricula = a.matricula
ORDER BY rfd.data DESC
LIMIT 10;
