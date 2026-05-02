-- ============================================================
-- MIGRAÇÃO: Criar tabela de histórico de ações dos alertas
-- MySQL - Executar no MySQL Workbench
-- ============================================================

-- 1. Criar tabela de histórico (se não existir)
CREATE TABLE IF NOT EXISTS alertas_faltas_historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alerta_id INT NOT NULL,
    acao VARCHAR(100) NOT NULL COMMENT 'Tipo de ação: CRIADO, STATUS_ALTERADO, RESPONSAVEL_ATRIBUIDO, INTERVENCAO_CRIADA, OBSERVACAO_ADICIONADA',
    descricao TEXT NOT NULL COMMENT 'Descrição detalhada da ação',
    usuario_id INT NULL COMMENT 'Usuário que realizou a ação',
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_historico_alerta FOREIGN KEY (alerta_id) 
        REFERENCES alertas_faltas_consecutivas(id) ON DELETE CASCADE,
    CONSTRAINT fk_historico_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Histórico de ações realizadas em alertas de faltas';

-- 2. Verificar estrutura da tabela
DESCRIBE alertas_faltas_historico;

-- 3. Migrar ações existentes (observações) para o histórico
INSERT INTO alertas_faltas_historico (alerta_id, acao, descricao, usuario_id, criado_at)
SELECT 
    id as alerta_id,
    'CRIADO' as acao,
    CONCAT('Alerta criado automaticamente - ', tipo_alerta, ' (', quantidade_faltas, ' faltas consecutivas)') as descricao,
    NULL as usuario_id,
    criado_at
FROM alertas_faltas_consecutivas;

-- 4. Migrar alertas com status diferente de PENDENTE
INSERT INTO alertas_faltas_historico (alerta_id, acao, descricao, usuario_id, criado_at)
SELECT 
    id as alerta_id,
    'STATUS_ALTERADO' as acao,
    CONCAT('Status alterado para: ', status, 
        CASE WHEN acoes_tomadas IS NOT NULL AND acoes_tomadas != '' 
             THEN CONCAT('. Observações: ', LEFT(acoes_tomadas, 100))
             ELSE '' 
        END) as descricao,
    resolvido_por as usuario_id,
    COALESCE(data_resolucao, criado_at) as criado_at
FROM alertas_faltas_consecutivas
WHERE status != 'PENDENTE' AND status != 'IGNORADO';

-- 5. Verificar histórico migrado
SELECT 
    afh.id,
    afh.alerta_id,
    a.aluno_matricula,
    al.nome as aluno_nome,
    afh.acao,
    afh.descricao,
    u.nome as usuario_nome,
    afh.criado_at
FROM alertas_faltas_historico afh
LEFT JOIN alertas_faltas_consecutivas a ON afh.alerta_id = a.id
LEFT JOIN alunos al ON a.aluno_matricula = al.matricula
LEFT JOIN usuarios u ON afh.usuario_id = u.id
ORDER BY afh.criado_at DESC
LIMIT 20;

-- 6. Estatísticas do histórico
SELECT 
    acao,
    COUNT(*) as total
FROM alertas_faltas_historico
GROUP BY acao;
