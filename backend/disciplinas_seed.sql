-- ============================================================
-- SCRIPT DE INSERÇÃO DE DISCIPLINAS - SAPEE DEWAS
-- ============================================================
-- Baseado na estrutura real do banco de dados:
-- - Tabela 'alunos' com campo 'curso_id' (FK para 'cursos.id')
-- - Tabela 'cursos' com 25 cursos cadastrados
-- - Tabela 'disciplinas' com relacionamento opcional via 'curso_id'
--
-- IMPORTANTE: A tabela 'disciplinas' possui constraint UNIQUE 
-- no campo 'nome'. Disciplinas com nomes iguais em cursos 
-- diferentes recebem sufixo identificador (ex: "- Civil", "- Mecânica").
--
-- Execute no MySQL Workbench ou via CLI:
-- mysql -u seu_usuario -p seu_banco < disciplinas_seed.sql
-- ============================================================

-- ============================================================
-- DISCIPLINAS POR ÁREA/CURSO
-- ============================================================
-- Nota: O campo 'curso_id' na tabela disciplinas é opcional (nullable).
-- Se NULL, a disciplina é genérica e aparece para todos os cursos.
-- Se preenchido, a disciplina é específica daquele curso.
-- ============================================================

-- ============================================================
-- DISCIPLINAS DO CURSO: Técnico em Informática (Integrado) - ID 12
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Algoritmos e Lógica de Programação', 1, 12, NOW()),
('Banco de Dados', 1, 12, NOW()),
('Redes de Computadores', 1, 12, NOW()),
('Sistemas Operacionais', 1, 12, NOW()),
('Desenvolvimento Web', 1, 12, NOW()),
('Hardware e Manutenção', 1, 12, NOW()),
('Programação Orientada a Objetos', 1, 12, NOW()),
('Engenharia de Software', 1, 12, NOW()),
('Segurança da Informação', 1, 12, NOW()),
('Interface Humano-Computador', 1, 12, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Técnico em Edificações (Integrado) - ID 13
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Desenho Técnico - Edificações', 1, 13, NOW()),
('Topografia', 1, 13, NOW()),
('Materiais de Construção', 1, 13, NOW()),
('Estruturas de Concreto', 1, 13, NOW()),
('Instalações Prediais', 1, 13, NOW()),
('Orçamento de Obras', 1, 13, NOW()),
('Geotecnia', 1, 13, NOW()),
('Hidráulica e Saneamento', 1, 13, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Técnico em Administração (Integrado) - ID 14
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Administração Geral', 1, 14, NOW()),
('Contabilidade Básica', 1, 14, NOW()),
('Marketing e Vendas', 1, 14, NOW()),
('Gestão de Pessoas', 1, 14, NOW()),
('Logística Empresarial', 1, 14, NOW()),
('Empreendedorismo', 1, 14, NOW()),
('Direito Empresarial', 1, 14, NOW()),
('Gestão Financeira', 1, 14, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Técnico em Agropecuária (Integrado) - ID 15
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Agricultura Geral', 1, 15, NOW()),
('Zootecnia', 1, 15, NOW()),
('Solos e Fertilizantes', 1, 15, NOW()),
('Irrigação e Drenagem', 1, 15, NOW()),
('Fitopatologia', 1, 15, NOW()),
('Mecanização Agrícola', 1, 15, NOW()),
('Gestão Rural', 1, 15, NOW()),
('Agroecologia', 1, 15, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Engenharia Civil - ID 1
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Cálculo Diferencial e Integral', 1, 1, NOW()),
('Física Geral - Engenharia', 1, 1, NOW()),
('Resistência dos Materiais - Civil', 1, 1, NOW()),
('Mecânica dos Solos', 1, 1, NOW()),
('Projeto Estrutural', 1, 1, NOW()),
('Hidráulica Aplicada', 1, 1, NOW()),
('Transportes e Tráfego', 1, 1, NOW()),
('Gestão de Obras', 1, 1, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Engenharia Mecânica - ID 2
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Termodinâmica', 1, 2, NOW()),
('Mecânica dos Fluidos', 1, 2, NOW()),
('Resistência dos Materiais - Mecânica', 1, 2, NOW()),
('Desenho Técnico Mecânico', 1, 2, NOW()),
('Processos de Fabricação', 1, 2, NOW()),
('Máquinas Térmicas', 1, 2, NOW()),
('Elementos de Máquinas', 1, 2, NOW()),
('Controle e Automação', 1, 2, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Ciências Biológicas (Licenciatura) - ID 3
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Botânica', 1, 3, NOW()),
('Zoologia', 1, 3, NOW()),
('Genética', 1, 3, NOW()),
('Ecologia', 1, 3, NOW()),
('Microbiologia', 1, 3, NOW()),
('Fisiologia Humana', 1, 3, NOW()),
('Bioquímica', 1, 3, NOW()),
('Didática Aplicada', 1, 3, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Física (Licenciatura) - ID 4
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Mecânica Clássica', 1, 4, NOW()),
('Eletromagnetismo', 1, 4, NOW()),
('Termodinâmica Avançada', 1, 4, NOW()),
('Óptica e Ondas', 1, 4, NOW()),
('Física Moderna', 1, 4, NOW()),
('Laboratório de Física', 1, 4, NOW()),
('Metodologia do Ensino de Física', 1, 4, NOW()),
('Astrofísica Básica', 1, 4, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Matemática (Licenciatura) - ID 5
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Álgebra Linear', 1, 5, NOW()),
('Cálculo Avançado', 1, 5, NOW()),
('Geometria Analítica', 1, 5, NOW()),
('Estatística e Probabilidade', 1, 5, NOW()),
('Teoria dos Números', 1, 5, NOW()),
('Equações Diferenciais', 1, 5, NOW()),
('Matemática Discreta', 1, 5, NOW()),
('Didática da Matemática', 1, 5, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Química (Licenciatura) - ID 6
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Química Orgânica', 1, 6, NOW()),
('Química Inorgânica', 1, 6, NOW()),
('Físico-Química', 1, 6, NOW()),
('Química Analítica', 1, 6, NOW()),
('Bioquímica Aplicada', 1, 6, NOW()),
('Laboratório de Química', 1, 6, NOW()),
('Metodologia do Ensino de Química', 1, 6, NOW()),
('Química Ambiental', 1, 6, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Tecnologia em Alimentos - ID 7
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Tecnologia de Processamento', 1, 7, NOW()),
('Análise de Alimentos', 1, 7, NOW()),
('Microbiologia de Alimentos', 1, 7, NOW()),
('Embalagens e Conservação', 1, 7, NOW()),
('Nutrição e Dietética', 1, 7, NOW()),
('Controle de Qualidade', 1, 7, NOW()),
('Legislação Alimentícia', 1, 7, NOW()),
('Gestão da Produção', 1, 7, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Análise e Desenvolvimento de Sistemas - ID 8
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Programação Web', 1, 8, NOW()),
('Banco de Dados Avançado', 1, 8, NOW()),
('Análise de Sistemas', 1, 8, NOW()),
('Programação Mobile', 1, 8, NOW()),
('Testes de Software', 1, 8, NOW()),
('DevOps e CI/CD', 1, 8, NOW()),
('Cloud Computing', 1, 8, NOW()),
('Inteligência Artificial Básica', 1, 8, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Construção de Edifícios - ID 9
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Projeto Arquitetônico', 1, 9, NOW()),
('Estruturas Metálicas', 1, 9, NOW()),
('Acabamentos e Revestimentos', 1, 9, NOW()),
('Instalações Elétricas', 1, 9, NOW()),
('Projeto Hidrossanitário', 1, 9, NOW()),
('Planejamento de Obras', 1, 9, NOW()),
('Fiscalização de Obras', 1, 9, NOW()),
('Patologia das Construções', 1, 9, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Processos Químicos - ID 10
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Operações Unitárias', 1, 10, NOW()),
('Química Industrial', 1, 10, NOW()),
('Tratamento de Efluentes', 1, 10, NOW()),
('Controle de Processos', 1, 10, NOW()),
('Segurança Química', 1, 10, NOW()),
('Instrumentação Industrial', 1, 10, NOW()),
('Polímeros e Plásticos', 1, 10, NOW()),
('Gestão Ambiental Industrial', 1, 10, NOW());

-- ============================================================
-- DISCIPLINAS DO CURSO: Produção Publicitária - ID 11
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Criação Publicitária', 1, 11, NOW()),
('Mídias Digitais', 1, 11, NOW()),
('Design Gráfico', 1, 11, NOW()),
('Fotografia Publicitária', 1, 11, NOW()),
('Redação Publicitária', 1, 11, NOW()),
('Planejamento de Mídia', 1, 11, NOW()),
('Produção Audiovisual', 1, 11, NOW()),
('Branding e Identidade Visual', 1, 11, NOW());

-- ============================================================
-- DISCIPLINAS GENÉRICAS (curso_id = NULL) - BASE COMUM
-- Aplicáveis a todos os cursos do SAPEE
-- ============================================================

INSERT INTO disciplinas (nome, ativa, curso_id, criado_at) VALUES
('Língua Portuguesa', 1, NULL, NOW()),
('Matemática Básica', 1, NULL, NOW()),
('Inglês Instrumental', 1, NULL, NOW()),
('Metodologia Científica', 1, NULL, NOW()),
('Ética Profissional', 1, NULL, NOW()),
('Libras', 1, NULL, NOW()),
('Educação Física', 1, NULL, NOW()),
('Projeto de Vida', 1, NULL, NOW()),
('Educação Ambiental', 1, NULL, NOW()),
('Filosofia', 1, NULL, NOW()),
('Sociologia', 1, NULL, NOW()),
('Literatura Brasileira', 1, NULL, NOW()),
('Redação Técnica', 1, NULL, NOW()),
('Informática Básica', 1, NULL, NOW()),
('Educação a Distância', 1, NULL, NOW()),
('Interpretação de Texto', 1, NULL, NOW());

-- ============================================================
-- VERIFICAÇÃO: Listar todas as disciplinas inseridas
-- ============================================================

-- SELECT d.id, d.nome, c.nome as curso, d.ativa 
-- FROM disciplinas d 
-- LEFT JOIN cursos c ON d.curso_id = c.id 
-- ORDER BY c.nome, d.nome;

-- ============================================================
-- ESTATÍSTICAS (execute para conferência)
-- ============================================================

-- Total de disciplinas cadastradas:
-- SELECT COUNT(*) as total FROM disciplinas;

-- Disciplinas por curso:
-- SELECT c.nome as curso, COUNT(d.id) as qtd_disciplinas
-- FROM cursos c
-- LEFT JOIN disciplinas d ON c.id = d.curso_id
-- GROUP BY c.nome
-- ORDER BY qtd_disciplinas DESC;

-- Disciplinas genéricas (sem curso específico):
-- SELECT COUNT(*) as disciplinas_genericas FROM disciplinas WHERE curso_id IS NULL;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
