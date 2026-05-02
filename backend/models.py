from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Enum, DateTime, Text, Date, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import database
import enum

# Base para models
Base = database.Base

# ============================================
# ENUMS
# ============================================

class NivelRisco(str, enum.Enum):
    BAIXO = "BAIXO"
    MEDIO = "MEDIO"
    ALTO = "ALTO"
    MUITO_ALTO = "MUITO_ALTO"

class StatusIntervencao(str, enum.Enum):
    RASCUNHO = "RASCUNHO"  # Sugestão automática pendente de aprovação
    PENDENTE = "PENDENTE"
    EM_ANDAMENTO = "EM_ANDAMENTO"
    CONCLUIDA = "CONCLUIDA"
    CANCELADA = "CANCELADA"

class Modalidade(str, enum.Enum):
    INTEGRADO = "Integrado"
    SUBSEQUENTE = "Subsequente"
    SUPERIOR = "Superior"
    POS_GRADUACAO = "Pós-Graduação"

class Turno(str, enum.Enum):
    MATUTINO = "MATUTINO"
    VESPERTINO = "VESPERTINO"
    NOTURNO = "NOTURNO"

class ZonaResidencial(str, enum.Enum):
    ZONA_NORTE = "ZONA_NORTE"
    ZONA_SUL = "ZONA_SUL"
    ZONA_LESTE = "ZONA_LESTE"
    ZONA_OESTE = "ZONA_OESTE"
    CENTRO = "CENTRO"
    INTERIOR = "INTERIOR"

class DificuldadeAcesso(str, enum.Enum):
    FACIL = "FACIL"
    MEDIA = "MEDIA"
    DIFICIL = "DIFICIL"
    MUITO_DIFICIL = "MUITO_DIFICIL"

class Sexo(str, enum.Enum):
    M = "M"
    F = "F"
    O = "O"

class PrioridadePlano(str, enum.Enum):
    BAIXA = "BAIXA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    URGENTE = "URGENTE"

# ============================================
# MODELS
# ============================================

