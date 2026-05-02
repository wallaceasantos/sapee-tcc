-- ============================================================
-- DADOS DE TESTE: Faltas + Responsáveis
-- MySQL - Executar no MySQL Workbench
-- ============================================================
-- Este script:
-- 1. Atualiza contatos dos responsáveis para todos os alunos
-- 2. Insere faltas desde o início do ano letivo (2024-2026)
-- 3. Gera padrões de faltas consecutivas para gerar alertas
-- ============================================================

-- ============================================================
-- 1. ATUALIZAR CONTATOS DOS RESPONSÁVEIS
-- ============================================================

UPDATE alunos SET nome_responsavel_1 = 'Maria Silva Gomes', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0001' WHERE matricula = '2024101001';
UPDATE alunos SET nome_responsavel_1 = 'José Costa', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0002' WHERE matricula = '2024101002';
UPDATE alunos SET nome_responsavel_1 = 'Ana Barbosa', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0003' WHERE matricula = '2024101003';
UPDATE alunos SET nome_responsavel_1 = 'Carlos Soares', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0004' WHERE matricula = '2024101004';
UPDATE alunos SET nome_responsavel_1 = 'Lúcia Ferreira', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0005' WHERE matricula = '2024101005';
UPDATE alunos SET nome_responsavel_1 = 'Roberto Ribeiro', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0006' WHERE matricula = '2024101006';
UPDATE alunos SET nome_responsavel_1 = 'Sandra Oliveira', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0007' WHERE matricula = '2024101007';
UPDATE alunos SET nome_responsavel_1 = 'Antônio Lima', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0008' WHERE matricula = '2024101008';
UPDATE alunos SET nome_responsavel_1 = 'Paula Rodrigues', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0009' WHERE matricula = '2024101009';
UPDATE alunos SET nome_responsavel_1 = 'Ricardo Martins', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0010' WHERE matricula = '2024101010';
UPDATE alunos SET nome_responsavel_1 = 'Tereza Santos', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0011' WHERE matricula = '2024101011';
UPDATE alunos SET nome_responsavel_1 = 'Marcos Martins', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0012' WHERE matricula = '2024101012';
UPDATE alunos SET nome_responsavel_1 = 'Vera Alves', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0013' WHERE matricula = '2024101013';
UPDATE alunos SET nome_responsavel_1 = 'Geraldo Lima', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0014' WHERE matricula = '2024101014';
UPDATE alunos SET nome_responsavel_1 = 'Rosa Almeida', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0015' WHERE matricula = '2024101015';
UPDATE alunos SET nome_responsavel_1 = 'Benedito Alves', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0016' WHERE matricula = '2024101016';
UPDATE alunos SET nome_responsavel_1 = 'Helena Carvalho', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0017' WHERE matricula = '2024101017';
UPDATE alunos SET nome_responsavel_1 = 'Walter Lopes', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0018' WHERE matricula = '2024101018';
UPDATE alunos SET nome_responsavel_1 = 'Célia Martins', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0019' WHERE matricula = '2024101019';
UPDATE alunos SET nome_responsavel_1 = 'Nelson Pereira', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0020' WHERE matricula = '2024101020';
UPDATE alunos SET nome_responsavel_1 = 'Irene Silva', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0021' WHERE matricula = '2024101021';
UPDATE alunos SET nome_responsavel_1 = 'Geraldo Fernandes', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0022' WHERE matricula = '2024101022';
UPDATE alunos SET nome_responsavel_1 = 'Marta Ferreira', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0023' WHERE matricula = '2024101023';
UPDATE alunos SET nome_responsavel_1 = 'Sebastião Ribeiro', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0024' WHERE matricula = '2024101024';
UPDATE alunos SET nome_responsavel_1 = 'Lourdes Lopes', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0025' WHERE matricula = '2024101025';
UPDATE alunos SET nome_responsavel_1 = 'Arlindo Vieira', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0026' WHERE matricula = '2024101026';
UPDATE alunos SET nome_responsavel_1 = 'Dalva Costa', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0027' WHERE matricula = '2024101027';
UPDATE alunos SET nome_responsavel_1 = 'Expedito Oliveira', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0028' WHERE matricula = '2024101028';
UPDATE alunos SET nome_responsavel_1 = 'Nilza Lopes', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0029' WHERE matricula = '2024101029';
UPDATE alunos SET nome_responsavel_1 = 'Raimundo Almeida', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0030' WHERE matricula = '2024101030';
UPDATE alunos SET nome_responsavel_1 = 'Marlene Vieira', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0031' WHERE matricula = '2024101031';
UPDATE alunos SET nome_responsavel_1 = 'Osmar Lopes', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0032' WHERE matricula = '2024101032';
UPDATE alunos SET nome_responsavel_1 = 'Carmem Pereira', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0033' WHERE matricula = '2024101033';
UPDATE alunos SET nome_responsavel_1 = 'Valdir Lopes', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0034' WHERE matricula = '2024101034';
UPDATE alunos SET nome_responsavel_1 = 'Edileusa Barbosa', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0035' WHERE matricula = '2024101035';
UPDATE alunos SET nome_responsavel_1 = 'Cláudio Alves', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0036' WHERE matricula = '2024101036';
UPDATE alunos SET nome_responsavel_1 = 'Rosângela Soares', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0037' WHERE matricula = '2024101037';
UPDATE alunos SET nome_responsavel_1 = 'Manoel Almeida', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0038' WHERE matricula = '2024101038';
UPDATE alunos SET nome_responsavel_1 = 'Jandira Rodrigues', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0039' WHERE matricula = '2024101039';
UPDATE alunos SET nome_responsavel_1 = 'Francisco Santos', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0040' WHERE matricula = '2024101040';
UPDATE alunos SET nome_responsavel_1 = 'Tereza Almeida', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0041' WHERE matricula = '2024101041';
UPDATE alunos SET nome_responsavel_1 = 'Geraldo Souza', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0042' WHERE matricula = '2024101042';
UPDATE alunos SET nome_responsavel_1 = 'Adelaide Fernandes', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0043' WHERE matricula = '2024101043';
UPDATE alunos SET nome_responsavel_1 = 'Raimundo Soares', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0044' WHERE matricula = '2024101044';
UPDATE alunos SET nome_responsavel_1 = 'Iracema Santos', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0045' WHERE matricula = '2024101045';
UPDATE alunos SET nome_responsavel_1 = 'Valdomiro Carvalho', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0046' WHERE matricula = '2024101046';
UPDATE alunos SET nome_responsavel_1 = 'Benedita Lopes', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0047' WHERE matricula = '2024101047';
UPDATE alunos SET nome_responsavel_1 = 'Edmilson Santos', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0048' WHERE matricula = '2024101048';
UPDATE alunos SET nome_responsavel_1 = 'Marilene Ribeiro', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99901-0049' WHERE matricula = '2024101049';
UPDATE alunos SET nome_responsavel_1 = 'José Alves', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99901-0050' WHERE matricula = '2024101050';
UPDATE alunos SET nome_responsavel_1 = 'Rita Costa', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99902-0004' WHERE matricula = '2024102004';
UPDATE alunos SET nome_responsavel_1 = 'Maria Alves da Silva', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99902-0010' WHERE matricula = '2024102010';
UPDATE alunos SET nome_responsavel_1 = 'Antônia Lima', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99902-0016' WHERE matricula = '2024102016';
UPDATE alunos SET nome_responsavel_1 = 'José Santos', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99902-0020' WHERE matricula = '2024102020';
UPDATE alunos SET nome_responsavel_1 = 'Joana Silva', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99903-0001' WHERE matricula = '2025102001';
UPDATE alunos SET nome_responsavel_1 = 'Pedro Santos', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99903-0002' WHERE matricula = '2025102002';
UPDATE alunos SET nome_responsavel_1 = 'Lúcia Costa', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99903-0005' WHERE matricula = '2025102005';
UPDATE alunos SET nome_responsavel_1 = 'Carlos Nunes', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99903-0006' WHERE matricula = '2025102006';
UPDATE alunos SET nome_responsavel_1 = 'Maria Oliveira', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99903-0007' WHERE matricula = '2025102007';
UPDATE alunos SET nome_responsavel_1 = 'João Rodrigues', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99903-0008' WHERE matricula = '2025102008';
UPDATE alunos SET nome_responsavel_1 = 'Francisca Mendes', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99903-0012' WHERE matricula = '2025102012';
UPDATE alunos SET nome_responsavel_1 = 'Sebastião Lima', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99903-0014' WHERE matricula = '2025102014';
UPDATE alunos SET nome_responsavel_1 = 'Maria Alves da Silva', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99999-8888' WHERE matricula = '2025102015';
UPDATE alunos SET nome_responsavel_1 = 'Antônia Rocha', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99903-0017' WHERE matricula = '2025102017';
UPDATE alunos SET nome_responsavel_1 = 'Raimundo Silva', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99903-0019' WHERE matricula = '2025102019';
UPDATE alunos SET nome_responsavel_1 = 'Maria Lima', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99904-0005' WHERE matricula = '2026101005';
UPDATE alunos SET nome_responsavel_1 = 'José Costa', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99904-0103' WHERE matricula = '2026101103';
UPDATE alunos SET nome_responsavel_1 = 'Eduardo Mendes', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99904-0201' WHERE matricula = '2026101201';
UPDATE alunos SET nome_responsavel_1 = 'Marta Costa', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99904-0003' WHERE matricula = '2026102003';
UPDATE alunos SET nome_responsavel_1 = 'Paulo Duarte', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99904-0009' WHERE matricula = '2026102009';
UPDATE alunos SET nome_responsavel_1 = 'Ana Ferreira', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99904-0011' WHERE matricula = '2026102011';
UPDATE alunos SET nome_responsavel_1 = 'Maria Santos', parentesco_responsavel_1 = 'Mãe', telefone_responsavel_1 = '(92) 99904-0013' WHERE matricula = '2026102013';
UPDATE alunos SET nome_responsavel_1 = 'Carlos Rocha', parentesco_responsavel_1 = 'Pai', telefone_responsavel_1 = '(92) 99904-0018' WHERE matricula = '2026102018';

