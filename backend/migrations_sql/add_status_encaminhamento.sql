-- ============================================================
-- MIGRAÇÃO: Adicionar tracking de status de encaminhamento
-- ============================================================
-- Adiciona coluna para rastrear o ciclo de vida do encaminhamento externo.
-- Valores possíveis: SOLICITADO, EM_ATENDIMENTO, CONCLUIDO, CANCELADO.
--
-- Execute: mysql -u seu_usuario -p sapee_db < add_status_encaminhamento.sql
-- ============================================================

ALTER TABLE atendimentos 
ADD COLUMN status_encaminhamento ENUM('SOLICITADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO') NULL COMMENT 'Status do fluxo de encaminhamento externo';

-- Índice para facilitar consultas de gestão
CREATE INDEX idx_atendimentos_status_enc ON atendimentos(status_encaminhamento);
