# SAPEE - Sistema de Alerta de Predição de Evasão Escolar

## Visão Geral

SAPEE é uma plataforma web full-stack para predição de evasão escolar usando Machine Learning. O sistema analisa dados acadêmicos, socioeconômicos, de deslocamento, infraestrutura e psicossociais para calcular um score de risco individualizado por aluno e recomendar intervenções pedagógicas preventivas.

**Cliente:** instituição privada de ensino superior de Manaus (nome anonimizado)
**Autor:** vinculado ao Instituto Federal do Norte (IFN)
**Status:** TCC2 concluído, sistema funcional e validado

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend | Python + FastAPI | 3.12 / 0.109+ |
| Frontend | React + TypeScript + Vite | 19 / 5.8 / 6 |
| Banco | MySQL + SQLAlchemy ORM | 8.0 / 2.0 |
| ML | Scikit-learn + Pandas + NumPy | 1.4 |
| Estilo | TailwindCSS | 4 |
| Gráficos | Recharts | 3 |
| Infra | Docker Compose, Railway, Vercel | - |

---

## Estrutura de Diretórios

```
sapee/
├── backend/                  # Python FastAPI
│   ├── main.py               # Entry point, CORS, middleware
│   ├── models.py             # SQLAlchemy ORM (1151 linhas, 20+ tabelas)
│   ├── schemas.py            # Pydantic schemas
│   ├── database.py           # Conexão DB + SessionLocal
│   ├── auth.py               # JWT + RBAC (ADMIN, COORDENADOR, PEDAGOGO, DIRETOR)
│   ├── ml_logic_v2.py        # Algoritmo de predição v2 (41 KB)
│   ├── email_utils.py        # Envio de email SMTP (Gmail)
│   ├── notificacoes.py       # Notificações Telegram
│   ├── servico_comunicacao.py # Serviço unificado de comunicação (Email/WhatsApp/Telegram)
│   ├── logging_config.py     # Logging estruturado
│   ├── limiter.py            # Rate limiting (slowapi)
│   ├── requirements.txt      # Dependências Python
│   ├── routes/               # Rotas da API
│   │   ├── acoes_massa.py    # Importação CSV + delete múltiplo (com progresso async)
│   │   ├── alunos.py         # CRUD alunos
│   │   ├── auth.py           # Autenticação
│   │   ├── dashboard.py      # Estatísticas do dashboard
│   │   ├── predicoes.py      # Geração de predições
│   │   ├── metricas.py       # Validação do modelo (matriz confusão)
│   │   ├── intervencoes.py   # Intervenções pedagógicas
│   │   ├── questionario.py   # Questionário psicossocial
│   │   ├── comunicacoes.py   # Registro de comunicações
│   │   ├── atendimentos.py   # Atendimentos
│   │   ├── frequencia.py     # Frequência mensal
│   │   ├── faltas.py         # Faltas diárias e consecutivas
│   │   ├── notas.py          # Notas por disciplina
│   │   ├── cursos.py         # Gestão de cursos
│   │   ├── disciplinas.py    # Gestão de disciplinas
│   │   ├── relatorios.py     # Relatórios gerenciais
│   │   ├── egressos.py       # Gestão de egressos
│   │   ├── planos_acao.py    # Planos de ação
│   │   ├── configuracoes.py  # Configurações do sistema
│   │   ├── usuarios.py       # Gestão de usuários
│   │   ├── audit_logs.py     # Logs de auditoria
│   │   ├── analytics.py      # Analytics
│   │   └── health.py         # Health check
│   └── seed_*.py             # Scripts de seed de dados
├── src/                      # React TypeScript frontend
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Rotas + providers
│   ├── pages/                # 32 páginas
│   │   ├── Dashboard.tsx
│   │   ├── Alunos.tsx, AlunoDetail.tsx, CadastroAlunos.tsx
│   │   ├── ImportarDados.tsx  # Importação CSV com barra de progresso
│   │   ├── ValidacaoModelo.tsx # Matriz de confusão + métricas
│   │   ├── Intervencoes.tsx
│   │   ├── QuestionarioPsicossocial.tsx, QuestionarioPublico.tsx
│   │   ├── Egressos.tsx
│   │   ├── Cursos.tsx, Disciplinas.tsx
│   │   ├── LancarFaltas.tsx, LancarFrequencia.tsx, NotasDisciplina.tsx
│   │   ├── PlanosAcao.tsx
│   │   ├── Atendimentos.tsx
│   │   ├── CentralComunicacoes.tsx
│   │   ├── CentralRelatorios.tsx, RelatoriosGerenciais.tsx
│   │   ├── AlertasFaltas.tsx, AlunosEmRisco.tsx, AlunosMonitoramento.tsx
│   │   ├── Usuarios.tsx, Perfil.tsx, Login.tsx
│   │   ├── Configuracoes.tsx, AuditLogs.tsx
│   │   ├── GestaoTokens.tsx, IndicadoresEficacia.tsx
│   │   └── RelatorioEficacia.tsx
│   ├── components/           # Componentes reutilizáveis
│   │   ├── Layout.tsx        # Sidebar + header
│   │   ├── ProtectedRoute.tsx # Guard de autenticação
│   │   ├── CanAccess.tsx     # Guard de autorização RBAC
│   │   ├── ErrorBoundary.tsx
│   │   ├── ResponsiveTable.tsx
│   │   └── ui/               # Componentes UI (Toast, Modal, Badges, Skeleton)
│   ├── services/             # API clients
│   │   ├── api.ts            # Cliente principal (1778 linhas)
│   │   ├── axios.ts          # Axios com interceptors
│   │   ├── AuthContext.tsx   # Contexto de autenticação
│   │   └── api/              # API modular (por domínio)
│   ├── hooks/                # Custom hooks
│   ├── types/                # TypeScript types
│   └── utils/                # Funções utilitárias
├── docs/
│   ├── TCC1/                 # Documentos do TCC1
│   └── TCC2/                 # Documentos do TCC2 (10 capítulos + Word gerado)
├── scripts/                  # Scripts SQL de migração
├── docker-compose.yml        # MySQL + backend + frontend
├── Dockerfile                # Build multi-stage frontend
├── vite.config.ts            # Config Vite + proxy API
├── vercel.json               # Deploy Vercel
└── test_data_import.csv      # CSV com 2700 alunos para importação
```