-- ============================================================
-- 2. INSERIR FALTAS DESDE O INÍCIO DO ANO LETIVO
-- ============================================================
-- Padrões:
-- - Alunos 2024: faltas desde Fev/2024 (alguns com sequências longas)
-- - Alunos 2025: faltas desde Fev/2025 (foco em risco ALTO/MUITO_ALTO)
-- - Alunos 2026: faltas desde Fev/2026 (poucas faltas, risco baixo/médio)
-- ============================================================

-- --------------------------------------------------------
-- ALUNOS DE ALTO RISCO (muitas faltas consecutivas)
-- --------------------------------------------------------

-- 2024102020 - Sebastiana Araújo Santos (Risco MUITO_ALTO - freq 42%)
-- Sequência longa de 12+ faltas consecutivas em Mar/2026 para gerar alerta 10_FALTAS
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2024102020', 'Matemática', '2026-02-03', 0),
('2024102020', 'Português', '2026-02-04', 0),
('2024102020', 'Física', '2026-02-05', 0),
('2024102020', 'Química', '2026-02-06', 0),
('2024102020', 'Biologia', '2026-02-07', 0),
('2024102020', 'História', '2026-02-10', 0),
('2024102020', 'Geografia', '2026-02-11', 0),
('2024102020', 'Matemática', '2026-02-12', 0),
('2024102020', 'Português', '2026-02-13', 0),
('2024102020', 'Física', '2026-02-14', 0),
('2024102020', 'Matemática', '2026-03-02', 0),
('2024102020', 'Português', '2026-03-03', 0),
('2024102020', 'Física', '2026-03-04', 0),
('2024102020', 'Química', '2026-03-05', 0),
('2024102020', 'Biologia', '2026-03-06', 0),
('2024102020', 'História', '2026-03-07', 0),
('2024102020', 'Geografia', '2026-03-09', 0),
('2024102020', 'Matemática', '2026-03-10', 0),
('2024102020', 'Português', '2026-03-11', 0),
('2024102020', 'Física', '2026-03-12', 0),
('2024102020', 'Química', '2026-03-13', 0),
('2024102020', 'Biologia', '2026-03-14', 0),
('2024102020', 'Matemática', '2026-04-01', 0),
('2024102020', 'Português', '2026-04-02', 0),
('2024102020', 'Física', '2026-04-03', 0);

