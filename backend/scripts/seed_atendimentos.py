# --- Bootstrap de execucao (injetado): garante imports do backend e carrega o .env ---
import os as _os
import sys as _sys

_BACKEND_DIR = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _BACKEND_DIR not in _sys.path:
    _sys.path.insert(0, _BACKEND_DIR)
try:
    from dotenv import load_dotenv as _load_dotenv

    _load_dotenv(_os.path.join(_BACKEND_DIR, ".env"))
except Exception:
    pass
# --- fim do bootstrap ---

"""
Script para inserir dados de exemplo na tabela atendimentos.
Usa o usuário Administrador DEWAS (ID: 2) como profissional responsável.
Executar após create_atendimentos.sql

Usuários existentes no banco:
- ID 2 - Administrador DEWAS (role_id: 5 - ADMIN)

Roles disponíveis:
- ID 5 - ADMIN (acesso total)
- ID 6 - COORDENADOR (acesso restrito ao curso)
- ID 7 - PEDAGOGO (foco em intervenções/atendimentos)
- ID 8 - DIRETOR (visão completa consultivo)
"""

import os

import pymysql
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/sapee_dewas")
parts = db_url.replace("mysql+pymysql://", "").split("@")
user_pass = parts[0].split(":")
host_db = parts[1].split("/")

config = {
    "host": host_db[0].split(":")[0],
    "user": user_pass[0],
    "password": user_pass[1] if len(user_pass) > 1 else "",
    "database": host_db[1] if len(host_db) > 1 else "sapee_dewas",
    "cursorclass": pymysql.cursors.DictCursor,
}

# ID do usuário que registra os atendimentos (Administrador DEWAS)
USUARIO_ID = 2

# Dados de exemplo
atendimentos = [
    (
        "2024101001",
        "PSICOLOGICO",
        "REALIZADO",
        -30,
        "Aluno relatou ansiedade e dificuldade de concentração. Encaminhado para acompanhamento semanal.",
        "ALTA",
    ),
    (
        "2024101002",
        "SOCIAL",
        "REALIZADO",
        -25,
        "Família em situação de vulnerabilidade. Encaminhada para programa de assistência social.",
        "MEDIA",
    ),
    (
        "2024101003",
        "CONVERSA_INFORMAL",
        "REALIZADO",
        -20,
        "Conversa informal sobre dificuldades com colegas. Aluno demonstrou melhora.",
        "BAIXA",
    ),
    (
        "2024101005",
        "DISCIPLINAR",
        "EM_ANDAMENTO",
        -15,
        "Ocorrência disciplinar - atrasos recorrentes. Termo de compromisso assinado.",
        "MEDIA",
    ),
    (
        "2024101010",
        "ACADEMICO",
        "AGENDADO",
        5,
        "Encaminhamento para monitoria de matemática. Agendado para próxima semana.",
        "ALTA",
    ),
    (
        "2024101015",
        "PSICOLOGICO",
        "CONCLUIDO",
        -60,
        "Acompanhamento psicológico por 2 meses. Aluno apresentou melhora significativa.",
        "MEDIA",
    ),
    (
        "2024101023",
        "SAUDE",
        "REALIZADO",
        -10,
        "Aluno relatou problemas de visão. Encaminhado para oftalmologista na UBS.",
        "ALTA",
    ),
    (
        "2024101038",
        "ENCAMINHAMENTO_EXTERNO",
        "EM_ANDAMENTO",
        -5,
        "Encaminhado para CAPS (Centro de Atenção Psicossocial). Aguardando primeira consulta.",
        "URGENTE",
    ),
]

try:
    connection = pymysql.connect(**config)
    with connection.cursor() as cursor:
        # Verificar se o usuário existe
        cursor.execute("SELECT id, nome FROM usuarios WHERE id = %s", (USUARIO_ID,))
        user = cursor.fetchone()
        if not user:
            print(f"❌ Usuário ID {USUARIO_ID} não encontrado. Verifique a tabela usuarios.")
            exit()

        print(f"✅ Usando usuário: {user['nome']} (ID: {USUARIO_ID})")

        # Inserir atendimentos
        for matricula, tipo, status, dias, descricao, prioridade in atendimentos:
            cursor.execute(
                "INSERT INTO atendimentos (aluno_matricula, usuario_id, tipo_atendimento, status, data_atendimento, descricao, prioridade) "
                "VALUES (%s, %s, %s, %s, DATE_ADD(CURDATE(), INTERVAL %s DAY), %s, %s)",
                (matricula, USUARIO_ID, tipo, status, dias, descricao, prioridade),
            )

        connection.commit()
        print(f"✅ {len(atendimentos)} atendimentos inseridos com sucesso!")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
