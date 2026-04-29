"""
Endpoints de Notificações e Alertas
SAPEE DEWAS Backend
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, database
from auth import get_current_user
from notificacoes import notifier, enviar_alerta_frequencia, enviar_alerta_risco

router = APIRouter(prefix="/notificacoes", tags=["Notificações"])


@router.post("/testar-telegram")
def testar_telegram(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Testar envio de notificação Telegram
    """
    mensagem = """
✅ <b>Teste de Notificação - SAPEE DEWAS</b>

Sistema de alertas configurado com sucesso!

<b>Bot:</b> SAPEE Alertas
<b>Data:</b> Data atual
<b>Usuário:</b> {current_user.nome}

Este é um teste de notificação via Telegram.
    """.format(current_user=current_user)
    
    sucesso = notifier.enviar_mensagem(mensagem)
    
    if sucesso:
        return {"message": "✅ Notificação enviada com sucesso!", "status": "success"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="❌ Erro ao enviar notificação. Verifique as configurações do Telegram."
        )


@router.get("/alertas")
def listar_alertas(
    nivel: Optional[str] = None,
    limit: int = 50,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Listar alertas de alunos em risco
    
    Filtros:
    - nivel: CRITICO, ALTO, MEDIO, BAIXO
    - limit: Quantidade máxima de alertas
    """
    from sqlalchemy import desc
    
    # Buscar alunos com predição de risco ALTO ou CRITICO
    query = db.query(models.Aluno, models.Predicao).join(
        models.Predicao,
        models.Aluno.matricula == models.Predicao.aluno_id
    )
    
    if nivel:
        query = query.filter(models.Predicao.nivel_risco == nivel.upper())
    
    # Filtrar apenas ALTO e CRITICO por padrão
    query = query.filter(
        models.Predicao.nivel_risco.in_(['ALTO', 'CRITICO'])
    )
    
    # Ordenar por risco (maior primeiro)
    query = query.order_by(desc(models.Predicao.risco_evasao))
    
    # Limitar resultados
    resultados = query.limit(limit).all()
    
    alertas = []
    for aluno, predicao in resultados:
        alertas.append({
            "id": predicao.id,
            "aluno": {
                "matricula": aluno.matricula,
                "nome": aluno.nome,
                "curso": aluno.curso.nome if aluno.curso else "N/A",
            },
            "risco_evasao": float(predicao.risco_evasao),
            "nivel_risco": predicao.nivel_risco,
            "fatores_principais": predicao.fatores_principais,
            "data_predicao": predicao.data_predicao.isoformat() if predicao.data_predicao else None,
        })
    
    return {
        "total": len(alertas),
        "alertas": alertas
    }


@router.post("/alerta-frequencia")
def enviar_alerta_frequencia_endpoint(
    matricula: str,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Enviar alerta de queda de frequência para Telegram
    
    Usa a última frequência e compara com a anterior
    """
    # Buscar aluno
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == matricula
    ).first()
    
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )
    
    # Buscar últimas 2 frequências
    frequencias = db.query(models.FrequenciaMensal).filter(
        models.FrequenciaMensal.aluno_id == matricula
    ).order_by(
        models.FrequenciaMensal.ano.desc(),
        models.FrequenciaMensal.mes.desc()
    ).limit(2).all()
    
    if len(frequencias) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aluno precisa de pelo menos 2 meses de frequência para comparar"
        )
    
    freq_atual = frequencias[0].frequencia
    freq_anterior = frequencias[1].frequencia
    
    queda = freq_anterior - freq_atual
    
    if queda <= 0:
        return {
            "message": "✅ Não há queda de frequência",
            "frequencia_atual": freq_atual,
            "frequencia_anterior": freq_anterior,
            "variacao": queda
        }
    
    # Enviar alerta
    dados_aluno = {
        "nome": aluno.nome,
        "matricula": aluno.matricula,
        "curso": aluno.curso.nome if aluno.curso else "N/A",
        "frequencia_atual": freq_atual,
        "frequencia_anterior": freq_anterior,
    }
    
    sucesso = enviar_alerta_frequencia(dados_aluno, queda)
    
    if sucesso:
        return {
            "message": f"✅ Alerta enviado! Queda de {queda:.1f}%",
            "frequencia_atual": freq_atual,
            "frequencia_anterior": freq_anterior,
            "variacao": queda
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="❌ Erro ao enviar alerta"
        )


@router.post("/alerta-geral/{matricula}")
def enviar_alerta_geral(
    matricula: str,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Enviar alerta geral de risco de evasão para Telegram
    """
    # Buscar aluno e predição
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == matricula
    ).first()
    
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )
    
    predicao = db.query(models.Predicao).filter(
        models.Predicao.aluno_id == matricula
    ).order_by(models.Predicao.data_predicao.desc()).first()
    
    if not predicao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Predição não encontrada"
        )
    
    # Enviar alerta
    dados_aluno = {
        "nome": aluno.nome,
        "matricula": aluno.matricula,
        "curso": aluno.curso.nome if aluno.curso else "N/A",
        "fatores_risco": predicao.fatores_principais or "Não identificados",
    }
    
    sucesso = enviar_alerta_risco(
        dados_aluno,
        float(predicao.risco_evasao),
        predicao.nivel_risco
    )
    
    if sucesso:
        return {
            "message": f"✅ Alerta enviado! Risco: {predicao.nivel_risco} ({predicao.risco_evasao:.1f}%)",
            "risco": float(predicao.risco_evasao),
            "nivel": predicao.nivel_risco
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="❌ Erro ao enviar alerta"
        )
