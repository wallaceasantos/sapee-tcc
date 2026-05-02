-- ============================================================
-- CRIAR ALERTAS DE FALTAS CONSECUTIVAS - Manual
-- MySQL - Executar no MySQL Workbench
-- ============================================================
-- Este script cria alertas manualmente para os alunos de teste
-- pois os alertas são gerados automaticamente pelo script Python
-- ============================================================

-- Verificar usuário admin para resolvido_por (se necessário)
SELECT id, nome FROM usuarios WHERE role = 'ADMIN' LIMIT 1;

-- ============================================================
-- ALERTA 1: Antônio Souza Oliveira (2025102007)
-- 6 faltas → tipo: 5_FALTAS
-- ============================================================
INSERT INTO alertas_faltas_consecutivas (
    aluno_matricula,
    tipo_alerta,
    quantidade_faltas,
    data_inicio_faltas,
    data_fim_faltas,
    disciplinas_afetadas,
    status
) VALUES (
    '2025102007',
    '5_FALTAS',
    6,
    '2026-03-03',
    '2026-03-14',
    '["Matemática", "Português", "Física", "Química", "Biologia", "História"]',
    'PENDENTE'
);

-- ============================================================
-- ALERTA 2: Josefa Barbosa Nunes (2024102010)
-- 7 faltas (2 justificadas) → tipo: 5_FALTAS
-- ============================================================
INSERT INTO alertas_faltas_consecutivas (
    aluno_matricula,
    tipo_alerta,
    quantidade_faltas,
    data_inicio_faltas,
    data_fim_faltas,
    disciplinas_afetadas,
    status
) VALUES (
    '2024102010',
    '5_FALTAS',
    7,
    '2026-03-03',
    '2026-03-17',
    '["Matemática", "Português", "Física", "Química", "Biologia", "História", "Geografia"]',
    'PENDENTE'
);

-- ============================================================
-- ALERTA 3: Francisco Alves da Silva (2025102015)
-- 9 faltas consecutivas → tipo: 5_FALTAS (sequência de 5+)
-- ============================================================
INSERT INTO alertas_faltas_consecutivas (
    aluno_matricula,
    tipo_alerta,
    quantidade_faltas,
    data_inicio_faltas,
    data_fim_faltas,
    disciplinas_afetadas,
    status
) VALUES (
    '2025102015',
    '5_FALTAS',
    9,
    '2026-03-02',
    '2026-03-11',
    '["Matemática", "Português", "Física", "Química", "Biologia", "História", "Geografia"]',
    'PENDENTE'
);

-- ============================================================
-- ALERTA 4: Sebastiana Araújo Santos (2024102020)
-- 12 faltas consecutivas → tipo: 10_FALTAS (URGENTE)
-- ============================================================
INSERT INTO alertas_faltas_consecutivas (
    aluno_matricula,
    tipo_alerta,
    quantidade_faltas,
    data_inicio_faltas,
    data_fim_faltas,
    disciplinas_afetadas,
    status
) VALUES (
    '2024102020',
    '10_FALTAS',
    12,
    '2026-03-02',
    '2026-03-14',
    '["Matemática", "Português", "Física", "Química", "Biologia", "História", "Geografia"]',
    'PENDENTE'
);

-- ============================================================
-- VALIDAÇÃO - Ver alertas criados
-- ============================================================

-- 1. Ver todos os alertas dos alunos de teste
SELECT 
    afc.id,
    afc.aluno_matricula,
    a.nome,
    afc.tipo_alerta,
    afc.quantidade_faltas,
    afc.status,
    afc.disciplinas_afetadas,
    afc.criado_at
FROM alertas_faltas_consecutivas afc
LEFT JOIN alunos a ON afc.aluno_matricula = a.matricula
WHERE afc.aluno_matricula IN ('2025102007', '2024102010', '2025102015', '2024102020')
ORDER BY afc.quantidade_faltas DESC;

-- 2. Resumo por tipo de alerta
SELECT 
    tipo_alerta,
    COUNT(*) as total_alertas,
    SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
    SUM(CASE WHEN status = 'RESOLVIDO' THEN 1 ELSE 0 END) as resolvidos
FROM alertas_faltas_consecutivas
GROUP BY tipo_alerta;

-- 3. Estatísticas do dashboard (simulação)
SELECT 
    'Estatísticas Atuais' as info,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
    SUM(CASE WHEN tipo_alerta = '3_FALTAS' THEN 1 ELSE 0 END) as tres_faltas,
    SUM(CASE WHEN tipo_alerta = '5_FALTAS' THEN 1 ELSE 0 END) as cinco_faltas,
    SUM(CASE WHEN tipo_alerta = '10_FALTAS' THEN 1 ELSE 0 END) as dez_faltas
FROM alertas_faltas_consecutivas
WHERE status != 'IGNORADO';
