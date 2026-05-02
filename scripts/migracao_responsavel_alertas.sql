-- ============================================================
-- MIGRAÇÃO: Adicionar campo responsavel_id aos alertas
-- MySQL - Executar no MySQL Workbench
-- ============================================================

-- 1. Adicionar coluna responsavel_id
ALTER TABLE alertas_faltas_consecutivas
ADD COLUMN responsavel_id INT NULL,
ADD CONSTRAINT fk_alerta_responsavel FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- 2. Verificar se coluna foi criada
DESCRIBE alertas_faltas_consecutivas;

-- 3. Ver usuários disponíveis para atribuição
SELECT id, nome, email FROM usuarios WHERE ativo = 1;

-- 4. (Opcional) Atribuir alertas pendentes ao admin
UPDATE alertas_faltas_consecutivas
SET responsavel_id = 2
WHERE responsavel_id IS NULL AND status = 'PENDENTE';

-- 5. Verificar alertas com responsáveis
SELECT 
    afc.id,
    afc.aluno_matricula,
    a.nome as aluno_nome,
    afc.tipo_alerta,
    afc.status,
    afc.responsavel_id,
    u.nome as responsavel_nome
FROM alertas_faltas_consecutivas afc
LEFT JOIN alunos a ON afc.aluno_matricula = a.matricula
LEFT JOIN usuarios u ON afc.responsavel_id = u.id
ORDER BY afc.id DESC;