class Role(Base):
    """Perfis de acesso ao sistema"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(50), unique=True, nullable=False, index=True)
    descricao = Column(Text)
    permissoes = Column(Text)  # JSON como string
    criado_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    usuarios = relationship("Usuario", back_populates="role")

class Curso(Base):
    """Catálogo de cursos"""
    __tablename__ = "cursos"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False, index=True)
    modalidade = Column(String(50), default="INTEGRADO")  # Usar String para compatibilidade
    coordenador_id = Column(Integer, ForeignKey("usuarios.id"))
    criado_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    alunos = relationship("Aluno", back_populates="curso")
    coordenador = relationship("Usuario", foreign_keys=[coordenador_id])

class Usuario(Base):
    """Usuários do sistema"""
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    senha = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    curso_id = Column(Integer, ForeignKey("cursos.id"))
    ativo = Column(Boolean, default=True)
    ultimo_acesso = Column(DateTime(timezone=True))
    criado_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="usuarios")
    curso = relationship("Curso", foreign_keys=[curso_id])
    intervencoes = relationship("Intervencao", back_populates="usuario")
    audit_logs = relationship("AuditLog", back_populates="usuario")

class Aluno(Base):
    """Dados completos dos alunos (27+ campos)"""
    __tablename__ = "alunos"
    
    # Identificação Básica
    matricula = Column(String(20), primary_key=True, index=True)
    nome = Column(String(100), nullable=False, index=True)
    email = Column(String(100))
    telefone = Column(String(20))
    data_nascimento = Column(Date)
    idade = Column(Integer)
    sexo = Column(Enum(Sexo))
    
    # Dados Acadêmicos
    curso_id = Column(Integer, ForeignKey("cursos.id"))
    periodo = Column(Integer)
    turno = Column(Enum(Turno))
    media_geral = Column(DECIMAL(4,2))
    frequencia = Column(DECIMAL(5,2))
    historico_reprovas = Column(Integer, default=0)
    coeficiente_rendimento = Column(DECIMAL(4,2))
    ano_ingresso = Column(Integer)
    
    # Endereço Completo
    cidade = Column(String(100))
    cep = Column(String(10))
    logradouro = Column(String(200))
    numero = Column(String(20))
    complemento = Column(String(50))
    bairro = Column(String(100))
    zona_residencial = Column(Enum(ZonaResidencial))
    
    # Dados Socioeconômicos
    renda_familiar = Column(DECIMAL(10,2))
    renda_per_capita = Column(DECIMAL(10,2))
    possui_auxilio = Column(Boolean, default=False)
    tipo_auxilio = Column(Text)  # JSON como string
    
    # Situação de Trabalho
    trabalha = Column(Boolean, default=False)
    carga_horaria_trabalho = Column(Integer)
    
    # Deslocamento e Transporte
    tempo_deslocamento = Column(Integer)
    custo_transporte_diario = Column(DECIMAL(10,2))
    dificuldade_acesso = Column(Enum(DificuldadeAcesso))
    transporte_utilizado = Column(String(50))
    usa_transporte_alternativo = Column(Boolean, default=False)
    
    # Infraestrutura e Tecnologia
    possui_computador = Column(Boolean, default=False)
    possui_internet = Column(Boolean, default=False)
    
    # Vulnerabilidade Social
    beneficiario_bolsa_familia = Column(Boolean, default=False)
    primeiro_geracao_universidade = Column(Boolean, default=False)

    # Dados dos Responsáveis
    nome_responsavel_1 = Column(String(100), nullable=True, comment="Nome do 1º Responsável")
    parentesco_responsavel_1 = Column(String(50), nullable=True, comment="Parentesco do 1º Responsável")
    telefone_responsavel_1 = Column(String(20), nullable=True, comment="Telefone do 1º Responsável")
    email_responsavel_1 = Column(String(100), nullable=True, comment="E-mail do 1º Responsável")
    nome_responsavel_2 = Column(String(100), nullable=True, comment="Nome do 2º Responsável")
    parentesco_responsavel_2 = Column(String(50), nullable=True, comment="Parentesco do 2º Responsável")
    telefone_responsavel_2 = Column(String(20), nullable=True, comment="Telefone do 2º Responsável")

    # Questionário Psicossocial
    questionario_respondido = Column(Boolean, default=False)
    data_ultimo_questionario = Column(DateTime(timezone=True))

    # Relationships
    curso = relationship("Curso", back_populates="alunos")
    predicoes = relationship("Predicao", back_populates="aluno", cascade="all, delete-orphan")
    frequencias = relationship("FrequenciaMensal", back_populates="aluno", cascade="all, delete-orphan")
    intervencoes = relationship("Intervencao", back_populates="aluno", cascade="all, delete-orphan")

class Predicao(Base):
    """Predições de risco de evasão"""
    __tablename__ = "predicoes"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    risco_evasao = Column(DECIMAL(5,2), nullable=False)
    nivel_risco = Column(Enum(NivelRisco), nullable=False, index=True)
    fatores_principais = Column(Text)
    modelo_ml_versao = Column(String(20), default="1.0.0")
    data_predicao = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    aluno = relationship("Aluno", back_populates="predicoes")

class PredicaoHistorico(Base):
    """
    Histórico de predições para medir eficácia do Fallback/ML.

    Quando um aluno se torna egresso, esta tabela registra:
    - Qual era a predição quando ativo
    - Se a predição 'acertou' (aluno realmente evadiu)
    - Tipo de erro (falso positivo, falso negativo)
    """
    __tablename__ = "predicao_historico"

    id = Column(Integer, primary_key=True, index=True)
    aluno_matricula = Column(String(20), nullable=False, index=True)
    predicao_id = Column(Integer, nullable=False, index=True)
    risco_evasao = Column(DECIMAL(5,2), nullable=False)
    nivel_risco = Column(String(20), nullable=False)
    fatores_principais = Column(Text)
    modelo_ml_versao = Column(String(20))
    data_predicao = Column(DateTime, nullable=False)

    # Campos preenchidos quando aluno vira egresso
    aluno_evasao = Column(Boolean, default=None, index=True, comment="True se aluno evadiu (abandono)")
    data_evasao = Column(DateTime, default=None, comment="Data que foi registrado como egresso")
    motivo_saida = Column(String(50), default=None, comment="Motivo da saída")

    # Métricas de eficácia
    predicao_correta = Column(Boolean, default=None, index=True, comment="True se predição condizia com resultado")
    tipo_erro = Column(String(50), default=None, comment="FALSO_POSITIVO, FALSO_NEGATIVO, VERDADEIRO_POSITIVO, VERDADEIRO_NEGATIVO")

    # Metadados
    data_registro = Column(DateTime, server_default=func.now())

class FrequenciaMensal(Base):
    """Registro mensal de frequência dos alunos"""
    __tablename__ = "frequencia_mensal"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    mes = Column(Integer, nullable=False, comment='1-12')
    ano = Column(Integer, nullable=False)
    frequencia = Column(DECIMAL(5,2), nullable=False, comment='0-100%')
    faltas_justificadas = Column(Integer, default=0)
    faltas_nao_justificadas = Column(Integer, default=0)
    total_aulas_mes = Column(Integer, nullable=False)
    observacoes = Column(Text)
    data_registro = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    aluno = relationship("Aluno", back_populates="frequencias")

class Intervencao(Base):
    """Ações pedagógicas de intervenção"""
    __tablename__ = "intervencoes"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)  # NULL para rascunhos automáticos
    data_intervencao = Column(Date, nullable=False, index=True)
    tipo = Column(String(100), nullable=False)
    descricao = Column(Text)
    status = Column(Enum(StatusIntervencao), default=StatusIntervencao.PENDENTE, index=True)
    prioridade = Column(Enum('BAIXA', 'MEDIA', 'ALTA', 'URGENTE', name='prioridade_enum'), default='MEDIA')
    data_conclusao = Column(Date)
    data_limite = Column(Date, comment="Data de vencimento do ciclo de intervenção (6 meses)")
    observacoes = Column(Text)
    
    # Campos para sugestões automáticas
    auto_gerada = Column(Boolean, default=False, index=True, comment="True se foi gerada automaticamente pelo sistema")
    motivo_risco = Column(Text, comment="JSON com fatores que geraram a sugestão")
    data_aprovacao = Column(Date, comment="Data que foi aprovada pelo coordenador")
    data_rejeicao = Column(Date, comment="Data que foi rejeitada")
    motivo_rejeicao = Column(Text, comment="Motivo da rejeição")
    
    criado_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    aluno = relationship("Aluno", back_populates="intervencoes")
    usuario = relationship("Usuario", back_populates="intervencoes")

class AuditLog(Base):
    """Logs de auditoria do sistema"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    acao = Column(String(100), nullable=False, index=True)
    detalhes = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    session_id = Column(String(100))
    criado_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    usuario = relationship("Usuario", back_populates="audit_logs")

