-- ============================================================
-- SCRIPT DE CRIAÇÃO: Tabela configuracoes_sistema - SAPEE DEWAS
-- ============================================================
-- Tabela para armazenar configurações globais do sistema
-- e personalizações da instituição.
--
-- Execute: mysql -u seu_usuario -p sapee_db < create_configuracoes_sistema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `configuracoes_sistema` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `chave` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador único da configuração',
  `valor` TEXT NULL COMMENT 'Valor da configuração',
  `descricao` VARCHAR(255) NULL COMMENT 'Descrição do que a configuração faz',
  `criado_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  INDEX `idx_config_chave` (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configurações gerais do sistema';

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

INSERT INTO `configuracoes_sistema` (`chave`, `valor`, `descricao`) VALUES
-- Dados da Instituição
('instituicao_nome', 'Instituto Federal do Amazonas - Campus Manaus-Centro', 'Nome exibido nos relatórios e cabeçalhos'),
('instituicao_email', 'contato@ifam.edu.br', 'Email padrão para contato'),
('instituicao_telefone', '(92) 99999-9999', 'Telefone padrão de contato'),
('instituicao_endereco', 'Av. Sete de Setembro, 1000 - Centro, Manaus - AM', 'Endereço completo'),

-- Limiares de Alerta de Faltas
('alerta_faltas_3_ativo', 'true', 'Ativar alerta de 3 faltas consecutivas'),
('alerta_faltas_5_ativo', 'true', 'Ativar alerta de 5 faltas consecutivas'),
('alerta_faltas_10_ativo', 'true', 'Ativar alerta de 10 faltas consecutivas'),
('alerta_faltas_notificar_telegram', 'true', 'Enviar notificações via Telegram automaticamente'),

-- Limiares de Risco de Evasão
('risco_baixo_max', '30', 'Score máximo para ser considerado Risco BAIXO'),
('risco_medio_max', '60', 'Score máximo para ser considerado Risco MEDIO'),
('risco_alto_max', '85', 'Score máximo para ser considerado Risco ALTO (acima é MUITO_ALTO)');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
