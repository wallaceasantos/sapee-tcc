from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

import auth
import database
import models

router = APIRouter()
# ============================================
# ENDPOINTS - AUDIT LOGS
# ============================================


@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    acao: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar logs de auditoria"""
    query = db.query(models.AuditLog).options(joinedload(models.AuditLog.usuario))

    if acao:
        query = query.filter(models.AuditLog.acao.ilike(f"%{acao}%"))

    logs = query.order_by(models.AuditLog.criado_at.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/audit-logs/{log_id}")
def get_audit_log_by_id(
    log_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Buscar log de auditoria por ID"""
    log = (
        db.query(models.AuditLog)
        .options(joinedload(models.AuditLog.usuario))
        .filter(models.AuditLog.id == log_id)
        .first()
    )
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log de auditoria não encontrado",
        )
    return log


@router.post("/audit-logs")
def create_audit_log(
    log_data: dict,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Criar novo log de auditoria"""
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao=log_data.get("acao", ""),
        detalhes=log_data.get("detalhes", ""),
        ip_address=log_data.get("ip_address", ""),
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