---

## Banco de Dados (20+ tabelas)

### Tabelas principais:
| Tabela | Descrição | Registros atuais |
|--------|-----------|-----------------|
| `alunos` | Estudantes (37+ colunas) | 2.700 |
| `cursos` | Cursos de graduação | 19 |
| `predicoes` | Predições de risco por aluno | 2.700 |
| `frequencia_mensal` | Frequência mensal por aluno | 2.700 |
| `disciplinas` | Disciplinas por curso | 95 |
| `notas_disciplina` | Notas por aluno/disciplina/bimestre | 4.848 |
| `registro_faltas_diarias` | Faltas diárias por aluno | 8.885 |
| `intervencoes` | Intervenções pedagógicas | 3.300 |
| `planos_acao` | Planos de ação por curso/nível | 76 |
| `atendimentos` | Registros de atendimento | 500 |
| `comunicacoes` | Registros de comunicação | 300 |
| `egressos` | Alunos que saíram (evadidos/concluintes) | 260 |
| `questionario_psicossocial` | Respostas do questionário | 0 |
| `usuarios` | Usuários do sistema | 1 (admin) |
| `roles` | Perfis de acesso | 4 |
| `audit_logs` | Logs de auditoria | - |
| `tokens_questionario` | Tokens para questionário público | 0 |

