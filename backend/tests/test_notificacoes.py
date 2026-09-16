"""
Testes para o módulo de notificações Telegram.
"""

import os
from unittest.mock import MagicMock, patch

import pytest

from notificacoes import TelegramNotifier, notifier


class TestTelegramNotifier:
    def test_init_with_env_vars(self):
        with patch.dict(os.environ, {
            "TELEGRAM_BOT_TOKEN": "test_token",
            "TELEGRAM_CHAT_ID": "12345",
            "TELEGRAM_ENABLED": "true",
        }):
            tn = TelegramNotifier()
            assert tn.bot_token == "test_token"
            assert tn.chat_id == "12345"
            assert tn.enabled is True

    def test_init_disabled_by_default(self):
        with patch.dict(os.environ, {}, clear=True):
            tn = TelegramNotifier()
            assert tn.enabled is False

    def test_enviar_mensagem_disabled(self):
        tn = TelegramNotifier()
        tn.enabled = False
        result = tn.enviar_mensagem("teste")
        assert result is False

    def test_enviar_mensagem_sem_token(self):
        tn = TelegramNotifier()
        tn.enabled = True
        tn.bot_token = ""
        tn.chat_id = ""
        result = tn.enviar_mensagem("teste")
        assert result is False

    @patch("notificacoes.requests.post")
    def test_enviar_mensagem_sucesso(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        tn = TelegramNotifier()
        tn.enabled = True
        tn.bot_token = "token123"
        tn.chat_id = "chat456"

        result = tn.enviar_mensagem("teste")
        assert result is True

    @patch("notificacoes.requests.post")
    def test_enviar_mensagem_erro_api(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_post.return_value = mock_response

        tn = TelegramNotifier()
        tn.enabled = True
        tn.bot_token = "token123"
        tn.chat_id = "chat456"

        result = tn.enviar_mensagem("teste")
        assert result is False

    @patch("notificacoes.requests.post")
    def test_enviar_mensagem_excecao(self, mock_post):
        mock_post.side_effect = Exception("Connection error")

        tn = TelegramNotifier()
        tn.enabled = True
        tn.bot_token = "token123"
        tn.chat_id = "chat456"

        result = tn.enviar_mensagem("teste")
        assert result is False

    def test_enviar_alerta_frequencia_disabled(self):
        tn = TelegramNotifier()
        tn.enabled = False
        result = tn.enviar_alerta_frequencia(
            {"nome": "Teste", "matricula": "123", "curso": "ADS"}, 15.5
        )
        assert result is False

    def test_gerar_mensagem_faltas_seguidas(self):
        tn = TelegramNotifier()
        msg = tn.gerar_mensagem_faltas_seguidas(
            {"nome": "Teste", "matricula": "123", "curso": "ADS"}, 3
        )
        assert "Teste" in msg
        assert "3" in msg


def test_notifier_global_instance():
    assert notifier is not None
    assert isinstance(notifier, TelegramNotifier)