class PlanosAcao(Base):
    """Planos de ação padronizados por curso e nível de risco"""
    __tablename__ = "planos_acao"

    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)
    nivel_risco = Column(Enum(NivelRisco), nullable=False)
    meta_frequencia_minima = Column(DECIMAL(5,2), default=75.0)  # 75%
    meta_media_minima = Column(DECIMAL(4,2), default=6.0)  # 6.0
    prazo_dias = Column(Integer, default=30)  # 30 dias
    acoes_recomendadas = Column(Text)  # JSON array de ações
    observacoes = Column(Text)
    ativo = Column(Boolean, default=True)
    criado_at = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    curso = relationship("Curso", back_populates="planos_acao")


class MetasSemestrais(Base):
    """Metas semestrais por curso"""
    __tablename__ = "metas_semestrais"

    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)
    semestre = Column(String(10), nullable=False)  # Ex: "2026-1", "2026-2"
    meta_frequencia_geral = Column(DECIMAL(5,2), default=80.0)
    meta_media_geral = Column(DECIMAL(4,2), default=7.0)
    meta_reducao_evasao = Column(DECIMAL(5,2), default=10.0)  # Reduzir evasão em 10%
    meta_recuperacao = Column(DECIMAL(5,2), default=50.0)  # Recuperar 50% dos alunos em risco
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)
    status = Column(Enum('ATIVA', 'CONCLUIDA', 'CANCELADA'), default='ATIVA')
    observacoes = Column(Text)
    criado_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    curso = relationship("Curso", back_populates="metas_semestrais")


