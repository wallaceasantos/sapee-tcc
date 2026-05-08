"""
Serviço Unificado de Comunicação - Geração de Mensagens
SAPEE DEWAS Backend

Centraliza a geração de mensagens para todos os módulos.
"""
from sqlalchemy.orm import Session
from datetime import datetime
import models
from notificacoes import notifier as telegram_notifier

# Templates de mensagens definidos no código (fallback se não houver no banco)
TEMPLATES_PADRAO = {
    'ALERTA_FALTAS': (
        "Olá, {nome_responsavel}! Aqui é da escola.\n\n"
        "🚨 Alerta de Faltas Consecutivas\n"
        "👤 Aluno(a): {nome_aluno}\n"
        "📋 Total: {qtd_faltas} faltas consecutivas\n"
        "📅 Período: {data_inicio} a {data_fim}\n\n"
        "Pedimos que entre em contato com a escola para conversarmos "
        "sobre a situação do(a) aluno(a).\n\n"
        "Atenciosamente,\nEquipe SAPEE"
    ),
    'INTERVENCAO_INICIO': (
        "Olá, {nome_responsavel}! Aqui é da escola.\n\n"
        "📚 Início de Intervenção Pedagógica\n"
        "👤 Aluno(a): {nome_aluno}\n"
        "📝 Tipo: {tipo_intervencao}\n"
        "📅 Data: {data_intervencao}\n\n"
        "Informamos que foi iniciada uma intervenção para acompanhar "
        "o desempenho do(a) aluno(a). Em breve entraremos em contato "
        "para mais detalhes.\n\n"
        "Atenciosamente,\nEquipe SAPEE"
    ),
    'RISCO_ALTO_NOTIFICACAO': (
        "Olá, {nome_responsavel}! Aqui é da escola.\n\n"
        "⚠️ Alerta de Risco de Evasão\n"
        "👤 Aluno(a): {nome_aluno}\n"
        "📊 Nível de Risco: {nivel_risco}\n"
        "📈 Score: {risco_percentual}%\n\n"
        "Identificamos que o(a) aluno(a) apresenta indicadores de risco. "
        "Solicitamos seu comparecimento urgente à escola para conversarmos.\n\n"
        "Atenciosamente,\nEquipe SAPEE"
    ),
    'RISCO_MUITO_ALTO_NOTIFICACAO': (
        "Olá, {nome_responsavel}! Aqui é da escola.\n\n"
        "🚨 ALERTA CRÍTICO: Risco de Evasão Iminente\n"
        "👤 Aluno(a): {nome_aluno}\n"
        "📊 Nível de Risco: {nivel_risco}\n"
        "📈 Score: {risco_percentual}%\n\n"
        "⚠️ A situação do(a) aluno(a) é GRAVE. "
        "Solicitamos sua presença URGENTE na escola para evitarmos a evasão escolar. "
        "Por favor, entre em contato com a secretaria imediatamente.\n\n"
        "Atenciosamente,\nEquipe SAPEE"
    ),
    'ENCAMINHAMENTO_STATUS': (
        "Olá, {nome_responsavel}!\n\n"
        "🔗 Atualização de Encaminhamento\n"
        "👤 Aluno(a): {nome_aluno}\n"
        "🏥 Destino: {destino_encaminhamento}\n"
        "📋 Status: {status_encaminhamento}\n\n"
        "Atenciosamente,\nEquipe SAPEE"
    ),
    'LEMBRETE_ATENDIMENTO': (
        "Olá, {nome_responsavel}!\n\n"
        "⏰ Lembrete de Atendimento\n"
        "👤 Aluno(a): {nome_aluno}\n"
        "📅 Data: {data_atendimento}\n"
        "👨‍⚕️ Profissional: {profissional}\n\n"
        "Não se esqueça do atendimento agendado.\n\n"
        "Atenciosamente,\nEquipe SAPEE"
    ),
}


def gerar_mensagem(
    template_id: str,
    contexto: dict,
    db: Session = None
) -> str:
    """
    Gera mensagem final usando template e contexto.

    Args:
        template_id: Identificador do template (ex: 'ALERTA_FALTAS')
        contexto: Dicionário com variáveis para substituir
        db: Sessão do banco (opcional, para buscar template personalizado)

    Returns:
        Mensagem formatada com variáveis preenchidas
    """
    # Tenta buscar template no banco primeiro
    conteudo_template = None
    if db:
        template_db = db.query(models.TemplateComunicacao).filter(
            models.TemplateComunicacao.codigo == template_id,
            models.TemplateComunicacao.ativo == True
        ).first()
        if template_db:
            conteudo_template = template_db.conteudo

    # Fallback para template padrão do código
    if not conteudo_template:
        conteudo_template = TEMPLATES_PADRAO.get(template_id, "Mensagem não configurada. Por favor, contate o suporte.")

    # Substituir variáveis
    mensagem = conteudo_template
    for chave, valor in contexto.items():
        mensagem = mensagem.replace(f"{{{chave}}}", str(valor) if valor is not None else "N/A")

    return mensagem


