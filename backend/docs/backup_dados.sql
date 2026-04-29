-- ============================================
-- SCRIPT DE BACKUP - DADOS ATUAIS
-- SAPEE DEWAS Backend
-- ============================================
-- Execute ESTE SCRIPT antes de limpar os dados!
-- ============================================

-- ============================================
-- OPÇÃO 1: BACKUP VIA MySQL Workbench
-- ============================================
-- 1. Abra MySQL Workbench
-- 2. Conecte-se ao localhost
-- 3. Server → Data Export
-- 4. Selecione: sapee_dewas
-- 5. Export to Self-Contained File
-- 6. Escolha local para salvar
-- 7. Clique em "Start Export"

-- ============================================
-- OPÇÃO 2: BACKUP VIA COMMAND LINE
-- ============================================
-- No terminal (CMD/PowerShell):
-- 
-- Windows:
-- mysqldump -u root -p sapee_dewas > backup_sapee_%DATE:~-4,4%%DATE:~-7,2%%DATE:~-10,2%.sql
--
-- Linux/Mac:
-- mysqldump -u root -p sapee_dewas > backup_sapee_$(date +%Y%m%d_%H%M%S).sql

-- ============================================
-- OPÇÃO 3: BACKUP PARCIAL (APENAS ALUNOS)
-- ============================================

USE sapee_dewas;

-- Exportar alunos para CSV
SELECT 
    matricula,
    nome,
    email,
    telefone,
    data_nascimento,
    idade,
    sexo,
    curso_id,
    periodo,
    turno,
    media_geral,
    frequencia,
    historico_reprovas,
    coeficiente_rendimento,
    ano_ingresso,
    cidade,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    zona_residencial,
    renda_familiar,
    renda_per_capita,
    possui_auxilio,
    tipo_auxilio,
    trabalha,
    carga_horaria_trabalho,
    tempo_deslocamento,
    custo_transporte_diario,
    dificuldade_acesso,
    transporte_utilizado,
    usa_transporte_alternativo,
    possui_computador,
    possui_internet,
    beneficiario_bolsa_familia,
    primeiro_geracao_universidade
INTO OUTFILE 'C:/backup_alunos_$(DATE).csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM alunos;

-- ============================================
-- VERIFICAR DADOS ANTES DE LIMPAR
-- ============================================

SELECT '=== RESUMO DOS DADOS ATUAIS ===' AS '';

SELECT 'Alunos:' AS '', COUNT(*) AS quantidade FROM alunos;
SELECT 'Predições:' AS '', COUNT(*) FROM predicoes;
SELECT 'Frequência Mensal:' AS '', COUNT(*) FROM frequencia_mensal;
SELECT 'Intervenções:' AS '', COUNT(*) FROM intervencoes;
SELECT 'Usuários:' AS '', COUNT(*) FROM usuarios;
SELECT 'Cursos:' AS '', COUNT(*) FROM cursos;

SELECT '=== USUÁRIOS CADASTRADOS ===' AS '';
SELECT id, nome, email, role_id, ativo FROM usuarios;

SELECT '=== CURSOS CADASTRADOS ===' AS '';
SELECT id, nome, modalidade FROM cursos;

SELECT '=== PRONTOS PARA BACKUP? ===' AS '';
SELECT '✅ Se sim, execute o script de limpeza' AS '';
SELECT '⚠️  Lembre-se: Não há como desfazer!' AS '';