class AlunoMeta(Base):
    """Metas individuais por aluno"""
    __tablename__ = "aluno_metas"

    id = Column(Integer, primary_key=True, index=True)
    aluno_matricula = Column(String(20), ForeignKey("alunos.matricula"), nullable=False)
    plano_acao_id = Column(Integer, ForeignKey("planos_acao.id"))
    meta_frequencia = Column(DECIMAL(5,2), default=75.0)
    meta_media = Column(DECIMAL(4,2), default=6.0)
    data_limite = Column(Date, nullable=False)
    status = Column(Enum('PENDENTE', 'EM_ANDAMENTO', 'ATINGIDA', 'NAO_ATINGIDA'), default='PENDENTE')
    data_atingimento = Column(Date)
    observacoes = Column(Text)
    criado_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    aluno = relationship("Aluno", back_populates="metas")
    plano_acao = relationship("PlanosAcao")


class RegistroFaltasDiarias(Base):
    """Registro diário de faltas por aluno e disciplina"""
    __tablename__ = "registro_faltas_diarias"

    id = Column(Integer, primary_key=True, index=True)
    aluno_matricula = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    disciplina = Column(String(100), nullable=False, index=True)
    data = Column(Date, nullable=False, index=True)
    justificada = Column(Boolean, default=False, index=True)
    motivo_justificativa = Column(Text)
    data_justificativa = Column(Date)
    criado_por = Column(Integer, ForeignKey("usuarios.id"))
    criado_at = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    aluno = relationship("Aluno", back_populates="faltas")
    usuario = relationship("Usuario")


class AlertaFaltasConsecutivas(Base):
    """Alertas automáticos de faltas consecutivas"""
    __tablename__ = "alertas_faltas_consecutivas"

    id = Column(Integer, primary_key=True, index=True)
    aluno_matricula = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    tipo_alerta = Column(Enum('3_FALTAS', '5_FALTAS', '10_FALTAS', name='tipo_alerta_enum'), nullable=False, index=True)
    quantidade_faltas = Column(Integer, nullable=False)
    data_inicio_faltas = Column(Date, nullable=False)
    data_fim_faltas = Column(Date, nullable=False)
    disciplinas_afetadas = Column(Text)  # JSON array
    status = Column(Enum('PENDENTE', 'EM_ANALISE', 'RESOLVIDO', 'IGNORADO', name='status_alerta_enum'), default='PENDENTE', index=True)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True, comment="Usuário responsável por acompanhar este alerta")
    data_limite = Column(Date, nullable=True, comment="Prazo máximo para resolução do alerta")
    contato_responsavel_data = Column(Date, nullable=True, comment="Data do contato com os responsáveis")
    contato_responsavel_meio = Column(String(50), nullable=True, comment="Meio de contato: Telefone, WhatsApp, Email, Presencial")
    contato_responsavel_obs = Column(Text, nullable=True, comment="Observações sobre o contato com responsáveis")
    acoes_tomadas = Column(Text)
    resolvido_por = Column(Integer, ForeignKey("usuarios.id"))
    data_resolucao = Column(Date)
    criado_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    aluno = relationship("Aluno", back_populates="alertas_faltas")
    responsavel = relationship("Usuario", foreign_keys=[responsavel_id])
    usuario_resolvedor = relationship("Usuario", foreign_keys=[resolvido_por])
    historico = relationship("AlertaFaltasHistorico", back_populates="alerta", order_by="AlertaFaltasHistorico.criado_at.desc()", cascade="all, delete-orphan")


