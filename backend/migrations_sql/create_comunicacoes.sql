-- ============================================================
-- SCRIPT DE CRIAÇÃO: Tabela comunicacoes - SAPEE DEWAS
-- ============================================================
-- Tabela para registrar todas as comunicações do sistema:
-- notificações automáticas, mensagens manuais, lembretes e templates.
--
-- Execute: mysql -u seu_usuario -p sapee_db < create_comunicacoes.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `comunicacoes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  
  -- Identificação
  `aluno_matricula` VARCHAR(20) NOT NULL,
  `usuario_id` INT NULL COMMENT 'Profissional que enviou (NULL = automático)',
  `destinatario_tipo` ENUM('RESPONSAVEL', 'ALUNO', 'COORDENADOR', 'PROFESSOR') NOT NULL,
  `destinatario_nome` VARCHAR(100) NOT NULL COMMENT 'Nome do destinatário',
  `destinatario_contato` VARCHAR(50) NULL COMMENT 'Telefone ou email do destinatário',
  
  -- Mensagem
  `tipo_comunicacao` ENUM('FALTAS', 'RISCO', 'ATENDIMENTO', 'LEMBRETE', 'MANUAL', 'ENCAMINHAMENTO') NOT NULL,
  `canal` ENUM('WHATSAPP', 'SMS', 'EMAIL', 'SISTEMA') NOT NULL DEFAULT 'SISTEMA',
  `assunto` VARCHAR(200) NULL COMMENT 'Assunto da mensagem',
  `mensagem` TEXT NOT NULL COMMENT 'Conteúdo da mensagem (com variáveis preenchidas)',
  `template_id` VARCHAR(50) NULL COMMENT 'ID do template usado',
  
  -- Status
  `status` ENUM('PENDENTE', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
  `data_envio` DATETIME NULL COMMENT 'Quando foi enviada',
  `data_leitura` DATETIME NULL COMMENT 'Quando foi lida',
  `erro_motivo` TEXT NULL COMMENT 'Motivo da falha, se houver',
  
  -- Lembrete/Agendamento
  `eh_lembrete` TINYINT(1) NOT NULL DEFAULT 0,
  `data_agendada` DATETIME NULL COMMENT 'Data/hora para envio agendado',
  `data_envio_efetivo` DATETIME NULL COMMENT 'Quando realmente foi enviado',
  
  -- Resposta
  `recebeu_resposta` TINYINT(1) NOT NULL DEFAULT 0,
  `resposta_conteudo` TEXT NULL COMMENT 'Conteúdo da resposta do destinatário',
  `data_resposta` DATETIME NULL,
  
  -- Controle
  `criado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  INDEX `idx_comunicacoes_aluno` (`aluno_matricula`),
  INDEX `idx_comunicacoes_usuario` (`usuario_id`),
  INDEX `idx_comunicacoes_tipo` (`tipo_comunicacao`),
  INDEX `idx_comunicacoes_canal` (`canal`),
  INDEX `idx_comunicacoes_status` (`status`),
  INDEX `idx_comunicacoes_data_envio` (`data_envio`),
  INDEX `idx_comunicacoes_data_agendada` (`data_agendada`),
  INDEX `idx_comunicacoes_eh_lembrete` (`eh_lembrete`),
  
  CONSTRAINT `fk_comunicacoes_aluno` FOREIGN KEY (`aluno_matricula`) REFERENCES `alunos` (`matricula`) ON DELETE CASCADE,
  CONSTRAINT `fk_comunicacoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de todas as comunicações e notificações do sistema';


-- ============================================================
-- TABELA DE TEMPLATES DE MENSAGENS
-- ============================================================

CREATE TABLE IF NOT EXISTS `templates_comunicacao` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador único do template',
  `nome` VARCHAR(100) NOT NULL COMMENT 'Nome descritivo do template',
  `tipo_comunicacao` ENUM('FALTAS', 'RISCO', 'ATENDIMENTO', 'LEMBRETE', 'MANUAL', 'ENCAMINHAMENTO') NOT NULL,
  `canal` ENUM('WHATSAPP', 'SMS', 'EMAIL', 'SISTEMA') NOT NULL DEFAULT 'SISTEMA',
  `assunto` VARCHAR(200) NULL COMMENT 'Assunto (para email)',
  `conteudo` TEXT NOT NULL COMMENT 'Conteúdo com variáveis {nome_aluno}, {qtd_faltas}, etc.',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `criado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  INDEX `idx_templates_tipo` (`tipo_comunicacao`),
  INDEX `idx_templates_canal` (`canal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Templates de mensagens para comunicações automáticas';


-- ============================================================
-- INSERIR TEMPLATES PADRÃO
-- ============================================================

INSERT INTO `templates_comunicacao` (`codigo`, `nome`, `tipo_comunicacao`, `canal`, `assunto`, `conteudo`) VALUES
('FALTAS_3_WHATSAPP', '3 Faltas - WhatsApp Responsável', 'FALTAS', 'WHATSAPP', NULL,
 'Prezado(a) {nome_responsavel}, informamos que {nome_aluno} acumula {qtd_faltas} faltas consecutivas em {disciplina}. Solicitamos contato com a coordenação. SAPEE DEWAS'),

('FALTAS_5_WHATSAPP', '5 Faltas - WhatsApp Responsável', 'FALTAS', 'WHATSAPP', NULL,
 '⚠️ ATENÇÃO: {nome_aluno} possui {qtd_faltas} faltas em {disciplina}. É necessário agendar reunião com a coordenação pedagógica. SAPEE DEWAS'),

('RISCO_ALTO_WHATSAPP', 'Risco ALTO - WhatsApp Responsável', 'RISCO', 'WHATSAPP', NULL,
 'Prezado(a) {nome_responsavel}, identificamos que {nome_aluno} apresenta risco de evasão de {risco_evasao}%. É fundamental seu comparecimento à escola. SAPEE DEWAS'),

('ATENDIMENTO_LEMBRETE', 'Lembrete de Atendimento', 'ATENDIMENTO', 'WHATSAPP', NULL,
 'Lembrete: {nome_aluno} possui atendimento agendado para {data_atendimento} às {hora_atendimento} com {profissional}. SAPEE DEWAS'),

('ENCAMINHAMENTO_STATUS', 'Atualização de Encaminhamento', 'ENCAMINHAMENTO', 'WHATSAPP', NULL,
 'Prezado(a) {nome_responsavel}, o encaminhamento de {nome_aluno} para {destino_encaminhamento} foi atualizado para: {status_encaminhamento}. SAPEE DEWAS');


-- ============================================================
-- CONSULTAS ÚTEIS
-- ============================================================

-- Comunicações pendentes de envio:
-- SELECT * FROM comunicacoes WHERE status = 'PENDENTE' AND data_agendada <= NOW();

-- Taxa de entrega por canal:
-- SELECT canal, COUNT(*) as total, 
--   SUM(CASE WHEN status IN ('ENTREGUE', 'LIDA') THEN 1 ELSE 0 END) as entregues,
--   ROUND(SUM(CASE WHEN status IN ('ENTREGUE', 'LIDA') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as taxa_entrega
-- FROM comunicacoes GROUP BY canal;

-- Comunicacoes por aluno:
-- SELECT aluno_matricula, COUNT(*) as total FROM comunicacoes GROUP BY aluno_matricula ORDER BY total DESC;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
