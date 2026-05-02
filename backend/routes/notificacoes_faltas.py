"""
Rotas de Notificação - Alertas de Faltas Consecutivas via Telegram
SAPEE DEWAS Backend
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
import database, models, auth
from notificacoes import notifier

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

    # Enviar alerta via Telegram
    sucesso = notifier.enviar_alerta_faltas_seguidas(
        dados_aluno,
        int(alerta.quantidade_faltas)
    )

    if sucesso:
        return {
            "message": f"✅ Alerta de faltas enviado! {alerta.quantidade_faltas} faltas consecutivas",
            "alerta_id": alerta_id,
            "quantidade_faltas": alerta.quantidade_faltas
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="❌ Erro ao enviar alerta via Telegram. Verifique as configurações."
        )