def disparar_mensagem_unificado(
    db: Session,
    aluno_matricula: str,
    usuario_id: int,
    template_id: str,
    contexto: dict,
    canal: str = 'SISTEMA',
    destinatario_tipo: str = 'RESPONSAVEL',
    destinatario_nome: str = None,
    destinatario_contato: str = None,
    modulo_origem: str = None,
    eh_lembrete: bool = False,
    data_agendada: datetime = None,
):
    """
    Gera mensagem, envia via canal escolhido e registra no histórico.

    Retorna a comunicação criada.
    """
    # Buscar dados do aluno
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == aluno_matricula).first()
    if not aluno:
        raise ValueError(f"Aluno {aluno_matricula} não encontrado")

    # Gerar mensagem
    mensagem = gerar_mensagem(template_id, contexto, db)

    # Definir destinatário padrão se não informado
    if not destinatario_nome:
        if aluno.nome_responsavel_1:
            destinatario_nome = aluno.nome_responsavel_1
        else:
            destinatario_nome = "Responsável"

    if not destinatario_contato:
        if aluno.telefone_responsavel_1:
            destinatario_contato = aluno.telefone_responsavel_1
        else:
            destinatario_contato = "Contato não informado"

    # Criar registro na tabela comunicacoes
    # Mapear template_id para tipo_comunicacao válido
    tipo_map = {
        'ALERTA_FALTAS': 'FALTAS',
        'RISCO_ALTO_NOTIFICACAO': 'RISCO',
        'RISCO_MUITO_ALTO_NOTIFICACAO': 'RISCO',
        'INTERVENCAO_INICIO': 'ATENDIMENTO',
        'ENCAMINHAMENTO_STATUS': 'ENCAMINHAMENTO',
        'LEMBRETE_ATENDIMENTO': 'LEMBRETE',
    }
    
    # Extrair tipo do template_id (tenta mapeamento, senão usa a primeira parte)
    raw_tipo = template_id.split('_')[0] if '_' in template_id else template_id
    tipo_comunicacao = tipo_map.get(template_id, raw_tipo if raw_tipo in ['FALTAS', 'RISCO', 'ATENDIMENTO', 'LEMBRETE', 'MANUAL', 'ENCAMINHAMENTO'] else 'MANUAL')

    nova_comunicacao = models.Comunicacao(
        aluno_matricula=aluno_matricula,
        usuario_id=usuario_id,
        destinatario_tipo=destinatario_tipo,
        destinatario_nome=destinatario_nome,
        destinatario_contato=destinatario_contato,
        tipo_comunicacao=tipo_comunicacao,
        canal=canal,
        mensagem=mensagem,
        template_id=template_id,
        status='PENDENTE',
        eh_lembrete=eh_lembrete,
        data_agendada=data_agendada,
    )
    db.add(nova_comunicacao)
    try:
        db.commit()
        db.refresh(nova_comunicacao)
    except Exception as e:
        db.rollback()
        raise Exception(f"Erro ao registrar comunicação no banco: {str(e)}")

    # Enviar mensagem baseado no canal
    sucesso_envio = False
    erro_motivo = None

    if canal == 'SISTEMA':
        sucesso_envio = True  # Apenas log interno
    elif canal == 'TELEGRAM':
        sucesso_envio = telegram_notifier.enviar_mensagem(mensagem)
    elif canal == 'WHATSAPP':
        # TODO: Integrar com API de WhatsApp (Twilio/Waha)
        # Por enquanto, simula envio
        print(f"📱 Simulando envio WhatsApp para {destinatario_contato}: {mensagem[:50]}...")
        sucesso_envio = True
    elif canal == 'EMAIL':
        # TODO: Integrar com SendGrid/AWS SES
        print(f"📧 Simulando envio Email para {destinatario_contato}: {mensagem[:50]}...")
        sucesso_envio = True
    else:
        erro_motivo = f"Canal {canal} não suportado para envio automático."

    # Atualizar status
    if sucesso_envio:
        nova_comunicacao.status = 'ENVIADA'
        nova_comunicacao.data_envio = datetime.now()
        nova_comunicacao.data_envio_efetivo = datetime.now()
    else:
        nova_comunicacao.status = 'FALHA'
        nova_comunicacao.erro_motivo = erro_motivo

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # Não lança exceção aqui para não quebrar o fluxo se o registro inicial já foi feito,
        # mas idealmente deveríamos logar isso.
        print(f"Erro ao atualizar status da comunicação: {str(e)}")

    return nova_comunicacao
