-- ============================================================
-- MIGRAÇÃO: Tabela de Histórico de Mudanças de Encaminhamento
-- ============================================================
-- Registra todas as alterações de status em encaminhamentos externos.
-- Permite auditoria completa do ciclo de vida do atendimento.
--
-- Execute: mysql -u seu_usuario -p sapee_db < create_historico_encaminhamento.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `historico_encaminhamento` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `atendimento_id` INT NOT NULL,
  `usuario_id` INT NOT NULL COMMENT 'Profissional que realizou a mudança',
  `status_anterior` ENUM('SOLICITADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO') NULL,
  `status_novo` ENUM('SOLICITADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO') NOT NULL,
  `observacoes` TEXT NULL COMMENT 'Motivo ou observação sobre a mudança',
  `data_mudanca` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  INDEX `idx_hist_enc_atendimento` (`atendimento_id`),
  INDEX `idx_hist_enc_usuario` (`usuario_id`),
  INDEX `idx_hist_enc_data` (`data_mudanca`),
  
  CONSTRAINT `fk_hist_enc_atendimento` FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hist_enc_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de mudanças de status em encaminhamentos externos';

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
