"""
Testes das integrações externas do SAPEE (Telegram, WhatsApp/Twilio e E-mail).

Usam mocks para validar a lógica de envio sem depender de credenciais reais
nem de chamadas de rede.
"""

from unittest.mock import MagicMock, patch

import email_utils
import notificacoes
import servico_comunicacao


# ============================================================
# Telegram
# ============================================================


def test_telegram_desabilitado_nao_envia(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ENABLED", "False")
    notifier = notificacoes.TelegramNotifier()
    assert notifier.enviar_mensagem("teste") is False


def test_telegram_envia_quando_habilitado(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ENABLED", "True")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "token-teste")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "123456")
    notifier = notificacoes.TelegramNotifier()

    with patch("notificacoes.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200)

        assert notifier.enviar_mensagem("ola mundo") is True

        mock_post.assert_called_once()
        url, = mock_post.call_args.args
        assert "api.telegram.org" in url
        assert mock_post.call_args.kwargs["json"]["chat_id"] == "123456"


def test_telegram_erro_http_retorna_false(monkeypatch):
    monkeypatch.setenv("TELEGRAM_ENABLED", "True")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "token-teste")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "123")
    notifier = notificacoes.TelegramNotifier()

    with patch("notificacoes.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=500, text="erro interno")
        assert notifier.enviar_mensagem("ola") is False


# ============================================================
# WhatsApp (Twilio)
# ============================================================


def test_whatsapp_nao_configurado(monkeypatch):
    monkeypatch.setenv("TWILIO_ENABLED", "False")
    sucesso, erro = servico_comunicacao._enviar_whatsapp("+5599999999999", "mensagem")
    assert sucesso is False
    assert "configurado" in erro


def test_whatsapp_envia_quando_configurado(monkeypatch):
    monkeypatch.setenv("TWILIO_ENABLED", "True")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "ACxxxxxxxx")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "token")
    monkeypatch.setenv("TWILIO_WHATSAPP_NUMBER", "+14155238886")

    resposta = MagicMock(status=201)
    resposta.__enter__ = MagicMock(return_value=resposta)
    resposta.__exit__ = MagicMock(return_value=False)

    with patch("urllib.request.urlopen", return_value=resposta) as mock_open:
        sucesso, erro = servico_comunicacao._enviar_whatsapp("+5599999999999", "mensagem")

    assert sucesso is True
    assert erro is None
    mock_open.assert_called_once()


# ============================================================
# E-mail (SMTP)
# ============================================================


def test_email_nao_configurado(monkeypatch):
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.delenv("SMTP_PASS", raising=False)
    resultado = email_utils.enviar_email("destino@teste.com", "Assunto", "corpo")
    assert resultado["sucesso"] is False


def test_email_envia_com_smtp_configurado(monkeypatch):
    monkeypatch.setenv("SMTP_USER", "remetente@teste.com")
    monkeypatch.setenv("SMTP_PASS", "senha-app")
    monkeypatch.setenv("EMAIL_FROM", "remetente@teste.com")

    servidor = MagicMock()
    servidor.__enter__ = MagicMock(return_value=servidor)
    servidor.__exit__ = MagicMock(return_value=False)

    with patch("email_utils.smtplib.SMTP", return_value=servidor):
        resultado = email_utils.enviar_email("destino@teste.com", "Assunto", "corpo")

    assert resultado["sucesso"] is True
    servidor.starttls.assert_called_once()
    servidor.login.assert_called_once()
    servidor.sendmail.assert_called_once()


def test_servico_comunicacao_delega_email(monkeypatch):
    """O serviço unificado deve delegar para email_utils e reportar sucesso."""
    with patch(
        "servico_comunicacao.enviar_email",
        return_value={"sucesso": True, "mensagem": "ok"},
    ) as mock_enviar:
        sucesso, erro = servico_comunicacao._enviar_email("destino@teste.com", "Nome", "mensagem")

    assert sucesso is True
    assert erro is None
    mock_enviar.assert_called_once()
