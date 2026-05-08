"""
Rotas de Notificação - Alertas de Faltas Consecutivas via Telegram
SAPEE DEWAS Backend
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
import database, models, auth
from notificacoes import notifier
from servico_comunicacao import disparar_mensagem_unificado

router = APIRouter(prefix="/api/v1/notificacoes-faltas", tags=["Notificações de Faltas"])


@router.post("/alerta-faltas/{alerta_id}")
def enviar_alerta_faltas_consecutivas(
    alerta_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Enviar alerta de faltas consecutivas para Telegram
    """
    # Buscar alerta com dados do aluno
    alerta = db.query(models.AlertaFaltasConsecutivas).options(
        joinedload(models.AlertaFaltasConsecutivas.aluno).joinedload(models.Aluno.curso)
    ).filter(
        models.AlertaFaltasConsecutivas.id == alerta_id
    ).first()

    if not alerta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta não encontrado"
        )

    aluno = alerta.aluno

    # Montar dados do aluno para notificação
    dados_aluno = {
        "nome": aluno.nome,
        "matricula": aluno.matricula,
        "curso": aluno.curso.nome if aluno.curso else "N/A",
    }

    # Gerar mensagem do alerta
    mensagem = notifier.gerar_mensagem_faltas_seguidas(dados_aluno, int(alerta.quantidade_faltas))

    # Disparar e registrar via serviço unificado
    try:
        comunicacao = disparar_mensagem_unificado(
            db=db,
            aluno_matricula=aluno.matricula,
            usuario_id=current_user.id,
            template_id='ALERTA_FALTAS',
            contexto={
                "nome_aluno": aluno.nome,
                "nome_responsavel": aluno.nome_responsavel_1 or "Responsável",
                "qtd_faltas": int(alerta.quantidade_faltas),
                "data_inicio": alerta.data_inicio_faltas.strftime('%d/%m/%Y') if alerta.data_inicio_faltas else 'N/A',
                "data_fim": alerta.data_fim_faltas.strftime('%d/%m/%Y') if alerta.data_fim_faltas else 'N/A',
            },
            canal="TELEGRAM",
            destinatario_tipo="COORDENADOR",
            destinatario_nome="Coordenação",
            destinatario_contato="Canal Telegram",
            modulo_origem="ALERTA_FALTAS",
        )

        if comunicacao.status == 'FALHA':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="❌ Erro ao enviar alerta via Telegram. Verifique as configurações."
            )

        return {
            "message": f"✅ Alerta de faltas enviado e registrado! {alerta.quantidade_faltas} faltas consecutivas",
            "alerta_id": alerta_id,
            "quantidade_faltas": alerta.quantidade_faltas,
            "comunicacao_id": comunicacao.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"❌ Erro interno: {str(e)}"
        )