-- 2025102015 - Francisco Alves da Silva (Risco ALTO - freq 58%)
-- Sequência de 9 faltas consecutivas em Mar/2026 para gerar alerta 5_FALTAS
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2025102015', 'Matemática', '2026-02-05', 0),
('2025102015', 'Português', '2026-02-06', 0),
('2025102015', 'Física', '2026-02-07', 0),
('2025102015', 'Química', '2026-02-10', 0),
('2025102015', 'Matemática', '2026-02-12', 0),
('2025102015', 'Português', '2026-03-02', 0),
('2025102015', 'Física', '2026-03-03', 0),
('2025102015', 'Química', '2026-03-04', 0),
('2025102015', 'Biologia', '2026-03-05', 0),
('2025102015', 'História', '2026-03-06', 0),
('2025102015', 'Geografia', '2026-03-09', 0),
('2025102015', 'Matemática', '2026-03-10', 0),
('2025102015', 'Português', '2026-03-11', 0),
('2025102015', 'Matemática', '2026-04-02', 0),
('2025102015', 'Física', '2026-04-03', 0);

-- 2025102017 - José Barbosa Rocha (Risco ALTO - freq 52%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2025102017', 'Matemática', '2026-02-03', 0),
('2025102017', 'Português', '2026-02-04', 0),
('2025102017', 'Física', '2026-02-05', 0),
('2025102017', 'Química', '2026-02-06', 0),
('2025102017', 'Biologia', '2026-02-07', 0),
('2025102017', 'História', '2026-02-10', 0),
('2025102017', 'Geografia', '2026-02-11', 0),
('2025102017', 'Matemática', '2026-02-12', 0),
('2025102017', 'Matemática', '2026-03-02', 0),
('2025102017', 'Português', '2026-03-03', 0),
('2025102017', 'Física', '2026-03-04', 0),
('2025102017', 'Química', '2026-03-05', 0),
('2025102017', 'Biologia', '2026-03-06', 0),
('2025102017', 'História', '2026-03-07', 0),
('2025102017', 'Geografia', '2026-03-09', 0),
('2025102017', 'Matemática', '2026-03-10', 0),
('2025102017', 'Português', '2026-03-11', 0),
('2025102017', 'Matemática', '2026-04-01', 0);

-- 2025102019 - Raimundo Nonato Silva (Risco MUITO_ALTO - freq 45%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2025102019', 'Matemática', '2026-02-03', 0),
('2025102019', 'Português', '2026-02-04', 0),
('2025102019', 'Física', '2026-02-05', 0),
('2025102019', 'Química', '2026-02-06', 0),
('2025102019', 'Biologia', '2026-02-07', 0),
('2025102019', 'História', '2026-02-10', 0),
('2025102019', 'Geografia', '2026-02-11', 0),
('2025102019', 'Matemática', '2026-02-12', 0),
('2025102019', 'Português', '2026-02-13', 0),
('2025102019', 'Física', '2026-02-14', 0),
('2025102019', 'Matemática', '2026-03-02', 0),
('2025102019', 'Português', '2026-03-03', 0),
('2025102019', 'Física', '2026-03-04', 0),
('2025102019', 'Química', '2026-03-05', 0),
('2025102019', 'Biologia', '2026-03-06', 0),
('2025102019', 'História', '2026-03-07', 0),
('2025102019', 'Geografia', '2026-03-09', 0),
('2025102019', 'Matemática', '2026-03-10', 0),
('2025102019', 'Português', '2026-03-11', 0),
('2025102019', 'Matemática', '2026-04-01', 0);

-- 2026102018 - Pedro Ferreira Rocha (Risco MUITO_ALTO - freq 48%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2026102018', 'Matemática', '2026-02-04', 0),
('2026102018', 'Português', '2026-02-05', 0),
('2026102018', 'Física', '2026-02-06', 0),
('2026102018', 'Química', '2026-02-07', 0),
('2026102018', 'Biologia', '2026-02-10', 0),
('2026102018', 'História', '2026-02-11', 0),
('2026102018', 'Geografia', '2026-02-12', 0),
('2026102018', 'Matemática', '2026-03-02', 0),
('2026102018', 'Português', '2026-03-03', 0),
('2026102018', 'Física', '2026-03-04', 0),
('2026102018', 'Química', '2026-03-05', 0),
('2026102018', 'Biologia', '2026-03-06', 0),
('2026102018', 'História', '2026-03-07', 0),
('2026102018', 'Geografia', '2026-03-09', 0),
('2026102018', 'Matemática', '2026-03-10', 0),
('2026102018', 'Português', '2026-03-11', 0),
('2026102018', 'Matemática', '2026-04-02', 0);

-- --------------------------------------------------------
-- ALUNOS DE MÉDIO RISCO (faltas moderadas)
-- --------------------------------------------------------

-- 2024102010 - Josefa Barbosa Nunes (Risco MÉDIO - freq 68%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2024102010', 'Matemática', '2026-02-05', 0),
('2024102010', 'Português', '2026-02-06', 0),
('2024102010', 'Física', '2026-02-10', 0),
('2024102010', 'Matemática', '2026-03-03', 1),
('2024102010', 'Português', '2026-03-05', 0),
('2024102010', 'Física', '2026-03-07', 1),
('2024102010', 'Química', '2026-03-10', 0),
('2024102010', 'Biologia', '2026-03-12', 0),
('2024102010', 'História', '2026-03-14', 0),
('2024102010', 'Geografia', '2026-03-17', 1);

-- 2025102007 - Antônio Souza Oliveira (Risco MÉDIO - freq 72%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2025102007', 'Matemática', '2026-02-04', 0),
('2025102007', 'Português', '2026-02-06', 0),
('2025102007', 'Física', '2026-02-11', 0),
('2025102007', 'Matemática', '2026-03-03', 0),
('2025102007', 'Português', '2026-03-05', 0),
('2025102007', 'Física', '2026-03-07', 0),
('2025102007', 'Química', '2026-03-10', 0),
('2025102007', 'Biologia', '2026-03-12', 0),
('2025102007', 'História', '2026-03-14', 0);

-- 2024101001 - Renata Carvalho Gomes (Risco MÉDIO - freq 72%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2024101001', 'Matemática', '2026-02-03', 0),
('2024101001', 'Português', '2026-02-05', 0),
('2024101001', 'Física', '2026-02-10', 0),
('2024101001', 'Matemática', '2026-03-02', 0),
('2024101001', 'Português', '2026-03-04', 0),
('2024101001', 'Física', '2026-03-06', 0),
('2024101001', 'Química', '2026-03-10', 0),
('2024101001', 'Biologia', '2026-03-12', 0);

-- 2026102011 - Manuel Ferreira Lima (Risco MÉDIO - freq 66%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2026102011', 'Matemática', '2026-02-04', 0),
('2026102011', 'Português', '2026-02-06', 0),
('2026102011', 'Física', '2026-02-11', 0),
('2026102011', 'Química', '2026-02-13', 0),
('2026102011', 'Matemática', '2026-03-02', 0),
('2026102011', 'Português', '2026-03-04', 0),
('2026102011', 'Física', '2026-03-06', 0),
('2026102011', 'Química', '2026-03-10', 0),
('2026102011', 'Biologia', '2026-03-12', 0),
('2026102011', 'História', '2026-03-14', 0);

-- 2026102013 - Sebastião Oliveira Santos (Risco MÉDIO - freq 65%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2026102013', 'Matemática', '2026-02-03', 0),
('2026102013', 'Português', '2026-02-05', 0),
('2026102013', 'Física', '2026-02-07', 0),
('2026102013', 'Química', '2026-02-10', 0),
('2026102013', 'Matemática', '2026-03-02', 0),
('2026102013', 'Português', '2026-03-04', 0),
('2026102013', 'Física', '2026-03-06', 0),
('2026102013', 'Química', '2026-03-10', 0),
('2026102013', 'Biologia', '2026-03-12', 0);

-- --------------------------------------------------------
-- ALUNOS DE BAIXO RISCO (poucas faltas, não consecutivas)
-- --------------------------------------------------------

-- 2025102001 - Maria Silva Santos (Risco BAIXO - freq 92%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2025102001', 'Matemática', '2026-03-07', 1);

-- 2025102006 - Luiz Araújo Nunes (Risco BAIXO - freq 90%)
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2025102006', 'Matemática', '2026-03-06', 1),
('2025102006', 'Português', '2026-04-03', 0);

-- ============================================================
-- 3. VERIFICAÇÃO DOS DADOS INSERIDOS
-- ============================================================

-- Contar faltas por aluno
SELECT 
    rfd.aluno_matricula,
    a.nome,
    COUNT(*) as total_faltas,
    SUM(CASE WHEN rfd.justificada = 1 THEN 1 ELSE 0 END) as justificadas,
    SUM(CASE WHEN rfd.justificada = 0 THEN 1 ELSE 0 END) as nao_justificadas
FROM registro_faltas_diarias rfd
LEFT JOIN alunos a ON rfd.aluno_matricula = a.matricula
GROUP BY rfd.aluno_matricula, a.nome
ORDER BY total_faltas DESC;

-- Verificar responsáveis atualizados
SELECT 
    matricula,
    nome,
    nome_responsavel_1,
    parentesco_responsavel_1,
    telefone_responsavel_1
FROM alunos 
WHERE nome_responsavel_1 IS NOT NULL
ORDER BY matricula;