### Cursos (19 cursos SUPERIOR):
Administração, Ciências Contábeis, Direito, Enfermagem, Fisioterapia, Farmácia, Educação Física, Estética e Cosmética, Nutrição, Medicina Veterinária, Psicologia, Pedagogia, Análise e Desenvolvimento de Sistemas, Logística, Marketing, Gestão de Recursos Humanos, Gestão Financeira, Processos Gerenciais, Serviço Social

### Credenciais padrão:
- **Email:** admin@dewas.com.br
- **Senha:** admin123

---

## Módulos do Sistema

### 1. Dashboard
- Cards: Total de Alunos, Muito Alto Risco, Risco Alto, Risco Médio, Risco Baixo
- Intervenções: ativas, pendentes, urgentes, taxa de conclusão
- Alertas de Faltas: pendentes, 3/5/10 faltas consecutivas
- Gráficos: Distribuição de Risco (pizza), Risco por Curso (barras empilhadas)
- Top 5 Alunos em Risco Crítico com scores

### 2. Gestão de Alunos
- Listagem com filtros (curso, nível de risco, busca)
- CRUD completo (27+ campos por aluno)
- Detalhes do aluno: dados pessoais, predição, frequência, intervenções, notas
- Edição rápida via modal
- Exclusão em massa (multi-select)
- Timeline da jornada do aluno

### 3. Importação de Dados (CSV)
- Template CSV com 37 colunas (delimitador `;` para Excel)
- Upload com drag-and-drop
- Preview com validação local (matrícula, nome, curso, média, frequência)
- Barra de progresso em tempo real (polling a cada 1.5s)
- Processamento assíncrono em background thread
- Geração automática de frequência mensal + predição por aluno
- Tratamento de duplicatas (skip)
- Auto-detecção de delimitador (`,` ou `;`)
- Suporte a BOM UTF-8

### 4. Predição de Risco (ml_logic_v2.py)
- 5 dimensões de fatores com pesos ponderados:
  - Acadêmicos: 50% (frequência, média, reprovações, coeficiente)
  - Socioeconômicos: 25% (renda, trabalho)
  - Deslocamento: 10% (tempo, custo, dificuldade)
  - Infraestrutura: 5% (computador, internet)
  - Vulnerabilidade: 5% (bolsa família, 1ª geração universitária)
- Tendência temporal (queda de frequência/média nos últimos meses)
- Combinações perigosas com multiplicadores (ex: trabalha + baixa frequência = ×2.0)
- Classificação: BAIXO (0-30), MÉDIO (31-60), ALTO (61-85), MUITO_ALTO (86-100)
- Explicabilidade: descrição em linguagem natural dos fatores de risco
- Recomendações automáticas de intervenção

### 5. Validação do Modelo
- Matriz de confusão: VP, VN, FP, FN
- Métricas: Acurácia, Precisão, Recall, F1-Score
- Detalhamento por nível de risco
- Análise por coorte (ano de ingresso)
- Lista de falsos negativos (alunos que evadiram sem alerta)
- Endpoint: GET /metricas/validacao-modelo
- Dados atuais (260 egressos): VP=88, VN=78, FP=21, FN=38
- Métricas atuais: Acurácia 73.8%, Precisão 80.7%, Recall 69.8%, F1 74.9%

### 6. Intervenções Pedagógicas
- Tipos: Aconselhamento, Monitoria, Suporte Psicológico, Auxílio Financeiro, etc.
- Status: Rascunho, Pendente, Em Andamento, Concluída, Cancelada
- Prioridade: Baixa, Média, Alta, Urgente
- Datas: intervenção, conclusão, limite, aprovação, rejeição
- Auto-geração por risco ou criação manual

### 7. Questionário Psicossocial
- 5 dimensões, 25 questões Likert (1-5)
- Acesso público via token (sem login)
- Envio de tokens por email (HTML + texto puro)
- Integração com score de risco (fator psicossocial)
- Dashboard de respostas agregadas
- Termo de consentimento integrado

