"""
Módulo de envio de emails - SAPEE DEWAS
Envio profissional com proteção anti-spam e templates HTML.

Boas práticas implementadas:
- Multipart/Alternative (texto puro + HTML) para maior compatibilidade
- Message-ID único por mensagem para rastreabilidade
- Cabeçalhos Date, Reply-To, X-Priority e X-Mailer
- From com nome amigável (display name)
- Template HTML responsivo e profissional
- Conexão TLS e timeout configurável
"""

import logging
import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)


def get_smtp_config() -> dict:
    """Retorna configuração SMTP do .env com fallbacks seguros."""
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASS", "").strip(),
        "from_email": os.getenv("EMAIL_FROM", os.getenv("SMTP_USER", "")).strip(),
        "from_name": os.getenv("EMAIL_FROM_NAME", "SAPEE DEWAS"),
    }


def is_configured() -> bool:
    """Verifica se o SMTP está configurado para envio real."""
    config = get_smtp_config()
    return bool(config["user"] and config["password"])


def gerar_template_html(
    aluno_nome: str,
    curso_nome: str,
    link_acesso: str,
    validade: str,
    token: str,
) -> str:
    """
    Gera o template HTML do email de convite para o questionário.

    Design limpo e profissional para evitar classificação como spam.
    Utiliza tabelas (compatível com a maioria dos clientes de email).
    """
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Questionário Psicossocial - SAPEE DEWAS</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:30px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow:hidden;">

                    <!-- Cabeçalho -->
                    <tr>
                        <td style="background:linear-gradient(135deg, #1e40af, #3b82f6); padding:32px 40px; text-align:center;">
                            <h1 style="color:#ffffff; font-size:24px; font-weight:700; margin:0 0 8px 0;">
                                🎓 SAPEE DEWAS
                            </h1>
                            <p style="color:#bfdbfe; font-size:14px; margin:0;">
                                Sistema de Alerta de Predição de Evasão Escolar
                            </p>
                        </td>
                    </tr>

                    <!-- Corpo -->
                    <tr>
                        <td style="padding:32px 40px;">

                            <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 16px 0;">
                                Olá, <strong>{aluno_nome}</strong>!
                            </p>

                            <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 24px 0;">
                                Você foi convidado(a) para responder o <strong>Questionário Psicossocial</strong> do SAPEE DEWAS.
                                Suas respostas nos ajudarão a entender melhor sua experiência acadêmica e oferecer o suporte adequado.
                            </p>

                            <!-- Dados do Aluno -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:24px;">
                                <tr>
                                    <td style="padding:16px 20px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="color:#64748b; font-size:13px; padding:4px 0;">👤 <strong>Aluno:</strong></td>
                                                <td style="color:#1e293b; font-size:13px; padding:4px 0;">{aluno_nome}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#64748b; font-size:13px; padding:4px 0;">📚 <strong>Curso:</strong></td>
                                                <td style="color:#1e293b; font-size:13px; padding:4px 0;">{curso_nome}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#64748b; font-size:13px; padding:4px 0;">⏰ <strong>Validade:</strong></td>
                                                <td style="color:#1e293b; font-size:13px; padding:4px 0;">{validade}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Botão de Acesso -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                <tr>
                                    <td align="center">
                                        <a href="{link_acesso}" style="display:inline-block; background:#2563eb; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 40px; border-radius:8px; border:1px solid #1d4ed8;">
                                            📝 Responder Questionário
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Link alternativo -->
                            <p style="color:#64748b; font-size:12px; line-height:1.5; margin:0 0 8px 0; text-align:center; word-break:break-all;">
                                Se o botão não funcionar, copie e cole este link no navegador:<br>
                                <a href="{link_acesso}" style="color:#3b82f6;">{link_acesso}</a>
                            </p>

                            <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;">

                            <!-- Informações importantes -->
                            <p style="color:#64748b; font-size:12px; line-height:1.5; margin:0 0 8px 0;">
                                ⚠️ O link é pessoal e intransferível. Não compartilhe com terceiros.
                            </p>
                            <p style="color:#64748b; font-size:12px; line-height:1.5; margin:0 0 8px 0;">
                                🔒 Suas respostas são <strong>confidenciais</strong> e serão usadas apenas para fins de acompanhamento acadêmico.
                            </p>
                            <p style="color:#64748b; font-size:12px; line-height:1.5; margin:0;">
                                ⏰ Este convite expira em <strong>{validade}</strong>.
                            </p>

                        </td>
                    </tr>

                    <!-- Rodapé -->
                    <tr>
                        <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 40px; text-align:center;">
                            <p style="color:#94a3b8; font-size:11px; line-height:1.5; margin:0 0 4px 0;">
                                SAPEE DEWAS — Sistema de Alerta de Predição de Evasão Escolar
                            </p>
                            <p style="color:#94a3b8; font-size:11px; line-height:1.5; margin:0;">
                                Este é um email automático. Em caso de dúvidas, procure a coordenação do seu curso.
                            </p>
                        </td>
                    </tr>

                </table>

                <!-- Disclaimer no rodapé externo -->
                <p style="color:#94a3b8; font-size:10px; margin-top:16px; text-align:center; max-width:600px;">
                    Você recebeu este email porque está cadastrado no sistema SAPEE DEWAS.
                    Caso não reconheça este convite, entre em contato com a coordenação acadêmica.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>"""


def enviar_email(
    destinatario: str,
    assunto: str,
    corpo_texto: str,
    corpo_html: str | None = None,
    reply_to: str | None = None,
) -> dict:
    """
    Envia email com boas práticas anti-spam.

    Args:
        destinatario: Email do destinatário
        assunto: Assunto do email (mantido simples para evitar spam)
        corpo_texto: Versão texto puro (obrigatória)
        corpo_html: Versão HTML (opcional, recomendada)
        reply_to: Email para resposta (padrão: from_email)

    Returns:
        dict com {"sucesso": bool, "mensagem": str, "message_id": str}
    """
    config = get_smtp_config()

    logger.debug("Config: host=%s, port=%s, user=%s, from=%s", config['host'], config['port'], config['user'], config['from_email'])

    if not config["user"] or not config["password"]:
        return {
            "sucesso": False,
            "mensagem": "SMTP não configurado. Defina SMTP_USER e SMTP_PASS no .env",
            "message_id": "",
        }

    # Message-ID único para rastreabilidade e prevenção de spam
    msg_id = make_msgid(domain=config["from_email"].split("@")[-1])

    # Criar mensagem multipart
    if corpo_html:
        msg = MIMEMultipart("alternative")
    else:
        msg = MIMEMultipart()

    # === Cabeçalhos anti-spam ===

    # From com display name (importante: evita "unknown sender")
    msg["From"] = formataddr((config["from_name"], config["from_email"]))

    # To
    msg["To"] = destinatario

    # Subject (mantido limpo, sem palavras de gatilho)
    msg["Subject"] = assunto

    # Date em formato RFC 2822
    msg["Date"] = formatdate(localtime=True)

    # Message-ID único
    msg["Message-ID"] = msg_id

    # Reply-To (responder para o mesmo remetente)
    msg["Reply-To"] = reply_to or config["from_email"]

    # Headers adicionais anti-spam
    msg["X-Priority"] = "3"  # Normal (1=urgente, 3=normal, 5=baixa)
    msg["X-Mailer"] = "SAPEE-DEWAS-v1"
    msg["X-Auto-Response-Suppress"] = "All"  # Evita loops de auto-responder

    # Anexar corpo texto (sempre primeiro = fallback para clientes sem HTML)
    msg.attach(MIMEText(corpo_texto, "plain", "utf-8"))

    # Anexar corpo HTML (se fornecido)
    if corpo_html:
        msg.attach(MIMEText(corpo_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(config["host"], config["port"], timeout=30) as server:
            # Identificação EHLO (ajuda na reputação)
            server.ehlo()

            # TLS
            server.starttls()
            server.ehlo()

            # Login
            server.login(config["user"], config["password"])

            # Envio
            server.sendmail(config["from_email"], destinatario, msg.as_string())

        return {
            "sucesso": True,
            "mensagem": f"Email enviado com sucesso para {destinatario}",
            "message_id": msg_id,
        }

    except smtplib.SMTPAuthenticationError as e:
        logger.error("Erro autenticação: %s", e)
        return {
            "sucesso": False,
            "mensagem": "Falha de autenticação SMTP. Verifique SMTP_USER e SMTP_PASS (use senha de app, não a senha da conta).",
            "message_id": msg_id,
        }
    except smtplib.SMTPException as e:
        logger.error("Erro SMTP: %s", e)
        return {
            "sucesso": False,
            "mensagem": f"Erro SMTP: {str(e)}",
            "message_id": msg_id,
        }
    except Exception as e:
        logger.error("Erro inesperado: %s: %s", type(e).__name__, e)
        return {
            "sucesso": False,
            "mensagem": f"Erro ao enviar email: {str(e)}",
            "message_id": msg_id,
        }


def enviar_token_questionario(
    destinatario: str,
    aluno_nome: str,
    curso_nome: str,
    link_acesso: str,
    validade: str,
    token: str,
) -> dict:
    """
    Envia email com token de acesso ao questionário psicossocial.
    Encapsula a criação do template e o envio em uma chamada única.
    """
    assunto = "Questionário Psicossocial - SAPEE DEWAS"

    corpo_texto = f"""Olá, {aluno_nome}!

Você recebeu um convite para responder o Questionário Psicossocial do SAPEE DEWAS.

👤 Aluno: {aluno_nome}
📚 Curso: {curso_nome}
⏰ Válido até: {validade}

🔗 Link de acesso (não precisa de login):
{link_acesso}

Por favor, responda com atenção. Suas respostas são confidenciais.

Atenciosamente,
Equipe SAPEE DEWAS

---
Este é um email automático. Em caso de dúvidas, procure a coordenação do seu curso.
"""

    corpo_html = gerar_template_html(
        aluno_nome=aluno_nome,
        curso_nome=curso_nome,
        link_acesso=link_acesso,
        validade=validade,
        token=token,
    )

    return enviar_email(
        destinatario=destinatario,
        assunto=assunto,
        corpo_texto=corpo_texto,
        corpo_html=corpo_html,
    )
