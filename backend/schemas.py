"""
Schemas Pydantic - Validação de Dados
SAPEE DEWAS Backend
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# ============================================
# ENUMS
# ============================================

class NivelRisco(str, Enum):
    BAIXO = "BAIXO"
    MEDIO = "MEDIO"
    ALTO = "ALTO"
    MUITO_ALTO = "MUITO_ALTO"

class StatusIntervencao(str, Enum):
    RASCUNHO = "RASCUNHO"
    PENDENTE = "PENDENTE"
    EM_ANDAMENTO = "EM_ANDAMENTO"
    CONCLUIDA = "CONCLUIDA"
    CANCELADA = "CANCELADA"

class Modalidade(str, Enum):
    INTEGRADO = "Integrado"
    SUBSEQUENTE = "Subsequente"
    SUPERIOR = "Superior"
    POS_GRADUACAO = "Pós-Graduação"

class Turno(str, Enum):
    MATUTINO = "MATUTINO"
    VESPERTINO = "VESPERTINO"
    NOTURNO = "NOTURNO"

class ZonaResidencial(str, Enum):
    ZONA_NORTE = "ZONA_NORTE"
    ZONA_SUL = "ZONA_SUL"
    ZONA_LESTE = "ZONA_LESTE"
    ZONA_OESTE = "ZONA_OESTE"
    CENTRO = "CENTRO"
    INTERIOR = "INTERIOR"

class DificuldadeAcesso(str, Enum):
    FACIL = "FACIL"
    MEDIA = "MEDIA"
    DIFICIL = "DIFICIL"
    MUITO_DIFICIL = "MUITO_DIFICIL"

class Sexo(str, Enum):
    M = "M"
    F = "F"
    O = "O"

# ============================================
# TOKEN & AUTH
# ============================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

# ============================================
# ROLES
# ============================================

class RoleBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    permissoes: Optional[str] = None  # JSON como string

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: int
    criado_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# CURSOS
# ============================================

class CursoBase(BaseModel):
    nome: str
    modalidade: Modalidade = Modalidade.INTEGRADO

class CursoCreate(CursoBase):
    pass

class Curso(CursoBase):
    id: int
    criado_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# USUÁRIOS
# ============================================

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    role_id: int
    curso_id: Optional[int] = None
    ativo: bool = True

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6, description="Senha deve ter pelo menos 6 caracteres")

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    curso_id: Optional[int] = None
    ativo: Optional[bool] = None
    senha: Optional[str] = Field(None, min_length=6)

class TrocaSenhaRequest(BaseModel):
    senha_atual: str = Field(..., description="Senha atual do usuário")
    senha_nova: str = Field(..., min_length=6, description="Nova senha (mínimo 6 caracteres)")

class UsuarioResponse(UsuarioBase):
    id: int
    criado_at: datetime
    ultimo_acesso: Optional[datetime] = None
    role: Optional[Role] = None
    curso: Optional[Curso] = None
    
    model_config = ConfigDict(from_attributes=True)

# Forward references para tipos circulares
UsuarioResponse.model_rebuild()

# ============================================
# ALUNOS (27+ campos)
# ============================================

class AlunoBase(BaseModel):
    # Identificação
    nome: str
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    idade: Optional[int] = None
    sexo: Optional[Sexo] = None
    
    # Acadêmicos
    curso_id: Optional[int] = None
    periodo: Optional[int] = Field(None, ge=1, le=8)
    turno: Optional[Turno] = None
    media_geral: Optional[float] = Field(None, ge=0, le=10)
    frequencia: Optional[float] = Field(None, ge=0, le=100)
    historico_reprovas: Optional[int] = Field(default=0, ge=0)
    coeficiente_rendimento: Optional[float] = Field(None, ge=0, le=10)
    ano_ingresso: Optional[int] = None
    
    # Endereço
    cidade: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    zona_residencial: Optional[ZonaResidencial] = None
    
    # Socioeconômicos
    renda_familiar: Optional[float] = Field(None, ge=0)
    renda_per_capita: Optional[float] = Field(None, ge=0)
    possui_auxilio: Optional[bool] = False
    tipo_auxilio: Optional[str] = None  # JSON string
    
    # Trabalho
    trabalha: Optional[bool] = False
    carga_horaria_trabalho: Optional[int] = Field(None, ge=0, le=60)
    
    # Deslocamento
    tempo_deslocamento: Optional[int] = Field(None, ge=0)
    custo_transporte_diario: Optional[float] = Field(None, ge=0)
    dificuldade_acesso: Optional[DificuldadeAcesso] = None
    transporte_utilizado: Optional[str] = None
    usa_transporte_alternativo: Optional[bool] = False
    
    # Infraestrutura
    possui_computador: Optional[bool] = False
    possui_internet: Optional[bool] = False
    
    # Vulnerabilidade
    beneficiario_bolsa_familia: Optional[bool] = False
    primeiro_geracao_universidade: Optional[bool] = False

    # Dados dos Responsáveis
    nome_responsavel_1: Optional[str] = None
    parentesco_responsavel_1: Optional[str] = None
    telefone_responsavel_1: Optional[str] = None
    email_responsavel_1: Optional[EmailStr] = None
    nome_responsavel_2: Optional[str] = None
    parentesco_responsavel_2: Optional[str] = None
    telefone_responsavel_2: Optional[str] = None

    # Questionário Psicossocial
    questionario_respondido: Optional[bool] = False
    data_ultimo_questionario: Optional[datetime] = None

class AlunoCreate(AlunoBase):
    matricula: str = Field(..., min_length=5, max_length=20, pattern=r'^\d+$')

class AlunoUpdate(AlunoBase):
    # Todos os campos opcionais para update parcial
    pass

class AlunoResponse(AlunoBase):
    matricula: str
    criado_at: Optional[datetime] = None

    # Relacionamentos
    curso: Optional[Curso] = None
    predicao_atual: Optional['PredicaoResponse'] = None

    model_config = ConfigDict(from_attributes=True)

# Alias para compatibilidade
AlunoComPredicao = AlunoResponse

# ============================================
# PREDIÇÕES
# ============================================

class PredicaoBase(BaseModel):
    risco_evasao: float = Field(..., ge=0, le=100)
    nivel_risco: NivelRisco
    fatores_principais: Optional[str] = None

class PredicaoCreate(PredicaoBase):
    aluno_id: str

class PredicaoResponse(PredicaoBase):
    id: int
    aluno_id: str
    modelo_ml_versao: Optional[str] = None
    data_predicao: datetime

    model_config = ConfigDict(from_attributes=True)

# ============================================
# FREQUÊNCIA MENSAL
# ============================================

class FrequenciaMensalBase(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2020)
    frequencia: float = Field(..., ge=0, le=100)
    faltas_justificadas: int = Field(default=0, ge=0)
    faltas_nao_justificadas: int = Field(default=0, ge=0)
    total_aulas_mes: int = Field(..., ge=1)
    observacoes: Optional[str] = None

class FrequenciaMensalCreate(FrequenciaMensalBase):
    aluno_id: str

class FrequenciaMensalResponse(FrequenciaMensalBase):
    id: int
    aluno_id: str
    data_registro: datetime

    model_config = ConfigDict(from_attributes=True)

# ============================================
# LANÇAMENTO MENSAL DE FREQUÊNCIA
# ============================================

class FrequenciaLancamentoItem(BaseModel):
    aluno_id: str
    frequencia: float = Field(..., ge=0, le=100)
    faltas_justificadas: int = Field(default=0, ge=0)
    faltas_nao_justificadas: int = Field(default=0, ge=0)
    total_aulas_mes: int = Field(..., ge=1)

class FrequenciaLancamento(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2020)
    alunos: List[FrequenciaLancamentoItem]
    observacoes: Optional[str] = None
    
    @field_validator('ano')
    @classmethod
    def validate_ano(cls, v):
        from datetime import datetime
        now = datetime.now()
        ano_atual = now.year
        mes_atual = now.month + 1  # 1-12
        
        # Futuro: NUNCA
        if v > ano_atual:
            raise ValueError(f'Não é possível lançar frequência de {v}. Ano futuro não permitido.')
        
        # Ano atual: só até mês atual
        if v == ano_atual:
            # Validação será feita no validator do mes
            pass
        
        # Ano anterior: permite (correções)
        if v == ano_atual - 1:
            return v
        
        # Muito antigo: não permite
        if v < ano_atual - 1:
            raise ValueError(f'Ano {v} muito antigo. Permitido: {ano_atual-1} (correções) e {ano_atual} (até mês atual).')
        
        return v
    
    @field_validator('mes')
    @classmethod
    def validate_mes(cls, v, info):
        from datetime import datetime
        now = datetime.now()
        ano_atual = now.year
        mes_atual = now.month + 1  # 1-12
        
        # Se o ano for o ano atual, validar mês
        if info.data.get('ano') == ano_atual and v > mes_atual:
            nomes_meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
            raise ValueError(
                f'Não é possível lançar {nomes_meses[v-1]}/{ano_atual}. '
                f'Este mês ainda não iniciou. Estamos em {nomes_meses[mes_atual-1]}.'
            )
        
        return v

class FrequenciaLancamentoResponse(BaseModel):
    registros_criados: int
    mes: int
    ano: int
    mensagem: str

    model_config = ConfigDict(from_attributes=True)

# ============================================
# INTERVENÇÕES
# ============================================

class IntervencaoBase(BaseModel):
    tipo: str
    descricao: Optional[str] = None
    status: StatusIntervencao = StatusIntervencao.PENDENTE
    prioridade: str = 'MEDIA'
    data_intervencao: date

class IntervencaoCreate(IntervencaoBase):
    pass

class IntervencaoUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[StatusIntervencao] = None
    prioridade: Optional[str] = None
    data_conclusao: Optional[date] = None
    data_limite: Optional[date] = None
    observacoes: Optional[str] = None

class IntervencaoResponse(IntervencaoBase):
    id: int
    usuario_id: Optional[int] = None
    criado_at: datetime
    data_conclusao: Optional[date] = None
    data_limite: Optional[date] = None
    observacoes: Optional[str] = None
    
    # Campos para sugestões automáticas
    auto_gerada: Optional[bool] = False
    motivo_risco: Optional[str] = None
    data_aprovacao: Optional[date] = None
    data_rejeicao: Optional[date] = None
    motivo_rejeicao: Optional[str] = None

    # Relacionamentos
    aluno: Optional[AlunoResponse] = None
    usuario: Optional[UsuarioResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ============================================
# AUDIT LOGS
# ============================================

class AuditLogBase(BaseModel):
    acao: str
    detalhes: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    usuario_id: int

class AuditLogResponse(AuditLogBase):
    id: int
    usuario_id: int
    criado_at: datetime
    usuario: Optional[UsuarioResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============================================
# DASHBOARD & STATS
# ============================================

class DashboardStats(BaseModel):
    total_alunos: int
    risco_muito_alto: int
    risco_alto: int
    risco_medio: int
    risco_baixo: int
    media_geral_campus: float
    intervencoes_ativas: int

class AlunoRiscoStats(BaseModel):
    matricula: str
    nome: str
    curso: str
    risco_evasao: float
    nivel_risco: NivelRisco

# ============================================
# PLANOS DE AÇÃO E METAS
# ============================================

class PlanosAcaoBase(BaseModel):
    curso_id: Optional[int] = None  # NULL para planos genéricos
    nivel_risco: NivelRisco
    meta_frequencia_minima: float = Field(default=75.0, ge=0, le=100)
    meta_media_minima: float = Field(default=6.0, ge=0, le=10)
    prazo_dias: int = Field(default=30, ge=1, le=365)
    acoes_recomendadas: Optional[str] = None  # JSON string
    observacoes: Optional[str] = None
    ativo: bool = True

class PlanosAcaoCreate(PlanosAcaoBase):
    pass

class PlanosAcaoUpdate(BaseModel):
    meta_frequencia_minima: Optional[float] = None
    meta_media_minima: Optional[float] = None
    prazo_dias: Optional[int] = None
    acoes_recomendadas: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None

class PlanosAcaoResponse(PlanosAcaoBase):
    id: int
    criado_at: datetime
    atualizado_at: Optional[datetime] = None
    curso: Optional[Curso] = None

    model_config = ConfigDict(from_attributes=True)


class MetasSemestraisBase(BaseModel):
    curso_id: int
    semestre: str = Field(..., pattern=r'^\d{4}-\d$')  # Ex: "2026-1"
    meta_frequencia_geral: float = Field(default=80.0, ge=0, le=100)
    meta_media_geral: float = Field(default=7.0, ge=0, le=10)
    meta_reducao_evasao: float = Field(default=10.0, ge=0, le=100)
    meta_recuperacao: float = Field(default=50.0, ge=0, le=100)
    data_inicio: date
    data_fim: date
    observacoes: Optional[str] = None

class MetasSemestraisCreate(MetasSemestraisBase):
    pass

class MetasSemestraisUpdate(BaseModel):
    meta_frequencia_geral: Optional[float] = None
    meta_media_geral: Optional[float] = None
    meta_reducao_evasao: Optional[float] = None
    meta_recuperacao: Optional[float] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None

class MetasSemestraisResponse(MetasSemestraisBase):
    id: int
    status: str
    criado_at: datetime
    curso: Optional[Curso] = None

    model_config = ConfigDict(from_attributes=True)


class AlunoMetaBase(BaseModel):
    aluno_matricula: str
    plano_acao_id: Optional[int] = None
    meta_frequencia: float = Field(default=75.0, ge=0, le=100)
    meta_media: float = Field(default=6.0, ge=0, le=10)
    data_limite: date
    observacoes: Optional[str] = None

class AlunoMetaCreate(AlunoMetaBase):
    pass

class AlunoMetaUpdate(BaseModel):
    meta_frequencia: Optional[float] = None
    meta_media: Optional[float] = None
    data_limite: Optional[date] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    data_atingimento: Optional[date] = None

class AlunoMetaResponse(AlunoMetaBase):
    id: int
    status: str
    data_atingimento: Optional[date] = None
    criado_at: datetime
    aluno: Optional[AlunoResponse] = None
    plano_acao: Optional[PlanosAcaoResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================
# FALTAS CONSECUTIVAS
# ============================================

class RegistroFaltasDiariasBase(BaseModel):
    aluno_matricula: str
    disciplina: str
    data: date
    justificada: bool = False
    motivo_justificativa: Optional[str] = None

class RegistroFaltasDiariasCreate(RegistroFaltasDiariasBase):
    pass

class RegistroFaltasDiariasResponse(RegistroFaltasDiariasBase):
    id: int
    data_justificativa: Optional[date] = None
    criado_por: Optional[int] = None
    criado_at: datetime
    atualizado_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AlertaFaltasConsecutivasBase(BaseModel):
    aluno_matricula: str
    tipo_alerta: str
    quantidade_faltas: int
    data_inicio_faltas: date
    data_fim_faltas: date
    disciplinas_afetadas: Optional[str] = None  # JSON string

class AlertaFaltasConsecutivasCreate(AlertaFaltasConsecutivasBase):
    responsavel_id: Optional[int] = None
    data_limite: Optional[date] = None
    contato_responsavel_data: Optional[date] = None
    contato_responsavel_meio: Optional[str] = None
    contato_responsavel_obs: Optional[str] = None

class AlertaFaltasConsecutivasUpdate(BaseModel):
    status: Optional[str] = None
    acoes_tomadas: Optional[str] = None
    data_resolucao: Optional[date] = None
    responsavel_id: Optional[int] = None
    data_limite: Optional[date] = None
    contato_responsavel_data: Optional[date] = None
    contato_responsavel_meio: Optional[str] = None
    contato_responsavel_obs: Optional[str] = None

class AlertaFaltasConsecutivasResponse(AlertaFaltasConsecutivasBase):
    id: int
    status: str
    acoes_tomadas: Optional[str] = None
    responsavel_id: Optional[int] = None
    data_limite: Optional[date] = None
    contato_responsavel_data: Optional[date] = None
    contato_responsavel_meio: Optional[str] = None
    contato_responsavel_obs: Optional[str] = None
    resolvido_por: Optional[int] = None
    data_resolucao: Optional[date] = None
    criado_at: datetime

    # Relacionamentos
    aluno: Optional[AlunoResponse] = None
    responsavel: Optional['UsuarioResponse'] = None
    historico: Optional[List['AlertaFaltasHistoricoResponse']] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================
# HISTÓRICO DE ALERTAS
# ============================================

class AlertaFaltasHistoricoResponse(BaseModel):
    """Resposta de histórico de alerta"""
    id: int
    alerta_id: int
    acao: str
    descricao: str
    usuario_id: Optional[int] = None
    usuario: Optional['UsuarioResponse'] = None
    criado_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FaltasConsecutivasStats(BaseModel):
    """Estatísticas de faltas consecutivas para dashboard"""
    total_alertas_pendentes: int
    total_alertas_3_faltas: int
    total_alertas_5_faltas: int
    total_alertas_10_faltas: int
    alunos_com_faltas_consecutivas: int


# ============================================
# QUESTIONÁRIO PSICOSSOCIAL
# ============================================

class QuestionarioPsicossocialBase(BaseModel):
    """Base para questionário psicossocial"""
    
    # Dimensão 1: Saúde Mental (1-5)
    q1_ansiedade: Optional[int] = Field(None, ge=1, le=5)
    q2_depressao: Optional[int] = Field(None, ge=1, le=5)
    q3_estresse: Optional[int] = Field(None, ge=1, le=5)
    q4_sono: Optional[int] = Field(None, ge=1, le=5)
    q5_bem_estar: Optional[int] = Field(None, ge=1, le=5)
    
    # Dimensão 2: Integração Social (6-10)
    q6_pertencimento: Optional[int] = Field(None, ge=1, le=5)
    q7_amizades: Optional[int] = Field(None, ge=1, le=5)
    q8_participacao: Optional[int] = Field(None, ge=1, le=5)
    q9_relacionamento_professores: Optional[int] = Field(None, ge=1, le=5)
    q10_apoio_colegas: Optional[int] = Field(None, ge=1, le=5)
    
    # Dimensão 3: Satisfação com Curso (11-15)
    q11_expectativas: Optional[int] = Field(None, ge=1, le=5)
    q12_qualidade_aulas: Optional[int] = Field(None, ge=1, le=5)
    q13_infraestrutura: Optional[int] = Field(None, ge=1, le=5)
    q14_conteudo_programatico: Optional[int] = Field(None, ge=1, le=5)
    q15_motivacao_curso: Optional[int] = Field(None, ge=1, le=5)
    
    # Dimensão 4: Conflitos (16-20)
    q16_trabalho_estudo: Optional[int] = Field(None, ge=1, le=5)
    q17_familia_estudo: Optional[int] = Field(None, ge=1, le=5)
    q18_tempo_lazer: Optional[int] = Field(None, ge=1, le=5)
    q19_cansaco: Optional[int] = Field(None, ge=1, le=5)
    q20_sobrecarga: Optional[int] = Field(None, ge=1, le=5)
    
    # Dimensão 5: Intenção de Evasão (21-25)
    q21_pensou_abandonar: Optional[int] = Field(None, ge=1, le=5)
    q22_frequencia_pensamento: Optional[int] = Field(None, ge=1, le=5)
    q23_motivacao_permanencia: Optional[int] = Field(None, ge=1, le=5)
    q24_plano_abandonar: Optional[int] = Field(None, ge=1, le=5)
    q25_previsao_abandono: Optional[int] = Field(None, ge=1, le=5)
    
    # Metadados
    ip_address: Optional[str] = None
    dispositivo: Optional[str] = None
    tempo_resposta_segundos: Optional[int] = None
    termo_consentimento: bool = True


class QuestionarioPsicossocialCreate(QuestionarioPsicossocialBase):
    """Schema para criação de questionário"""
    aluno_matricula: str


class QuestionarioPsicossocialUpdate(BaseModel):
    """Schema para atualização parcial"""
    # Permite atualizar qualquer campo individualmente
    q1_ansiedade: Optional[int] = Field(None, ge=1, le=5)
    q2_depressao: Optional[int] = Field(None, ge=1, le=5)
    q3_estresse: Optional[int] = Field(None, ge=1, le=5)
    q4_sono: Optional[int] = Field(None, ge=1, le=5)
    q5_bem_estar: Optional[int] = Field(None, ge=1, le=5)
    
    q6_pertencimento: Optional[int] = Field(None, ge=1, le=5)
    q7_amizades: Optional[int] = Field(None, ge=1, le=5)
    q8_participacao: Optional[int] = Field(None, ge=1, le=5)
    q9_relacionamento_professores: Optional[int] = Field(None, ge=1, le=5)
    q10_apoio_colegas: Optional[int] = Field(None, ge=1, le=5)
    
    q11_expectativas: Optional[int] = Field(None, ge=1, le=5)
    q12_qualidade_aulas: Optional[int] = Field(None, ge=1, le=5)
    q13_infraestrutura: Optional[int] = Field(None, ge=1, le=5)
    q14_conteudo_programatico: Optional[int] = Field(None, ge=1, le=5)
    q15_motivacao_curso: Optional[int] = Field(None, ge=1, le=5)
    
    q16_trabalho_estudo: Optional[int] = Field(None, ge=1, le=5)
    q17_familia_estudo: Optional[int] = Field(None, ge=1, le=5)
    q18_tempo_lazer: Optional[int] = Field(None, ge=1, le=5)
    q19_cansaco: Optional[int] = Field(None, ge=1, le=5)
    q20_sobrecarga: Optional[int] = Field(None, ge=1, le=5)
    
    q21_pensou_abandonar: Optional[int] = Field(None, ge=1, le=5)
    q22_frequencia_pensamento: Optional[int] = Field(None, ge=1, le=5)
    q23_motivacao_permanencia: Optional[int] = Field(None, ge=1, le=5)
    q24_plano_abandonar: Optional[int] = Field(None, ge=1, le=5)
    q25_previsao_abandono: Optional[int] = Field(None, ge=1, le=5)
    
    termo_consentimento: Optional[bool] = None


class QuestionarioPsicossocialResponse(QuestionarioPsicossocialBase):
    """Schema de resposta com dados calculados"""
    id: int
    aluno_matricula: str
    
    # Campos calculados
    score_saude_mental: Optional[float] = None
    score_integracao_social: Optional[float] = None
    score_satisfacao_curso: Optional[float] = None
    score_conflitos: Optional[float] = None
    score_intencao_evasao: Optional[float] = None
    score_psicossocial_total: Optional[float] = None
    nivel_risco_psicossocial: Optional[str] = None
    fatores_criticos: Optional[str] = None  # JSON array como string
    
    # Metadados
    data_resposta: datetime
    termo_consentimento: bool

    model_config = ConfigDict(from_attributes=True)


class QuestionarioPsicossocialDashboard(BaseModel):
    """Estatísticas do questionário para dashboard"""
    total_respostas: int
    alunos_com_questionario: int
    alunos_sem_questionario: int
    percentual_respostas: float
    
    # Distribuição por nível de risco
    risco_baixo: int
    risco_medio: int
    risco_alto: int
    risco_muito_alto: int
    
    # Scores médios por dimensão
    media_saude_mental: Optional[float] = None
    media_integracao_social: Optional[float] = None
    media_satisfacao_curso: Optional[float] = None
    media_conflitos: Optional[float] = None
    media_intencao_evasao: Optional[float] = None
    media_score_total: Optional[float] = None
    
    # Fatores críticos mais frequentes
    fatores_criticos_frequentes: List[str] = []


# ============================================
# TOKENS DE ACESSO - QUESTIONÁRIO PÚBLICO
# ============================================

class TokenQuestionarioCreate(BaseModel):
    """Solicitação de geração de token"""
    aluno_matricula: str
    horas_validade: int = 24  # 24 horas padrão


class TokenQuestionarioResponse(BaseModel):
    """Resposta com token gerado"""
    token: str
    valido_ate: datetime
    link_acesso: str
    aluno_nome: str
    aluno_matricula: str
    
    model_config = ConfigDict(from_attributes=True)


class TokenQuestionarioValidateRequest(BaseModel):
    """Validação de token"""
    token: str


class TokenQuestionarioValidateResponse(BaseModel):
    """Resposta de validação de token"""
    valido: bool
    mensagem: str
    aluno_matricula: Optional[str] = None
    aluno_nome: Optional[str] = None


# ============================================
# EGRESSOS
# ============================================

class EgressoBase(BaseModel):
    aluno_matricula: str
    data_saida: date
    motivo_saida: str
    motivo_detalhes: Optional[str] = None
    motivo_abandono_principal: Optional[str] = None
    instituicao_destino: Optional[str] = None
    curso_destino: Optional[str] = None
    situacao_atual: Optional[str] = None
    esta_estudando: Optional[bool] = False
    esta_trabalhando: Optional[bool] = False
    observacoes: Optional[str] = None

class EgressoCreate(EgressoBase):
    pass

class EgressoUpdate(BaseModel):
    motivo_detalhes: Optional[str] = None
    instituicao_destino: Optional[str] = None
    curso_destino: Optional[str] = None
    situacao_atual: Optional[str] = None
    esta_estudando: Optional[bool] = None
    instituicao_atual: Optional[str] = None
    curso_atual: Optional[str] = None
    esta_trabalhando: Optional[bool] = None
    empresa_atual: Optional[str] = None
    cargo_atual: Optional[str] = None
    salario_atual: Optional[float] = None
    satisfeito_com_formacao: Optional[bool] = None
    recomendaria_curso: Optional[bool] = None
    data_acompanhamento: Optional[date] = None
    observacoes: Optional[str] = None

class EgressoResponse(EgressoBase):
    id: int
    tinha_predicao_risco: Optional[bool] = False
    nivel_risco_predito: Optional[str] = None
    recebeu_intervencao: Optional[bool] = False
    tipo_intervencao: Optional[str] = None
    aluno_nome: Optional[str] = None
    curso: Optional[str] = None
    data_cadastro: Optional[datetime] = None
    data_atualizacao: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class EgressoStatsResponse(BaseModel):
    total_egressos: int
    total_abandonos: int
    total_transferencias: int
    total_conclusoes: int
    abandonos_preditos: int
    percentual_predicao_correta: float

# ============================================
# RESPONSE GENÉRICAS
# ============================================

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None

class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    per_page: int
    pages: int

# Forward references para tipos circulares
AlunoResponse.model_rebuild()
PredicaoResponse.model_rebuild()
IntervencaoResponse.model_rebuild()
UsuarioResponse.model_rebuild()
PlanosAcaoResponse.model_rebuild()
MetasSemestraisResponse.model_rebuild()
AlunoMetaResponse.model_rebuild()
RegistroFaltasDiariasResponse.model_rebuild()
AlertaFaltasConsecutivasResponse.model_rebuild()
QuestionarioPsicossocialResponse.model_rebuild()