### 8. Frequência e Faltas
- Frequência mensal por aluno (presença %, total de aulas, faltas justificadas/não)
- Registro de faltas diárias por disciplina
- Alertas de faltas consecutivas (3, 5, 10 faltas)
- Histórico de evolução da frequência (gráfico)

### 9. Notas por Disciplina
- Registro por aluno, disciplina, período letivo, bimestre
- Nota (0-10), faltas na disciplina, situação (aprovado/reprovado/cursando)
- Resumo de notas por aluno

### 10. Planos de Ação
- 1 plano por curso por nível de risco (76 total)
- Metas: frequência mínima, média mínima, prazo em dias
- Ações recomendadas (JSON array)
- Ativação/desativação

### 11. Atendimentos
- Tipos: Psicológico, Social, Disciplinar, Acadêmico, Saúde, Encaminhamento Externo
- Status: Agendado, Realizado, Cancelado, Em Andamento, Concluído
- Encaminhamentos com status e tipo
- Follow-up com data do próximo atendimento

### 12. Comunicações
- Canais: Sistema, Email, WhatsApp, Telegram
- Tipos: Faltas, Risco, Atendimento, Lembrete, Manual, Encaminhamento
- Templates de mensagem personalizáveis
- Status de envio: Pendente, Enviada, Entregue, Lida, Falha
- Registro de data/hora de envio, leitura e resposta

### 13. Egressos
- Registro de alunos que saíram (abandono, conclusão, transferência, jubilamento)
- Motivo detalhado do abandono (financeiro, trabalho, saúde, acadêmico, etc.)
- Indicador se tinha predição de risco no SAPEE
- Nível de risco predito no momento da saída
- Indicador se recebeu intervenção
- Essencial para validação do modelo

### 14. Relatórios Gerenciais
- Alunos em risco por nível e curso
- Indicadores de eficácia do sistema
- Relatório de alunos recuperados
- Exportação de dados

### 15. Gestão de Usuários
- 4 roles: ADMIN, COORDENADOR, PEDAGOGO, DIRETOR
- ADMIN: acesso total
- COORDENADOR: restrito ao seu curso
- PEDAGOGO: foco em intervenções/atendimentos
- DIRETOR: visão consultiva (read-only)

---

## API Endpoints (85+)

### Autenticação
- `POST /auth/login` - Login (email + senha) → JWT access + refresh token
- `GET /auth/me` - Dados do usuário logado
- `POST /auth/refresh` - Renovar token

### Alunos
- `GET /alunos` - Listar com filtros (skip, limit, curso_id, nivel_risco)
- `GET /alunos/buscar` - Buscar por nome/matrícula
- `GET /alunos/{matricula}` - Detalhes do aluno
- `POST /alunos` - Criar aluno
- `PUT /alunos/{matricula}` - Atualizar aluno
- `DELETE /alunos/{matricula}` - Excluir aluno
- `POST /alunos/delete-multiple` - Excluir em massa
- `POST /alunos/importar-csv` - Importar CSV (async com progresso)
- `GET /alunos/importar-csv/progress/{job_id}` - Progresso da importação
- `GET /alunos/em-risco` - Alunos em risco sem intervenção
- `GET /alunos/monitoramento` - Alunos em monitoramento preventivo

### Predições
- `POST /predicoes/gerar` - Gerar predições para todos sem predição
- `GET /predicoes/resumo` - Resumo de predições

### Dashboard
- `GET /dashboard/stats` - Estatísticas gerais
- `GET /dashboard/intervencoes-stats` - Estatísticas de intervenções

### Métricas / Validação
- `GET /metricas/validacao-modelo` - Validação completa (matriz, métricas, coortes, falsos negativos)

