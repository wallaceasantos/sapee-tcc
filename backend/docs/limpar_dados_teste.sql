-- ============================================
-- SCRIPT DE LIMPEZA - DADOS DE TESTE
-- SAPEE DEWAS Backend
-- ============================================
-- ATENÇÃO: Este script apaga TODOS os dados!
-- Faça backup antes de executar!
-- ============================================

USE sapee_dewas;

-- ============================================
-- DESATIVAR FOREIGN KEY CHECKS
-- ============================================
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- LIMPAR TABELAS (ORDEM IMPORTANTE!)
-- ============================================

-- 1. Logs de auditoria (não tem FK)
TRUNCATE TABLE audit_logs;

-- 2. Predições (FK: alunos)
TRUNCATE TABLE predicoes;

-- 3. Frequência Mensal (FK: alunos)
TRUNCATE TABLE frequencia_mensal;

-- 4. Intervenções (FK: alunos, usuarios)
TRUNCATE TABLE intervencoes;

-- 5. Alunos (FK: cursos)
TRUNCATE TABLE alunos;

-- 6. Usuários (FK: roles, cursos)
-- Mantém o admin!
DELETE FROM usuarios WHERE email != 'admin@dewas.com.br';

-- 7. Cursos (não tem FK)
-- Opcional: manter ou limpar
-- TRUNCATE TABLE cursos;

-- 8. Roles (não tem FK)
-- NÃO LIMPAR: roles são necessários!
-- TRUNCATE TABLE roles;

-- ============================================
-- REATIVAR FOREIGN KEY CHECKS
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- RESETAR AUTO_INCREMENT (OPCIONAL)
-- ============================================
ALTER TABLE predicoes AUTO_INCREMENT = 1;
ALTER TABLE frequencia_mensal AUTO_INCREMENT = 1;
ALTER TABLE intervencoes AUTO_INCREMENT = 1;
ALTER TABLE usuarios AUTO_INCREMENT = 2; -- Mantém admin (ID 1)
ALTER TABLE audit_logs AUTO_INCREMENT = 1;

-- ============================================
-- VERIFICAR LIMPEZA
-- ============================================

SELECT 'audit_logs' AS tabela, COUNT(*) AS registros FROM audit_logs
UNION ALL
SELECT 'predicoes', COUNT(*) FROM predicoes
UNION ALL
SELECT 'frequencia_mensal', COUNT(*) FROM frequencia_mensal
UNION ALL
SELECT 'intervencoes', COUNT(*) FROM intervencoes
UNION ALL
SELECT 'alunos', COUNT(*) FROM alunos
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'cursos', COUNT(*) FROM cursos
UNION ALL
SELECT 'roles', COUNT(*) FROM roles;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ Limpeza concluída com sucesso!' AS mensagem;
SELECT '⚠️  Lembre-se: O usuário admin foi mantido!' AS aviso;
SELECT '📝 Agora você pode cadastrar alunos reais!' AS proximo_passo;
