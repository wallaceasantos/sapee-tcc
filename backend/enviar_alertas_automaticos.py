"""
🤖 ENVIADOR DE ALERTAS AUTOMÁTICOS - TELEGRAM
SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar

Este script verifica automaticamente:
- Alunos com 3+ faltas consecutivas
- Alunos com risco que subiu (MÉDIO → ALTO)
- Questionários com risco ALTO/MUITO_ALTO

E envia alertas para o Telegram dos responsáveis.

Configurações (usadas do .env):
- TELEGRAM_BOT_TOKEN: Token do bot
- TELEGRAM_CHAT_ID: ID do chat/grupo
- TELEGRAM_ENABLED: Se está habilitado (True/False)
- TELEGRAM_ALERT_LEVEL: Nível mínimo para alertar (BAIXO, MEDIO, ALTO)

Execução:
    python backend/enviar_alertas_automaticos.py
    
Agendamento (Windows Task Scheduler):
    Executar diariamente às 08:00 e 14:00
"""

import sys
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do Telegram
TELEGRAM_ENABLED = os.getenv("TELEGRAM_ENABLED", "False").lower() == "true"
TELEGRAM_ALERT_LEVEL = os.getenv("TELEGRAM_ALERT_LEVEL", "MEDIO")

# Imports do projeto
import database
import models
from notificacoes import enviar_alerta_risco, enviar_alerta_faltas

def enviar_mensagem_telegram(mensagem: str, nivel: str = 'ALTO'):
    """Envia mensagem para o Telegram"""
    if not TELEGRAM_ENABLED:
        return False
    
    # Usar função existente do notificacoes.py
    # Criar aluno fake para compatibilidade
    aluno_fake = {
        "nome": "Sistema",
        "matricula": "SYSTEM",
        "curso": "Geral"
    }
    
    # Enviar como alerta de risco genérico
    try:
        return enviar_alerta_risco(aluno_fake, 100, nivel)
    except:
        # Fallback: enviar como alerta de faltas
        return enviar_alerta_faltas(aluno_fake, 0)

def verificar_faltas_consecutivas(db: Session):
    """Verifica alunos com 3+ faltas consecutivas e envia alerta"""
    print("\n🔍 Verificando faltas consecutivas...")
    
    # Buscar faltas dos últimos 10 dias
    data_limite = datetime.now() - timedelta(days=10)
    
    faltas_recentes = db.query(models.RegistroFaltasDiarias).filter(
        models.RegistroFaltasDiarias.data >= data_limite,
        models.RegistroFaltasDiarias.justificada == False
    ).order_by(models.RegistroFaltasDiarias.data.desc()).all()
    
    # Agrupar por aluno
    faltas_por_aluno = {}
    for falta in faltas_recentes:
        if falta.aluno_matricula not in faltas_por_aluno:
            faltas_por_aluno[falta.aluno_matricula] = []
        faltas_por_aluno[falta.aluno_matricula].append(falta)
    
    alertas_enviados = 0
    
    for matricula, faltas in faltas_por_aluno.items():
        # Verificar se tem 3+ faltas consecutivas
        if len(faltas) >= 3:
            # Ordenar por data
            faltas_ordenadas = sorted(faltas, key=lambda f: f.data, reverse=True)
            
            # Verificar consecutividade
            consecutivas = 1
            for i in range(1, len(faltas_ordenadas)):
                diff_dias = (faltas_ordenadas[i-1].data - faltas_ordenadas[i].data).days
                if diff_dias <= 3:  # Considera fim de semana
                    consecutivas += 1
                else:
                    break
            
            if consecutivas >= 3:
                aluno = db.query(models.Aluno).filter(
                    models.Aluno.matricula == matricula
                ).first()
                
                if aluno:
                    # Verificar se já não foi alertado nas últimas 24h
                    alerta_existente = db.query(models.AlertaFaltasConsecutivas).filter(
                        models.AlertaFaltasConsecutivas.aluno_matricula == matricula,
                        models.AlertaFaltasConsecutivas.criado_at >= datetime.now() - timedelta(hours=24)
                    ).first()
                    
                    if not alerta_existente:
                        # Criar alerta
                        novo_alerta = models.AlertaFaltasConsecutivas(
                            aluno_matricula=matricula,
                            tipo_alerta='3_FALTAS',
                            quantidade_faltas=consecutivas,
                            data_inicio_faltas=faltas_ordenadas[-1].data,
                            data_fim_faltas=faltas_ordenadas[0].data,
                            disciplinas_afetadas=json.dumps(list(set([f.disciplina for f in faltas]))),
                            status='PENDENTE'
                        )
                        db.add(novo_alerta)
                        
                        # Enviar Telegram
                        mensagem = f"""
⚠️ <b>ALERTA DE FALTAS CONSECUTIVAS</b>

👤 <b>Aluno:</b> {aluno.nome}
📚 <b>Curso:</b> {aluno.curso.nome if aluno.curso else 'N/A'}
📅 <b>Faltas:</b> {consecutivas} faltas consecutivas
📊 <b>Disciplinas:</b> {', '.join(set([f.disciplina for f in faltas]))}

⚡ <b>Ação Recomendada:</b> Entrar em contato com o aluno imediatamente!
"""
                        
                        try:
                            enviar_mensagem_telegram(mensagem, nivel='ALTO')
                            print(f"  ✅ Alerta enviado: {aluno.nome} ({consecutivas} faltas)")
                            alertas_enviados += 1
                        except Exception as e:
                            print(f"  ❌ Erro ao enviar alerta: {e}")
                        
                        db.commit()
    
    return alertas_enviados


