-- ============================================================
-- SCRIPT DE CRIAÇÃO: Tabela notas_disciplina - SAPEE DEWAS
-- ============================================================
-- Tabela para armazenar notas do aluno por disciplina e período.
-- Permite identificar padrões de reprovação em disciplinas específicas.
--
-- Execute: mysql -u seu_usuario -p sapee_db < create_notas_disciplina.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `notas_disciplina` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `aluno_matricula` VARCHAR(20) NOT NULL,
  `disciplina` VARCHAR(100) NOT NULL,
  `disciplina_id` INT NULL DEFAULT NULL COMMENT 'FK para disciplina padronizada',
  `periodo_letivo` VARCHAR(20) NOT NULL COMMENT 'Ex: 2024-1, 2024-2, 2025-1',
  `bimestre` INT NOT NULL COMMENT '1, 2, 3, 4 (ou semestre: 1, 2)',
  `nota` DECIMAL(4,2) NOT NULL COMMENT 'Nota do aluno (0-10)',
  `faltas_disciplina` INT NOT NULL DEFAULT 0 COMMENT 'Faltas apenas nesta disciplina',
  `situacao` ENUM('APROVADO', 'REPROVADO', 'CURSANDO') NOT NULL DEFAULT 'CURSANDO',
  `criado_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notas_aluno` (`aluno_matricula`),
  INDEX `idx_notas_disciplina` (`disciplina`),
  INDEX `idx_notas_periodo` (`periodo_letivo`),
  INDEX `idx_notas_disciplina_id` (`disciplina_id`),
  CONSTRAINT `fk_notas_aluno` FOREIGN KEY (`aluno_matricula`) REFERENCES `alunos` (`matricula`) ON DELETE CASCADE,
  CONSTRAINT `fk_notas_disciplina_ref` FOREIGN KEY (`disciplina_id`) REFERENCES `disciplinas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notas do aluno por disciplina e período';


-- ============================================================
-- DADOS DE EXEMPLO (descomente para inserir dados de teste)
-- ============================================================

-- INSERT INTO notas_disciplina (aluno_matricula, disciplina, periodo_letivo, bimestre, nota, faltas_disciplina, situacao) VALUES
-- ('2024101001', 'Matemática', '2024-1', 1, 6.5, 3, 'APROVADO'),
-- ('2024101001', 'Matemática', '2024-1', 2, 5.0, 5, 'APROVADO'),
-- ('2024101001', 'Português', '2024-1', 1, 7.0, 2, 'APROVADO'),
-- ('2024101001', 'Português', '2024-1', 2, 8.0, 1, 'APROVADO'),
-- ('2024101001', 'Física', '2024-1', 1, 4.0, 4, 'REPROVADO'),
-- ('2024101001', 'Física', '2024-1', 2, 3.5, 6, 'REPROVADO'),
-- ('2024101002', 'Matemática', '2024-1', 1, 8.0, 1, 'APROVADO'),
-- ('2024101002', 'Matemática', '2024-1', 2, 7.5, 2, 'APROVADO'),
-- ('2024101002', 'Português', '2024-1', 1, 6.0, 3, 'APROVADO'),
-- ('2024101002', 'História', '2024-1', 1, 5.5, 4, 'REPROVADO');


-- ============================================================
-- CONSULTAS ÚTEIS
-- ============================================================

-- Notas de um aluno específico:
-- SELECT * FROM notas_disciplina WHERE aluno_matricula = '2024101001' ORDER BY periodo_letivo DESC, bimestre;

-- Disciplinas com mais reprovações:
-- SELECT disciplina, COUNT(*) as qtd_reprovas 
-- FROM notas_disciplina 
-- WHERE situacao = 'REPROVADO' 
-- GROUP BY disciplina 
-- ORDER BY qtd_reprovas DESC;

-- Média geral por período:
-- SELECT periodo_letivo, AVG(nota) as media, COUNT(*) as total_notas
-- FROM notas_disciplina 
-- GROUP BY periodo_letivo 
-- ORDER BY periodo_letivo DESC;

-- Alunos reprovados em 2+ disciplinas no mesmo período:
-- SELECT aluno_matricula, periodo_letivo, COUNT(DISTINCT disciplina) as disciplinas_reprovadas
-- FROM notas_disciplina 
-- WHERE situacao = 'REPROVADO'
-- GROUP BY aluno_matricula, periodo_letivo
-- HAVING disciplinas_reprovadas >= 2;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