### Demais módulos
- `/intervencoes` - CRUD intervenções
- `/questionario` - Questionário (admin + público)
- `/frequencia`, `/faltas` - Frequência e faltas
- `/notas` - Notas por disciplina
- `/cursos`, `/disciplinas` - Gestão acadêmica
- `/atendimentos` - Atendimentos
- `/comunicacoes` - Comunicações
- `/planos-acao` - Planos de ação
- `/egressos` - Egressos
- `/relatorios` - Relatórios
- `/usuarios` - Gestão de usuários
- `/audit-logs` - Logs de auditoria
- `/configuracoes` - Configurações do sistema
- `/health` - Health check

---

## Estado Atual dos Dados

| Entidade | Quantidade |
|----------|-----------|
| Alunos | 2.700 |
| Cursos | 19 (graduação) |
| Disciplinas | 95 (5 por curso) |
| Predições | 2.700 |
| Frequência Mensal | 2.700 |
| Notas | 4.848 |
| Faltas Diárias | 8.885 |
| Intervenções | 3.300 |
| Planos de Ação | 76 (19 × 4 níveis) |
| Atendimentos | 500 |
| Comunicações | 300 |
| Egressos | 260 (126 evadidos, 97 concluintes, 37 outros) |

### Distribuição dos alunos:
- Turnos: MATUTINO 42%, VESPERTINO 24%, NOTURNO 34%
- Anos de ingresso: 2019 a 2025
- ~142 alunos por curso

---

## Fluxo de Importação CSV

1. Frontend: usuário faz upload do CSV (delimitador `;` para Excel)
2. Frontend: parse local, validação de campos obrigatórios, preview em tabela
3. Frontend: envia arquivo via `POST /alunos/importar-csv` (multipart/form-data)
4. Backend: valida MIME type, extensão, tamanho (<10MB), conteúdo (não HTML)
5. Backend: detecta delimitador, faz parse com BOM UTF-8
6. Backend: retorna `job_id` imediatamente, inicia thread background
7. Backend (thread): para cada linha:
   - Busca curso por nome (ilike, case/accent insensitive)
   - Valida campos obrigatórios
   - Verifica duplicata de matrícula
   - Cria aluno, frequência mensal, predição
   - Commit por linha (erro em uma não afeta as outras)
8. Frontend: poll a cada 1.5s em `GET /alunos/importar-csv/progress/{job_id}`
9. Frontend: barra de progresso com % concluído, importados, erros, predições
10. Ao concluir: toast com sumário, navegação para dashboard

---

## Como Executar

### Backend
```powershell
cd backend
# Criar/ativar venv (Python 3.12+)
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Configurar .env (copiar de .env.example e preencher DATABASE_URL)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --no-proxy-headers
```

> `--no-proxy-headers` evita que o rate limit seja burlado com `X-Forwarded-For` forjado em ambiente local.
> Atrás de um proxy reverso confiável (produção), use `--proxy-headers --forwarded-allow-ips=<IP_DO_PROXY>`.

### Frontend
```powershell
npm install
npm run dev    # Porta 3000, proxy para backend na 8000
```

### Docker
```bash
docker compose up -d   # MySQL + backend + frontend
```

### Ordem de Seed (após banco limpo):
```powershell
cd backend
python scripts/reset_cursos.py              # Limpa e cria 19 cursos SUPERIOR
# Importar CSV via frontend (2700 alunos)
python scripts/seed_egressos_validacao.py   # Gera 260 egressos
python scripts/seed_modulos_completo.py     # Disciplinas, notas, faltas, intervenções, etc.
# Opcional: executar um SQL de migrations_sql/ (ex.: seed_validacao_modelo.sql)
python scripts/run_seed.py seed_validacao_modelo.sql
```

> Scripts utilitários ficam em `backend/scripts/` (executar a partir de `backend/`).
> Os módulos da aplicação permanecem na raiz de `backend/`.

---

## Problemas Conhecidos e Soluções

### 1. Importação CSV trava em duplicata
- **Causa:** matrícula já existe no banco
- **Solução:** backend agora faz commit por linha com rollback isolado. Duplicatas são puladas.