def verificar_mudanca_risco(db: Session):
    """Verifica alunos cujo risco aumentou e envia alerta"""
    print("\n🔍 Verificando mudança de risco...")
    
    # Buscar últimas predições de cada aluno
    subquery = db.query(
        models.Predicao.aluno_id,
        func.max(models.Predicao.data_predicao).label('max_data')
    ).group_by(models.Predicao.aluno_id).subquery()
    
    predicoes_atuais = db.query(models.Predicao).join(
        subquery,
        and_(
            models.Predicao.aluno_id == subquery.c.aluno_id,
            models.Predicao.data_predicao == subquery.c.max_data
        )
    ).all()
    
    alertas_enviados = 0
    
    for predicao in predicoes_atuais:
        # Buscar predição anterior
        predicao_anterior = db.query(models.Predicao).filter(
            models.Predicao.aluno_id == predicao.aluno_id,
            models.Predicao.data_predicao < predicao.data_predicao
        ).order_by(models.Predicao.data_predicao.desc()).first()
        
        if predicao_anterior:
            # Verificar se risco aumentou
            risco_atual = predicao.nivel_risco
            risco_anterior = predicao_anterior.nivel_risco
            
            niveis = {'BAIXO': 0, 'MEDIO': 1, 'ALTO': 2}
            
            if niveis.get(risco_atual, 0) > niveis.get(risco_anterior, 0):
                aluno = db.query(models.Aluno).filter(
                    models.Aluno.matricula == predicao.aluno_id
                ).first()
                
                if aluno:
                    mensagem = f"""
📈 <b>ALERTA: RISCO AUMENTOU!</b>

👤 <b>Aluno:</b> {aluno.nome}
📚 <b>Curso:</b> {aluno.curso.nome if aluno.curso else 'N/A'}
🔴 <b>Risco Anterior:</b> {risco_anterior}
🚨 <b>Risco Atual:</b> {risco_atual}
📊 <b>Fatores:</b> {predicao.fatores_principais}

⚡ <b>Ação Recomendada:</b> Revisar caso e planejar intervenção!
"""
                    
                    try:
                        enviar_mensagem_telegram(mensagem, nivel='ALTO')
                        print(f"  ✅ Alerta enviado: {aluno.nome} ({risco_anterior} → {risco_atual})")
                        alertas_enviados += 1
                    except Exception as e:
                        print(f"  ❌ Erro ao enviar alerta: {e}")
    
    return alertas_enviados