class AlertaFaltasHistorico(Base):
    """Histórico de ações realizadas em alertas de faltas"""
    __tablename__ = "alertas_faltas_historico"

    id = Column(Integer, primary_key=True, index=True)
    alerta_id = Column(Integer, ForeignKey("alertas_faltas_consecutivas.id", ondelete="CASCADE"), nullable=False, index=True)
    acao = Column(String(100), nullable=False, comment="Tipo de ação realizada")
    descricao = Column(Text, nullable=False, comment="Descrição detalhada da ação")
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, comment="Usuário que realizou a ação")
    criado_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    alerta = relationship("AlertaFaltasConsecutivas", back_populates="historico")
    usuario = relationship("Usuario")


class QuestionarioPsicossocial(Base):
    """
    Questionário psicossocial para avaliação de risco de evasão escolar.
    
    Avalia 5 dimensões:
    1. Saúde Mental (0-25 pontos)
    2. Integração Social (0-20 pontos)
    3. Satisfação com o Curso (0-20 pontos)
    4. Conflitos (0-20 pontos)
    5. Intenção de Evasão (0-15 pontos)
    
    Total: 0-100 pontos
    """
    __tablename__ = "questionario_psicossocial"

    # Identificação
    id = Column(Integer, primary_key=True, index=True)
    aluno_matricula = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    
    # ============================================
    # DIMENSÃO 1: SAÚDE MENTAL (Questões 1-5)
    # ============================================
    q1_ansiedade = Column(Integer, comment="Sinto ansiedade frequente relacionada aos estudos")
    q2_depressao = Column(Integer, comment="Tenho me sentido desanimado(a) com frequência")
    q3_estresse = Column(Integer, comment="O estresse está afetando meu desempenho")
    q4_sono = Column(Integer, comment="Tenho tido dificuldades para dormir")
    q5_bem_estar = Column(Integer, comment="Me sinto bem emocionalmente para estudar (invertida)")
    
    # ============================================
    # DIMENSÃO 2: INTEGRAÇÃO SOCIAL (Questões 6-10)
    # ============================================
    q6_pertencimento = Column(Integer, comment="Me sinto parte da turma")
    q7_amizades = Column(Integer, comment="Tenho amigos na escola")
    q8_participacao = Column(Integer, comment="Participo de atividades extracurriculares")
    q9_relacionamento_professores = Column(Integer, comment="Tenho bom relacionamento com professores")
    q10_apoio_colegas = Column(Integer, comment="Posso contar com colegas para dificuldades")
    
    # ============================================
    # DIMENSÃO 3: SATISFAÇÃO COM O CURSO (Questões 11-15)
    # ============================================
    q11_expectativas = Column(Integer, comment="O curso atende minhas expectativas")
    q12_qualidade_aulas = Column(Integer, comment="As aulas são de boa qualidade")
    q13_infraestrutura = Column(Integer, comment="A infraestrutura me atende")
    q14_conteudo_programatico = Column(Integer, comment="O conteúdo é relevante")
    q15_motivacao_curso = Column(Integer, comment="Estou motivado(a) com o curso")
    
    # ============================================
    # DIMENSÃO 4: CONFLITOS (Questões 16-20)
    # ============================================
    q16_trabalho_estudo = Column(Integer, comment="O trabalho atrapalha meus estudos")
    q17_familia_estudo = Column(Integer, comment="A família apoia meus estudos (invertida)")
    q18_tempo_lazer = Column(Integer, comment="Tenho tempo para lazer (invertida)")
    q19_cansaco = Column(Integer, comment="Sinto cansaço excessivo")
    q20_sobrecarga = Column(Integer, comment="Me sinto sobrecarregado(a)")
    
    # ============================================
    # DIMENSÃO 5: INTENÇÃO DE EVASÃO (Questões 21-25)
    # ============================================
    q21_pensou_abandonar = Column(Integer, comment="Já pensei em abandonar o curso")
    q22_frequencia_pensamento = Column(Integer, comment="Com que frequência pensa em abandonar")
    q23_motivacao_permanencia = Column(Integer, comment="Estou motivado a permanecer (invertida)")
    q24_plano_abandonar = Column(Integer, comment="Tenho plano de abandonar")
    q25_previsao_abandono = Column(Integer, comment="Devo abandonar em breve")
    
    # ============================================
    # CAMPOS CALCULADOS
    # ============================================
    score_saude_mental = Column(DECIMAL(5,2), comment="0-25 pontos")
    score_integracao_social = Column(DECIMAL(5,2), comment="0-20 pontos")
    score_satisfacao_curso = Column(DECIMAL(5,2), comment="0-20 pontos")
    score_conflitos = Column(DECIMAL(5,2), comment="0-20 pontos")
    score_intencao_evasao = Column(DECIMAL(5,2), comment="0-15 pontos")
    score_psicossocial_total = Column(DECIMAL(5,2), comment="0-100 pontos")
    
    # ============================================
    # NÍVEL DE RISCO PSICOSSOCIAL
    # ============================================
    nivel_risco_psicossocial = Column(
        Enum('BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO', name='nivel_risco_psicossocial_enum'),
        comment="Nível de risco baseado no score total",
        index=True
    )
    
    # ============================================
    # FATORES CRÍTICOS IDENTIFICADOS
    # ============================================
    fatores_criticos = Column(Text, comment="JSON array com fatores críticos identificados")
    
    # ============================================
    # METADADOS
    # ============================================
    data_resposta = Column(DateTime(timezone=True), server_default=func.now(), index=True, comment="Data/hora da resposta")
    ip_address = Column(String(45), comment="IP do dispositivo")
    dispositivo = Column(String(100), comment="User agent do dispositivo")
    tempo_resposta_segundos = Column(Integer, comment="Tempo gasto para responder (segundos)")
    termo_consentimento = Column(Boolean, default=False, comment="Aceitou termo de consentimento")
    
    # ============================================
    # RELATIONSHIPS
    # ============================================
    aluno = relationship("Aluno", back_populates="questionario_psicossocial")


