from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import os
import smtplib
from email.mime.text import MIMEText

import auth
import database
import models
import schemas
import notificacoes
import email_utils
import servico_comunicacao

router = APIRouter()
# ============================================
# ENDPOINTS DE CONFIGURAÇÕES DO SISTEMA
# ============================================


@router.get("/configuracoes", response_model=List[schemas.ConfiguracaoSistemaResponse])
def listar_configuracoes(
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Listar todas as configurações do sistema."""
    return db.query(models.ConfiguracaoSistema).all()


@router.get("/configuracoes/{chave}", response_model=schemas.ConfiguracaoSistemaResponse)
def obter_configuracao(
    chave: str,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Obter configuração específica por chave."""
    config = (
        db.query(models.ConfiguracaoSistema)
        .filter(models.ConfiguracaoSistema.chave == chave)
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return config


@router.put("/configuracoes/{chave}", response_model=schemas.ConfiguracaoSistemaResponse)
def atualizar_configuracao(
    chave: str,
    config_update: schemas.ConfiguracaoSistemaUpdate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar valor de uma configuração."""
    config = (
        db.query(models.ConfiguracaoSistema)
        .filter(models.ConfiguracaoSistema.chave == chave)
        .first()
    )
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")

    config.valor = config_update.valor
    db.commit()
    db.refresh(config)
    return config


@router.post("/configuracoes/batch")
def atualizar_configuracoes_em_lote(
    configs: dict,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """
    Atualizar múltiplas configurações de uma vez.
    Recebe um dicionário {chave: valor}.
    """
    atualizadas = []
    for chave, novo_valor in configs.items():
        config = (
            db.query(models.ConfiguracaoSistema)
            .filter(models.ConfiguracaoSistema.chave == chave)
            .first()
        )
        if config:
            config.valor = str(novo_valor)
            atualizadas.append(chave)

    db.commit()
    return {"message": f"{len(atualizadas)} configurações atualizadas", "atualizadas": atualizadas}


@router.post("/configuracoes/testar-canal", response_model=schemas.CanalConfigTestResponse)
def testar_canal_comunicacao(
    config_test: schemas.CanalConfigTestRequest,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
):
    """
    Testar configuração de canal de comunicação.
    Envia uma mensagem de teste para validar credenciais.
    """
    try:
        if config_test.canal == "EMAIL":
            # Testar SMTP
            host = config_test.smtp_host or "smtp.gmail.com"
            port = config_test.smtp_port or 587
            user = config_test.smtp_user
            password = config_test.smtp_pass
            from_addr = config_test.email_from or user
            from_name = config_test.email_from_name or "SAPEE Teste"

            if not user or not password:
                return schemas.CanalConfigTestResponse(
                    sucesso=False,
                    mensagem="Usuário e senha SMTP são obrigatórios",
                )

            msg = MIMEText(
                f"Este é um email de teste enviado pelo SAPEE.\n\n"
                f"Servidor: {host}:{port}\n"
                f"Remetente: {from_addr}\n\n"
                f"Se você recebeu este email, a configuração SMTP está funcionando corretamente! ✅",
                "plain",
                "utf-8",
            )
            msg["Subject"] = "SAPEE - Teste de Configuração de Email"
            msg["From"] = f"{from_name} <{from_addr}>"
            msg["To"] = from_addr  # Envia para si mesmo como teste

            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(user, password)
                server.sendmail(from_addr, [from_addr], msg.as_string())

            return schemas.CanalConfigTestResponse(
                sucesso=True,
                mensagem=f"Email de teste enviado com sucesso para {from_addr}",
            )

        elif config_test.canal == "TELEGRAM":
            # Testar Telegram
            bot_token = config_test.telegram_bot_token
            chat_id = config_test.telegram_chat_id

            if not bot_token or not chat_id:
                return schemas.CanalConfigTestResponse(
                    sucesso=False,
                    mensagem="Token do bot e Chat ID são obrigatórios",
                )

            import requests

            mensagem = (
                "📢 *SAPEE - Teste de Configuração Telegram*\n\n"
                "Este é um teste de envio de mensagem via Telegram.\n"
                "Se você recebeu esta mensagem, a configuração está funcionando corretamente! ✅"
            )
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": mensagem,
                "parse_mode": "Markdown",
            }
            resp = requests.post(url, json=payload, timeout=15)
            data = resp.json()

            if resp.status_code == 200 and data.get("ok"):
                return schemas.CanalConfigTestResponse(
                    sucesso=True,
                    mensagem="Mensagem de teste enviada com sucesso para o Telegram",
                )
            else:
                erro = data.get("description", str(data))
                return schemas.CanalConfigTestResponse(
                    sucesso=False,
                    mensagem=f"Erro do Telegram: {erro}",
                    detalhes=erro,
                )

        elif config_test.canal == "WHATSAPP":
            # Testar Twilio/WhatsApp
            account_sid = config_test.twilio_account_sid
            auth_token = config_test.twilio_auth_token
            from_number = config_test.twilio_whatsapp_number

            if not account_sid or not auth_token or not from_number:
                return schemas.CanalConfigTestResponse(
                    sucesso=False,
                    mensagem="Account SID, Auth Token e número Twilio são obrigatórios",
                )

            import urllib.request
            import base64

            # Testa a listagem de contas (não envia mensagem, apenas valida credenciais)
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json"
            credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
            req = urllib.request.Request(url)
            req.add_header("Authorization", f"Basic {credentials}")
            resp = urllib.request.urlopen(req, timeout=15)

            if resp.status == 200:
                return schemas.CanalConfigTestResponse(
                    sucesso=True,
                    mensagem=f"Conexão com Twilio validada com sucesso (conta: {account_sid[-4:]})",
                )
            else:
                return schemas.CanalConfigTestResponse(
                    sucesso=False,
                    mensagem="Falha na validação com Twilio",
                    detalhes=str(resp.status),
                )

        else:
            return schemas.CanalConfigTestResponse(
                sucesso=False,
                mensagem=f"Canal desconhecido: {config_test.canal}",
            )

    except smtplib.SMTPAuthenticationError:
        return schemas.CanalConfigTestResponse(
            sucesso=False,
            mensagem="Falha na autenticação SMTP. Verifique usuário e senha.",
        )
    except smtplib.SMTPException as e:
        return schemas.CanalConfigTestResponse(
            sucesso=False,
            mensagem=f"Erro SMTP: {str(e)}",
            detalhes=str(e),
        )
    except Exception as e:
        return schemas.CanalConfigTestResponse(
            sucesso=False,
            mensagem=f"Erro ao testar configuração: {str(e)}",
            detalhes=str(e),
        )