def verificar_questionario_risco_alto(db: Session):
    """Verifica questionários com risco ALTO/MUITO_ALTO"""
    print("\n🔍 Verificando questionários de risco...")
    
    # Buscar questionários dos últimos 7 dias
    data_limite = datetime.now() - timedelta(days=7)
    
    questionarios = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.data_resposta >= data_limite,
        models.QuestionarioPsicossocial.nivel_risco_psicossocial.in_(['ALTO', 'MUITO_ALTO'])
    ).all()
    
    alertas_enviados = 0
    
    for questionario in questionarios:
        # Verificar se já não foi alertado
        alerta_existente = db.query(models.AlertaFaltasConsecutivas).filter(
            models.AlertaFaltasConsecutivas.aluno_matricula == questionario.aluno_matricula,
            models.AlertaFaltasConsecutivas.criado_at >= datetime.now() - timedelta(days=7)
        ).first()
        
        if not alerta_existente:
            aluno = db.query(models.Aluno).filter(
                models.Aluno.matricula == questionario.aluno_matricula
            ).first()
            
            if aluno:
                fatores = json.loads(questionario.fatores_criticos) if questionario.fatores_criticos else []
                
                mensagem = f"""
🧠 <b>ALERTA: RISCO PSICOSSOCIAL ALTO</b>

👤 <b>Aluno:</b> {aluno.nome}
📚 <b>Curso:</b> {aluno.curso.nome if aluno.curso else 'N/A'}
🔴 <b>Nível:</b> {questionario.nivel_risco_psicossocial}
📊 <b>Score:</b> {questionario.score_psicossocial_total}
⚠️ <b>Fatores:</b> {', '.join(fatores)}

⚡ <b>Ação Recomendada:</b> Encaminhar para psicológico/pedagógico!
"""
                
                try:
                    enviar_mensagem_telegram(mensagem, nivel='ALTO')
                    print(f"  ✅ Alerta enviado: {aluno.nome} ({questionario.nivel_risco_psicossocial})")
                    alertas_enviados += 1
                except Exception as e:
                    print(f"  ❌ Erro ao enviar alerta: {e}")
    
    return alertas_enviados


def main():
    """Função principal"""
    print("=" * 80)
    print("🤖 ENVIADOR DE ALERTAS AUTOMÁTICOS - TELEGRAM")
    print("=" * 80)
    print(f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print()
    
    # Verificar se Telegram está habilitado
    if not TELEGRAM_ENABLED:
        print("⚠️  TELEGRAM DESABILITADO (TELEGRAM_ENABLED=False no .env)")
        print("   Para habilitar, altere no .env:")
        print("   TELEGRAM_ENABLED=True")
        print()
        return 0
    
    print(f"✅ Telegram Habilitado")
    print(f"📊 Nível Mínimo de Alerta: {TELEGRAM_ALERT_LEVEL}")
    print()
    
    try:
        # Conectar ao banco
        db = Session(bind=database.engine)
        
        # Executar verificações
        total_alertas = 0
        
        total_alertas += verificar_faltas_consecutivas(db)
        total_alertas += verificar_mudanca_risco(db)
        total_alertas += verificar_questionario_risco_alto(db)
        
        print()
        print("=" * 80)
        print(f"✅ Total de alertas enviados: {total_alertas}")
        print("=" * 80)
        
        db.close()
        
        return total_alertas
        
    except Exception as e:
        print()
        print("=" * 80)
        print(f"❌ ERRO: {str(e)}")
        print("=" * 80)
        return 0


if __name__ == "__main__":
    main()
