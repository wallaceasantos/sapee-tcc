-- ============================================================
-- MIGRAÇÃO: Adicionar coluna curso_id na tabela disciplinas
-- ============================================================
-- Esta migração adiciona o campo curso_id para permitir
-- vincular disciplinas a cursos específicos ou mantê-las
-- genéricas (curso_id NULL).
--
-- Execute: mysql -u seu_usuario -p sapee_db < add_curso_id_to_disciplinas.sql
-- ============================================================

-- Adicionar coluna curso_id (nullable para permitir disciplinas genéricas)
ALTER TABLE disciplinas 
ADD COLUMN curso_id INT NULL COMMENT 'ID do curso vinculado (NULL = genérica)' AFTER ativa;

-- Adicionar chave estrangeira
ALTER TABLE disciplinas 
ADD CONSTRAINT fk_disciplina_curso 
FOREIGN KEY (curso_id) REFERENCES cursos(id) 
ON DELETE SET NULL;

-- Adicionar índice para melhorar performance de consultas por curso
CREATE INDEX idx_disciplinas_curso_id ON disciplinas(curso_id);

-- Verificar estrutura da tabela
-- DESCRIBE disciplinas;

-- Verificar disciplinas existentes (todas serão genéricas)
-- SELECT id, nome, ativa, curso_id FROM disciplinas ORDER BY nome;

-- ============================================================
-- NOTA: A tabela 'notas_disciplina' deve ser criada separadamente.
-- Execute: create_notas_disciplina.sql
-- ============================================================
