"""
Serviço de Notificação via Telegram
SAPEE DEWAS Backend
"""

import requests
import os
from dotenv import load_dotenv
from datetime import datetime

# Carregar variáveis de ambiente
load_dotenv()

class TelegramNotifier:
    """Envia notificações para Telegram"""
    
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.enabled = os.getenv('TELEGRAM_ENABLED', 'False').lower() == 'true'
        
    def enviar_mensagem(self, mensagem: str, parse_mode: str = 'HTML') -> bool:
        """
        Envia mensagem para o chat do Telegram
        
        Args:
            mensagem: Texto da mensagem (suporta HTML)
            parse_mode: 'HTML' ou 'Markdown'
            
        Returns:
            bool: True se enviado com sucesso
        """
        if not self.enabled:
            print(f"⚠️  Telegram desabilitado: {mensagem}")
            return False
            
        if not self.bot_token or not self.chat_id:
            print(f"❌ Token ou Chat ID não configurados")
            return False
        
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        
        data = {
            'chat_id': self.chat_id,
            'text': mensagem,
            'parse_mode': parse_mode
        }
        
        try:
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ Notificação enviada: {mensagem[:50]}...")
                return True
            else:
                print(f"❌ Erro ao enviar: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exceção ao enviar: {str(e)}")
            return False
    
    def enviar_alerta_frequencia(self, aluno: dict, queda_percentual: float) -> bool:
        """
        Envia alerta de queda brusca de frequência
        
        Args:
            aluno: Dados do aluno (nome, matricula, frequencia_atual, frequencia_anterior)
            queda_percentual: Porcentagem de queda (ex: 15.5)
        """
        emoji = "🚨" if queda_percentual > 15 else "⚠️"
        nivel = "CRÍTICO" if queda_percentual > 15 else "ALTO"
        
        mensagem = f"""
{emoji} <b>ALERTA DE FREQUÊNCIA - {nivel}</b>

<b>Aluno:</b> {aluno.get('nome', 'N/A')}
<b>Matrícula:</b> {aluno.get('matricula', 'N/A')}
<b>Curso:</b> {aluno.get('curso', 'N/A')}

<b>Queda de Frequência:</b> {queda_percentual:.1f}%
<b>Frequência Anterior:</b> {aluno.get('frequencia_anterior', 0):.1f}%
<b>Frequência Atual:</b> {aluno.get('frequencia_atual', 0):.1f}%

<b>Ação Sugerida:</b>
• Entrar em contato com o aluno
• Verificar motivo das faltas
• Agendar reunião com pedagogo

<b>Data:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}
        """.strip()
        
        return self.enviar_mensagem(mensagem)
    
    def enviar_alerta_media(self, aluno: dict, media: float, meses: int) -> bool:
        """
        Envia alerta de média baixa
        
        Args:
            aluno: Dados do aluno
            media: Média atual do aluno
            meses: Número de meses com média baixa
        """
        emoji = "🚨" if media < 4.0 else "⚠️"
        nivel = "CRÍTICO" if media < 4.0 else "ALTO"
        
        mensagem = f"""
{emoji} <b>ALERTA DE DESEMPENHO - {nivel}</b>

<b>Aluno:</b> {aluno.get('nome', 'N/A')}
<b>Matrícula:</b> {aluno.get('matricula', 'N/A')}
<b>Curso:</b> {aluno.get('curso', 'N/A')}

<b>Média Atual:</b> {media:.1f}
<b>Período:</b> {meses} meses consecutivos

<b>Ação Sugerida:</b>
• Oferecer reforço acadêmico
• Verificar dificuldades de aprendizagem
• Encaminhar para orientação pedagógica

<b>Data:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}
        """.strip()
        
        return self.enviar_mensagem(mensagem)
    
    def enviar_alerta_faltas_seguidas(self, aluno: dict, faltas: int) -> bool:
        """
        Envia alerta de faltas consecutivas
        
        Args:
            aluno: Dados do aluno
            faltas: Número de faltas consecutivas
        """
        emoji = "⚠️"
        nivel = "MÉDIO"
        
        mensagem = f"""
{emoji} <b>ALERTA DE FALTAS - {nivel}</b>

<b>Aluno:</b> {aluno.get('nome', 'N/A')}
<b>Matrícula:</b> {aluno.get('matricula', 'N/A')}
<b>Curso:</b> {aluno.get('curso', 'N/A')}

<b>Faltas Consecutivas:</b> {faltas}

<b>Ação Sugerida:</b>
• Entrar em contato com o aluno
• Verificar justificativas
• Monitorar frequência nas próximas semanas

<b>Data:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}
        """.strip()
        
        return self.enviar_mensagem(mensagem)
    
    def enviar_alerta_risco_evasao(self, aluno: dict, risco: float, nivel: str) -> bool:
        """
        Envia alerta de risco de evasão
        
        Args:
            aluno: Dados do aluno
            risco: Score de risco (0-100)
            nivel: Nível do risco (BAIXO, MEDIO, ALTO, CRITICO)
        """
        emoji = "🚨" if nivel == "CRITICO" else "⚠️" if nivel == "ALTO" else "⚠️"
        
        mensagem = f"""
{emoji} <b>ALERTA DE RISCO DE EVASÃO - {nivel}</b>

<b>Aluno:</b> {aluno.get('nome', 'N/A')}
<b>Matrícula:</b> {aluno.get('matricula', 'N/A')}
<b>Curso:</b> {aluno.get('curso', 'N/A')}

<b>Score de Risco:</b> {risco:.1f}%

<b>Fatores de Risco:</b>
{aluno.get('fatores_risco', '• Não identificados')}

<b>Ação Sugerida:</b>
• Acionar plano de intervenção
• Contatar família
• Oferecer apoio psicossocial

<b>Data:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}
        """.strip()
        
        return self.enviar_mensagem(mensagem)


# Instância global para uso em todo o sistema
notifier = TelegramNotifier()


def enviar_alerta_frequencia(aluno: dict, queda_percentual: float) -> bool:
    """Função utilitária para enviar alerta de frequência"""
    return notifier.enviar_alerta_frequencia(aluno, queda_percentual)


def enviar_alerta_media(aluno: dict, media: float, meses: int) -> bool:
    """Função utilitária para enviar alerta de média"""
    return notifier.enviar_alerta_media(aluno, media, meses)


def enviar_alerta_faltas(aluno: dict, faltas: int) -> bool:
    """Função utilitária para enviar alerta de faltas"""
    return notifier.enviar_alerta_faltas_seguidas(aluno, faltas)


def enviar_alerta_risco(aluno: dict, risco: float, nivel: str) -> bool:
    """Função utilitária para enviar alerta de risco"""
    return notifier.enviar_alerta_risco_evasao(aluno, risco, nivel)