class TokenQuestionario(Base):
    """
    Token de acesso temporário para questionário psicossocial sem login.
    
    Permite que alunos acessem o questionário através de um link único
    e temporário, sem necessidade de criar usuário e senha.
    """
    __tablename__ = "tokens_questionario"
    
    # Identificação
    id = Column(Integer, primary_key=True, index=True)
    aluno_matricula = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    
    # Token
    token = Column(String(100), unique=True, nullable=False, index=True, comment="Token único de acesso (UUID)")
    
    # Validação
    valido_ate = Column(DateTime(timezone=True), nullable=False, index=True, comment="Data/hora de expiração")
    usado = Column(Boolean, default=False, index=True, comment="Indica se o token já foi utilizado")
    data_uso = Column(DateTime(timezone=True), comment="Data/hora do primeiro uso")
    
    # Metadados
    criado_at = Column(DateTime(timezone=True), server_default=func.now(), comment="Data de criação")
    ip_criacao = Column(String(45), comment="IP de quem criou o token")
    ip_uso = Column(String(45), comment="IP de quem usou o token")
    
    # Status
    ativo = Column(Boolean, default=True, index=True, comment="Token está ativo")
    
    # Relationship
    aluno = relationship("Aluno")


class Egresso(Base):
    """
    Acompanhamento de egressos (alunos que saíram do curso).
    
    Permite medir a eficácia do sistema de predição de evasão.
    """
    __tablename__ = "egressos"
    
    # Identificação
    id = Column(Integer, primary_key=True, index=True)
    aluno_matricula = Column(String(20), ForeignKey("alunos.matricula"), nullable=False, index=True)
    
    # Dados da Saída
    data_saida = Column(Date, nullable=False, index=True, comment="Data de saída do curso")
    motivo_saida = Column(Enum('TRANSFERENCIA', 'ABANDONO', 'CONCLUSAO', 'TRANCAMENTO', 'JUBILAMENTO', 'OUTROS'), 
                          nullable=False, index=True, comment="Motivo principal da saída")
    motivo_detalhes = Column(Text, comment="Detalhes adicionais sobre o motivo")
    
    # Detalhes do Motivo
    instituicao_destino = Column(String(200), comment="Para onde o aluno transferiu")
    curso_destino = Column(String(200), comment="Curso para onde transferiu")
    motivo_abandono_principal = Column(Enum('FINANCEIRO', 'SAUDE', 'FAMILIA', 'TRABALHO', 'DIFICULDADE_ACADEMICA', 'FALTA_INTERESSE', 'OUTROS'),
                                       comment="Motivo principal do abandono")
    situacao_atual = Column(Enum('EMPREGADO', 'DESEMPREGADO', 'ESTUDANDO', 'OUTROS'), comment="Situação após conclusão")
    
    # Acompanhamento Pós-Saída (6 meses depois)
    data_acompanhamento = Column(Date, comment="Data do acompanhamento")
    esta_estudando = Column(Boolean, default=False, comment="Está estudando em outra instituição")
    instituicao_atual = Column(String(200), comment="Instituição onde está estudando")
    curso_atual = Column(String(200), comment="Curso atual")
    esta_trabalhando = Column(Boolean, default=False, comment="Está trabalhando")
    empresa_atual = Column(String(200), comment="Empresa onde trabalha")
    cargo_atual = Column(String(100), comment="Cargo atual")
    salario_atual = Column(DECIMAL(10,2), comment="Salário atual")
    satisfeito_com_formacao = Column(Boolean, default=True, comment="Está satisfeito com a formação")
    recomendaria_curso = Column(Boolean, default=True, comment="Recomendaria o curso")
    
    # Dados do SAPEE (para medir eficácia)
    tinha_predicao_risco = Column(Boolean, default=False, comment="Tinha predição de risco no SAPEE")
    nivel_risco_predito = Column(Enum('BAIXO', 'MEDIO', 'ALTO'), comment="Nível de risco predito")
    recebeu_intervencao = Column(Boolean, default=False, comment="Recebeu intervenção do SAPEE")
    tipo_intervencao = Column(Text, comment="Tipos de intervenção recebidas")
    
    # Metadados
    data_cadastro = Column(DateTime(timezone=True), server_default=func.now(), comment="Data de cadastro")
    cadastrado_por = Column(Integer, ForeignKey("usuarios.id"), comment="ID do usuário que cadastrou")
    data_atualizacao = Column(DateTime(timezone=True), onupdate=func.now(), comment="Data da última atualização")
    atualizado_por = Column(Integer, ForeignKey("usuarios.id"), comment="ID do usuário que atualizou")
    observacoes = Column(Text, comment="Observações adicionais")
    
    # Relationships
    aluno = relationship("Aluno")
    usuario_cadastro = relationship("Usuario", foreign_keys=[cadastrado_por])


# Adicionar relationships nas classes existentes
Curso.planos_acao = relationship("PlanosAcao", back_populates="curso", cascade="all, delete-orphan")
Curso.metas_semestrais = relationship("MetasSemestrais", back_populates="curso", cascade="all, delete-orphan")
Aluno.metas = relationship("AlunoMeta", back_populates="aluno", cascade="all, delete-orphan")
Aluno.faltas = relationship("RegistroFaltasDiarias", back_populates="aluno", cascade="all, delete-orphan")
Aluno.alertas_faltas = relationship("AlertaFaltasConsecutivas", back_populates="aluno", cascade="all, delete-orphan")
Aluno.questionario_psicossocial = relationship("QuestionarioPsicossocial", back_populates="aluno", uselist=False, cascade="all, delete-orphan")