### 2. Barra de progresso não aparece
- **Causa:** backend não foi reiniciado após atualização do código
- **Solução:** parar e reiniciar `uvicorn`

### 3. Erro "Data truncated for column 'zona_residencial'"
- **Causa:** CSV usa valor de ENUM inválido
- **Solução:** usar apenas valores do ENUM: ZONA_NORTE, ZONA_SUL, ZONA_LESTE, ZONA_OESTE, CENTRO, INTERIOR

### 4. Erro "Data truncated for column 'nivel_risco'"
- **Causa:** ENUM do MySQL na tabela `planos_acao` não tem MUITO_ALTO
- **Solução:** mapear MUITO_ALTO → ALTO ao inserir planos de ação

### 5. Erro "Duplicate entry for key 'disciplinas.ix_disciplinas_nome'"
- **Causa:** nome de disciplina repetido em cursos diferentes (ex: "Anatomia Humana")
- **Solução:** script de seed faz flush por curso e verifica duplicatas

### 6. Encoding errors com emojis no terminal Windows
- **Causa:** terminal usa cp1252, emojis são UTF-8
- **Solução:** usar apenas caracteres ASCII nos scripts de seed

### 7. PermissionError ao gerar TCC2 Word
- **Causa:** arquivo .docx está aberto no Word
- **Solução:** fechar o Word antes de rodar `gerar_tcc2_word.py`

---

## Convenções de Código

- **Backend:** Python 3.12+, type hints, Black (line-length 100), Ruff linter
- **Frontend:** TypeScript strict, ESLint, Prettier (single quotes, tab 2, printWidth 100)
- **Commits:** mensagens em português, semânticos
- **Branch:** main (única)
- **Variáveis de ambiente:** `.env` NUNCA commitado, `.env.example` como template

---

## TCC2 - Documento Acadêmico

- **Local:** `docs/TCC2/`
- **Formato:** Markdown → Word (via `gerar_tcc2_word.py` com python-docx)
- **Estrutura:** Pré-textuais + 8 capítulos + Referências (72 refs ABNT)
- **Páginas:** ~119 em Times New Roman 12, espaçamento 1.5, margens ABNT
- **Instituição do autor:** Instituto Federal do Norte (IFN)
- **Instituição cliente:** "instituição privada de ensino superior de Manaus" (nome anonimizado)

### Capítulos:
1. Introdução (contexto, problema, 12 objetivos)
2. Fundamentação Teórica (Tinto, Bean, Cabrera, EWS, ML, LGPD)
3. Trabalhos Relacionados
4. Desenvolvimento do Sistema (metodologia, requisitos, UML, arquitetura)
5. Implementação (backend, algoritmo v2, frontend, segurança)
6. Resultados e Validação (2700 alunos, 260 egressos, métricas reais)
7. Discussão
8. Considerações Finais

---

## Métricas de Validação do Modelo

| Métrica | Valor |
|---------|-------|
| Egressos analisados | 260 |
| Evadidos (ABANDONO + JUBILAMENTO) | 126 |
| Concluintes | 97 |
| Verdadeiros Positivos (VP) | 88 |
| Verdadeiros Negativos (VN) | 78 |
| Falsos Positivos (FP) | 21 |
| Falsos Negativos (FN) | 38 |
| **Acurácia** | **73.8%** |
| **Precisão** | **80.7%** |
| **Recall** | **69.8%** |
| **F1-Score** | **74.9%** |

---

## Autenticação e Segurança

- **JWT:** access token (480min) + refresh token (7 dias)
- **RBAC:** 4 roles com permissões granulares
- **Rate limiting:** 5 req/min em endpoints críticos (slowapi)
- **CORS:** origens configuradas por ambiente
- **Senhas:** hash bcrypt via passlib
- **Auditoria:** todas as operações registradas em audit_logs
- **LGPD:** dados anonimizados, consentimento para questionário
