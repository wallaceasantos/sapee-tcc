-- ============================================================
-- SCRIPT DE CRIAÇÃO: Tabela atendimentos - SAPEE DEWAS
-- ============================================================
-- Tabela para registrar atendimentos/ocorrências individuais:
-- psicológico, social, disciplinar, acadêmico, saúde,
-- encaminhamentos externos e conversas informais.
--
-- Execute: mysql -u seu_usuario -p sapee_db < create_atendimentos.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `atendimentos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `aluno_matricula` VARCHAR(20) NOT NULL,
  `usuario_id` INT NOT NULL COMMENT 'Profissional que registrou',
  `tipo_atendimento` ENUM('PSICOLOGICO', 'SOCIAL', 'DISCIPLINAR', 'ACADEMICO', 'SAUDE', 'ENCAMINHAMENTO_EXTERNO', 'CONVERSA_INFORMAL') NOT NULL,
  `status` ENUM('AGENDADO', 'REALIZADO', 'CANCELADO', 'EM_ANDAMENTO', 'CONCLUIDO') NOT NULL DEFAULT 'AGENDADO',
  
  `data_atendimento` DATE NOT NULL,
  `hora_inicio` TIME NULL COMMENT 'Horário de início',
  `hora_fim` TIME NULL COMMENT 'Horário de término',
  `local` VARCHAR(100) NULL COMMENT 'Local do atendimento',
  
  `descricao` TEXT NOT NULL COMMENT 'Descrição do atendimento/ocorrência',
  `observacoes` TEXT NULL COMMENT 'Observações adicionais',
  
  -- Encaminhamentos
  `necessita_encaminhamento` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Precisa de encaminhamento externo',
  `tipo_encaminhamento` VARCHAR(100) NULL COMMENT 'Tipo: CAPS, UBS, Conselho Tutelar, etc.',
  `data_encaminhamento` DATE NULL,
  
  -- Follow-up
  `necessita_followup` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Precisa de acompanhamento',
  `data_proximo_atendimento` DATE NULL COMMENT 'Próximo agendamento',
  
  -- Prioridade
  `prioridade` ENUM('BAIXA', 'MEDIA', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'MEDIA',
  
  `criado_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  INDEX `idx_atendimentos_aluno` (`aluno_matricula`),
  INDEX `idx_atendimentos_usuario` (`usuario_id`),
  INDEX `idx_atendimentos_tipo` (`tipo_atendimento`),
  INDEX `idx_atendimentos_status` (`status`),
  INDEX `idx_atendimentos_data` (`data_atendimento`),
  INDEX `idx_atendimentos_prioridade` (`prioridade`),
  
  CONSTRAINT `fk_atendimentos_aluno` FOREIGN KEY (`aluno_matricula`) REFERENCES `alunos` (`matricula`) ON DELETE CASCADE,
  CONSTRAINT `fk_atendimentos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Atendimentos e ocorrências individuais';


-- ============================================================
-- DADOS DE EXEMPLO (descomente para inserir dados de teste)
-- ============================================================
-- Usuários existentes no banco (conforme dados reais):
-- ID 2 - Administrador DEWAS (role_id: 5 - ADMIN)
--
-- Roles disponíveis e permissões para atendimentos:
-- ID 5 - ADMIN (acesso total) → pode criar todos os tipos
-- ID 6 - COORDENADOR (acesso restrito ao curso) → pode registrar do seu curso
-- ID 7 - PEDAGOGO (foco em intervenções/atendimentos) → principal criador
-- ID 8 - DIRETOR (visão completa consultivo) → pode registrar
-- ============================================================

-- Inserir dados de exemplo usando o usuário administrador existente (ID: 2)
INSERT INTO atendimentos (aluno_matricula, usuario_id, tipo_atendimento, status, data_atendimento, descricao, prioridade) VALUES
('2024101001', 2, 'PSICOLOGICO', 'REALIZADO', CURDATE() - INTERVAL 30 DAY, 'Aluno relatou ansiedade e dificuldade de concentração. Encaminhado para acompanhamento semanal.', 'ALTA'),
('2024101002', 2, 'SOCIAL', 'REALIZADO', CURDATE() - INTERVAL 25 DAY, 'Família em situação de vulnerabilidade. Encaminhada para programa de assistência social.', 'MEDIA'),
('2024101003', 2, 'CONVERSA_INFORMAL', 'REALIZADO', CURDATE() - INTERVAL 20 DAY, 'Conversa informal sobre dificuldades com colegas. Aluno demonstrou melhora.', 'BAIXA'),
('2024101005', 2, 'DISCIPLINAR', 'EM_ANDAMENTO', CURDATE() - INTERVAL 15 DAY, 'Ocorrência disciplinar - atrasos recorrentes. Termo de compromisso assinado.', 'MEDIA'),
('2024101010', 2, 'ACADEMICO', 'AGENDADO', CURDATE() + INTERVAL 5 DAY, 'Encaminhamento para monitoria de matemática. Agendado para próxima semana.', 'ALTA'),
('2024101015', 2, 'PSICOLOGICO', 'CONCLUIDO', CURDATE() - INTERVAL 60 DAY, 'Acompanhamento psicológico por 2 meses. Aluno apresentou melhora significativa.', 'MEDIA'),
('2024101023', 2, 'SAUDE', 'REALIZADO', CURDATE() - INTERVAL 10 DAY, 'Aluno relatou problemas de visão. Encaminhado para oftalmologista na UBS.', 'ALTA'),
('2024101038', 2, 'ENCAMINHAMENTO_EXTERNO', 'EM_ANDAMENTO', CURDATE() - INTERVAL 5 DAY, 'Encaminhado para CAPS (Centro de Atenção Psicossocial). Aguardando primeira consulta.', 'URGENTE');


-- ============================================================
-- CONSULTAS ÚTEIS
-- ============================================================

-- Atendimentos por tipo:
-- SELECT tipo_atendimento, COUNT(*) as total FROM atendimentos GROUP BY tipo_atendimento;

-- Atendimentos pendentes (follow-up):
-- SELECT * FROM atendimentos WHERE necessita_followup = 1 AND status != 'CONCLUIDO' ORDER BY data_proximo_atendimento;

-- Encaminhamentos ativos:
-- SELECT * FROM atendimentos WHERE necessita_encaminhamento = 1 ORDER BY prioridade DESC;

-- Atendimentos por aluno:
-- SELECT aluno_matricula, COUNT(*) as total FROM atendimentos GROUP BY aluno_matricula ORDER BY total DESC;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
