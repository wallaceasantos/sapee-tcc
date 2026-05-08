-- ============================================
-- Adição da Role PROFESSOR e tabela disciplina_professor
-- SAPEE DEWAS - 2026-05-05
-- ============================================

-- 1. Inserir a role PROFESSOR
INSERT INTO roles (nome, descricao, permissoes, criado_at) VALUES (
  'PROFESSOR',
  'Professor - lança notas e registra faltas nas suas disciplinas',
  '{"logs": false, "alunos": ["read"], "importar": false, "usuarios": false, "dashboard": "curso", "relatorios": "nao", "configuracoes": false, "faltas": ["create", "read"], "notas": ["create", "read", "update"], "disciplinas": ["read"]}',
  NOW()
) ON DUPLICATE KEY UPDATE descricao = VALUES(descricao);

-- 2. Criar tabela de vínculo professor-disciplina
CREATE TABLE IF NOT EXISTS disciplina_professor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    disciplina_id INT NOT NULL,
    curso_id INT NULL COMMENT 'Cópia para facilitar filtros por curso',
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE KEY unique_disciplina_professor (usuario_id, disciplina_id),
    INDEX idx_disciplina (disciplina_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_curso (curso_id),

    -- Foreign keys
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Vínculo entre professores e suas disciplinas';

-- ============================================
-- EXEMPLO: Criar usuário professor (OPCIONAL)
-- ============================================
-- Senha padrão: 123456
-- Para gerar nova senha, execute no Python:
--   import bcrypt
--   print(bcrypt.hashpw('sua_senha'.encode(), bcrypt.gensalt()).decode())
-- ============================================

-- Exemplo de criação de professor (descomente e ajuste):
-- INSERT INTO usuarios (nome, email, senha, role_id, ativo, criado_at)
-- SELECT 
--   'Prof. Carlos Silva',
--   'carlos.silva@dewas.com.br',
--   '$2b$12$3TUMnwjkhKH/8sUGA/8Lluu3qYYL5qLUKtdP9sNEpN35hW6lV.D3K',  -- senha: 123456
--   id,  -- role_id = id da role PROFESSOR
--   1,
--   NOW()
-- FROM roles WHERE nome = 'PROFESSOR';

-- Exemplo de vínculo com disciplinas (descomente e ajuste IDs):
-- INSERT INTO disciplina_professor (usuario_id, disciplina_id, curso_id)
-- SELECT 
--   u.id,  -- ID do professor criado
--   1,     -- disciplina_id: Algoritmos e Lógica de Programação
--   12     -- curso_id: Técnico em Informática
-- FROM usuarios u WHERE u.email = 'carlos.silva@dewas.com.br';
