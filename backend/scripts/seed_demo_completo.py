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
🌱 SEED DEMO COMPLETO - SAPEE DEWAS
=====================================
Script que popula o banco de dados com dados realistas de uma
instituição de ensino FICTÍCIA para testes completos do sistema.

🚀 EXECUÇÃO:
    cd backend
    .\venv\Scripts\Activate.ps1
    python seed_demo_completo.py

📋 O QUE ELE CRIA:
    1. Perfis de usuário (roles): ADMIN, COORDENADOR, PEDAGOGO, DIRETOR, PROFESSOR
    2. Cursos: 6 cursos de diferentes modalidades
    3. Usuários: 5 usuários com senhas conhecidas
    4. Alunos: 20 alunos com perfis de risco variados
    5. Frequência mensal: 6 meses de dados para cada aluno
    6. Predições: cálculo automático via ml_logic_v2
    7. Intervenções: exemplos reais de intervenções pedagógicas
    8. Egressos: 3 casos de abandono (para feedback loop do ML)
    9. Questionário psicossocial: respostas para 5 alunos
   10. Comunicações: exemplos de alertas enviados
   11. Atendimentos: registros de atendimento psicossocial

🔐 CREDENCIAIS DE TESTE:
    Admin:     admin@dewas.com.br     / admin123
    Coord:     coord@dewas.com.br     / coord123
    Pedagogo:  pedagogo@dewas.com.br  / pedagogo123
    Diretor:   diretor@dewas.com.br   / diretor123
    Professor: professor@dewas.com.br / professor123
"""

import sys
import os
import random
from datetime import date, datetime, timedelta

# Ajustar path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from passlib.context import CryptContext
from sqlalchemy.orm import Session

import database
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================
# CONFIGURAÇÕES
# ============================================

CURSOS_DEMO = [
    {"nome": "Técnico em Informática (Integrado)", "modalidade": "Integrado"},
    {"nome": "Técnico em Edificações (Integrado)", "modalidade": "Integrado"},
    {"nome": "Técnico em Administração (Integrado)", "modalidade": "Integrado"},
    {"nome": "Análise e Desenvolvimento de Sistemas", "modalidade": "Superior"},
    {"nome": "Engenharia Civil", "modalidade": "Superior"},
    {"nome": "Técnico em Meio Ambiente (Subsequente)", "modalidade": "Subsequente"},
]

ROLES_DEMO = [
    {"nome": "ADMIN", "descricao": "Administrador do sistema - acesso total", "permissoes": '["*"]'},
    {"nome": "COORDENADOR", "descricao": "Coordenador de curso - acesso restrito ao curso",
     "permissoes": '["alunos","frequencia","intervencoes","relatorios","dashboard","faltas","notas","questionario","comunicacoes","atendimentos","egressos"]'},
    {"nome": "PEDAGOGO", "descricao": "Pedagogo - foco em intervenções e atendimentos",
     "permissoes": '["alunos","intervencoes","atendimentos","questionario","dashboard","comunicacoes","relatorios","faltas"]'},
    {"nome": "DIRETOR", "descricao": "Diretor - visão geral consultiva",
     "permissoes": '["dashboard","relatorios","alunos","egressos","indicadores"]'},
    {"nome": "PROFESSOR", "descricao": "Professor - lançamento de faltas e notas",
     "permissoes": '["faltas","notas","alunos","frequencia","questionario"]'},
]

USUARIOS_DEMO = [
    {"nome": "Administrador DEWAS", "email": "admin@dewas.com.br", "senha": "admin123", "role_nome": "ADMIN"},
    {"nome": "Coordenador Silva", "email": "coord@dewas.com.br", "senha": "coord123", "role_nome": "COORDENADOR"},
    {"nome": "Pedagoga Oliveira", "email": "pedagogo@dewas.com.br", "senha": "pedagogo123", "role_nome": "PEDAGOGO"},
    {"nome": "Diretor Souza", "email": "diretor@dewas.com.br", "senha": "diretor123", "role_nome": "DIRETOR"},
    {"nome": "Professor Costa", "email": "professor@dewas.com.br", "senha": "professor123", "role_nome": "PROFESSOR"},
]

# 20 alunos com nomes brasileiros e perfis de risco variados
# Os 5 primeiros = BAIXO, 5 seguintes = MÉDIO, 5 seguintes = ALTO, 5 últimos = MUITO_ALTO
ALUNOS_DEMO = [
    # === BAIXO RISCO (5 alunos) ===
    {"matricula": "20261001", "nome": "Maria Eduarda Silva", "email": "maria.e@escola.edu.br",
     "telefone": "(92) 99101-0101", "data_nascimento": date(2009, 3, 15), "sexo": "F",
     "periodo": 1, "turno": "MATUTINO", "media_geral": 8.5, "frequencia": 92.0,
     "renda_familiar": 4500.00, "possui_auxilio": False, "trabalha": False,
     "historico_reprovas": 0, "tempo_deslocamento": 30,
     "possui_computador": True, "possui_internet": True,
     "beneficiario_bolsa_familia": False, "primeiro_geracao_universidade": False,
     "zona_residencial": "ZONA_NORTE", "dificuldade_acesso": "FACIL"},
     
    {"matricula": "20261002", "nome": "João Pedro Santos", "email": "joao.p@escola.edu.br",
     "telefone": "(92) 99102-0202", "data_nascimento": date(2008, 7, 22), "sexo": "M",
     "periodo": 1, "turno": "MATUTINO", "media_geral": 8.0, "frequencia": 89.0,
     "renda_familiar": 3800.00, "possui_auxilio": False, "trabalha": False,
     "historico_reprovas": 0, "tempo_deslocamento": 25,
     "possui_computador": True, "possui_internet": True,
     "beneficiario_bolsa_familia": False, "primeiro_geracao_universidade": False,
     "zona_residencial": "ZONA_SUL", "dificuldade_acesso": "FACIL"},

    {"matricula": "20261003", "nome": "Ana Beatriz Costa", "email": "ana.b@escola.edu.br",
     "telefone": "(92) 99103-0303", "data_nascimento": date(2008, 5, 10), "sexo": "F",
     "periodo": 1, "turno": "VESPERTINO", "media_geral": 9.0, "frequencia": 95.0,
     "renda_familiar": 5200.00, "possui_auxilio": False, "trabalha": False,
     "historico_reprovas": 0, "tempo_deslocamento": 20,
     "possui_computador": True, "possui_internet": True,
     "beneficiario_bolsa_familia": False, "primeiro_geracao_universidade": False,
     "zona_residencial": "CENTRO", "dificuldade_acesso": "FACIL"},

    {"matricula": "20261004", "nome": "Lucas Oliveira Lima", "email": "lucas.o@escola.edu.br",
     "telefone": "(92) 99104-0404", "data_nascimento": date(2007, 11, 3), "sexo": "M",
     "periodo": 2, "turno": "MATUTINO", "media_geral": 7.8, "frequencia": 87.0,
     "renda_familiar": 3500.00, "possui_auxilio": False, "trabalha": False,
     "historico_reprovas": 0, "tempo_deslocamento": 40,
     "possui_computador": True, "possui_internet": True,
     "beneficiario_bolsa_familia": False, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_LESTE", "dificuldade_acesso": "MEDIA"},

    {"matricula": "20261005", "nome": "Julia Fernandes Rocha", "email": "julia.f@escola.edu.br",
     "telefone": "(92) 99105-0505", "data_nascimento": date(2009, 1, 18), "sexo": "F",
     "periodo": 1, "turno": "VESPERTINO", "media_geral": 8.2, "frequencia": 90.0,
     "renda_familia": 4100.00, "possui_auxilio": False, "trabalha": False,
     "historico_reprovas": 0, "tempo_deslocamento": 35,
     "possui_computador": True, "possui_internet": True,
     "beneficiario_bolsa_familia": False, "primeiro_geracao_universidade": False,
     "zona_residencial": "ZONA_NORTE", "dificuldade_acesso": "FACIL"},

    # === MÉDIO RISCO (5 alunos) ===
    {"matricula": "20261006", "nome": "Pedro Henrique Alves", "email": "pedro.h@escola.edu.br",
     "telefone": "(92) 99201-0101", "data_nascimento": date(2008, 4, 8), "sexo": "M",
     "periodo": 2, "turno": "MATUTINO", "media_geral": 6.5, "frequencia": 78.0,
     "renda_familiar": 2200.00, "possui_auxilio": True, "trabalha": False,
     "historico_reprovas": 0, "tempo_deslocamento": 60,
     "possui_computador": True, "possui_internet": True,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_LESTE", "dificuldade_acesso": "MEDIA"},

    {"matricula": "20261007", "nome": "Gabriela Souza Neves", "email": "gabriela.s@escola.edu.br",
     "telefone": "(92) 99202-0202", "data_nascimento": date(2007, 9, 14), "sexo": "F",
     "periodo": 2, "turno": "VESPERTINO", "media_geral": 6.2, "frequencia": 76.0,
     "renda_familiar": 1800.00, "possui_auxilio": True, "trabalha": False,
     "historico_reprovas": 1, "tempo_deslocamento": 45,
     "possui_computador": False, "possui_internet": True,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": False,
     "zona_residencial": "ZONA_OESTE", "dificuldade_acesso": "DIFICIL"},

    {"matricula": "20261008", "nome": "Rafael Martins Cardoso", "email": "rafael.m@escola.edu.br",
     "telefone": "(92) 99203-0303", "data_nascimento": date(2006, 12, 25), "sexo": "M",
     "periodo": 2, "turno": "MATUTINO", "media_geral": 6.0, "frequencia": 75.0,
     "renda_familiar": 2500.00, "possui_auxilio": False, "trabalha": True,
     "carga_horaria_trabalho": 20, "historico_reprovas": 1,
     "tempo_deslocamento": 50,
     "possui_computador": True, "possui_internet": True,
     "beneficiario_bolsa_familia": False, "primeiro_geracao_universidade": False,
     "zona_residencial": "CENTRO", "dificuldade_acesso": "MEDIA"},

    {"matricula": "20261009", "nome": "Isabella Gonçalves Dias", "email": "isabella.g@escola.edu.br",
     "telefone": "(92) 99204-0404", "data_nascimento": date(2008, 6, 30), "sexo": "F",
     "periodo": 2, "turno": "NOTURNO", "media_geral": 5.8, "frequencia": 74.0,
     "renda_familiar": 1600.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 30, "historico_reprovas": 1,
     "tempo_deslocamento": 70,
     "possui_computador": False, "possui_internet": True,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "INTERIOR", "dificuldade_acesso": "DIFICIL"},

    {"matricula": "20261010", "nome": "Mateus Azevedo Borges", "email": "mateus.a@escola.edu.br",
     "telefone": "(92) 99205-0505", "data_nascimento": date(2008, 2, 11), "sexo": "M",
     "periodo": 2, "turno": "MATUTINO", "media_geral": 5.5, "frequencia": 72.0,
     "renda_familiar": 2000.00, "possui_auxilio": True, "trabalha": False,
     "historico_reprovas": 2, "tempo_deslocamento": 55,
     "possui_computador": True, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_SUL", "dificuldade_acesso": "MEDIA"},

    # === ALTO RISCO (5 alunos) ===
    {"matricula": "20261011", "nome": "Thiago Nascimento Melo", "email": "thiago.n@escola.edu.br",
     "telefone": "(92) 99301-0101", "data_nascimento": date(2007, 3, 19), "sexo": "M",
     "periodo": 3, "turno": "NOTURNO", "media_geral": 4.8, "frequencia": 65.0,
     "renda_familiar": 1200.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 40, "historico_reprovas": 2,
     "tempo_deslocamento": 90,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "INTERIOR", "dificuldade_acesso": "MUITO_DIFICIL"},

    {"matricula": "20261012", "nome": "Amanda Carvalho Pinto", "email": "amanda.c@escola.edu.br",
     "telefone": "(92) 99302-0202", "data_nascimento": date(2007, 8, 5), "sexo": "F",
     "periodo": 3, "turno": "VESPERTINO", "media_geral": 4.5, "frequencia": 62.0,
     "renda_familiar": 1100.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 30, "historico_reprovas": 3,
     "tempo_deslocamento": 75,
     "possui_computador": False, "possui_internet": True,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_LESTE", "dificuldade_acesso": "DIFICIL"},

    {"matricula": "20261013", "nome": "Bruno Teixeira Moraes", "email": "bruno.t@escola.edu.br",
     "telefone": "(92) 99303-0303", "data_nascimento": date(2006, 10, 28), "sexo": "M",
     "periodo": 3, "turno": "MATUTINO", "media_geral": 4.2, "frequencia": 60.0,
     "renda_familiar": 1300.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 44, "historico_reprovas": 3,
     "tempo_deslocamento": 110,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_OESTE", "dificuldade_acesso": "MUITO_DIFICIL"},

    {"matricula": "20261014", "nome": "Larissa Rocha Moreira", "email": "larissa.r@escola.edu.br",
     "telefone": "(92) 99304-0404", "data_nascimento": date(2007, 5, 7), "sexo": "F",
     "periodo": 3, "turno": "NOTURNO", "media_geral": 4.0, "frequencia": 58.0,
     "renda_familia": 980.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 36, "historico_reprovas": 4,
     "tempo_deslocamento": 85,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "INTERIOR", "dificuldade_acesso": "MUITO_DIFICIL"},

    {"matricula": "20261015", "nome": "Felipe Barbosa Andrade", "email": "felipe.b@escola.edu.br",
     "telefone": "(92) 99305-0505", "data_nascimento": date(2006, 7, 13), "sexo": "M",
     "periodo": 3, "turno": "MATUTINO", "media_geral": 3.8, "frequencia": 55.0,
     "renda_familiar": 900.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 44, "historico_reprovas": 4,
     "tempo_deslocamento": 130,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_NORTE", "dificuldade_acesso": "MUITO_DIFICIL"},

    # === MUITO ALTO RISCO (5 alunos) ===
    {"matricula": "20261016", "nome": "Camila Freitas Castro", "email": "camila.f@escola.edu.br",
     "telefone": "(92) 99401-0101", "data_nascimento": date(2006, 1, 20), "sexo": "F",
     "periodo": 4, "turno": "NOTURNO", "media_geral": 3.0, "frequencia": 48.0,
     "renda_familiar": 800.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 44, "historico_reprovas": 5,
     "tempo_deslocamento": 140,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "INTERIOR", "dificuldade_acesso": "MUITO_DIFICIL"},

    {"matricula": "20261017", "nome": "Diego Santana Campos", "email": "diego.s@escola.edu.br",
     "telefone": "(92) 99402-0202", "data_nascimento": date(2005, 9, 8), "sexo": "M",
     "periodo": 4, "turno": "NOTURNO", "media_geral": 2.8, "frequencia": 45.0,
     "renda_familiar": 700.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 44, "historico_reprovas": 6,
     "tempo_deslocamento": 150,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_LESTE", "dificuldade_acesso": "MUITO_DIFICIL"},

    {"matricula": "20261018", "nome": "Eduarda Ribeiro Cunha", "email": "eduarda.r@escola.edu.br",
     "telefone": "(92) 99403-0303", "data_nascimento": date(2006, 4, 17), "sexo": "F",
     "periodo": 4, "turno": "MATUTINO", "media_geral": 2.5, "frequencia": 40.0,
     "renda_familiar": 600.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 40, "historico_reprovas": 6,
     "tempo_deslocamento": 120,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "ZONA_OESTE", "dificuldade_acesso": "MUITO_DIFICIL"},

    {"matricula": "20261019", "nome": "Gustavo Correia Peixoto", "email": "gustavo.c@escola.edu.br",
     "telefone": "(92) 99404-0404", "data_nascimento": date(2005, 12, 3), "sexo": "M",
     "periodo": 4, "turno": "NOTURNO", "media_geral": 2.2, "frequencia": 35.0,
     "renda_familiar": 500.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 44, "historico_reprovas": 7,
     "tempo_deslocamento": 160,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "INTERIOR", "dificuldade_acesso": "MUITO_DIFICIL"},

    {"matricula": "20261020", "nome": "Natália Pires Fonseca", "email": "natalia.p@escola.edu.br",
     "telefone": "(92) 99405-0505", "data_nascimento": date(2006, 6, 25), "sexo": "F",
     "periodo": 4, "turno": "NOTURNO", "media_geral": 2.0, "frequencia": 30.0,
     "renda_familiar": 400.00, "possui_auxilio": True, "trabalha": True,
     "carga_horaria_trabalho": 44, "historico_reprovas": 8,
     "tempo_deslocamento": 180,
     "possui_computador": False, "possui_internet": False,
     "beneficiario_bolsa_familia": True, "primeiro_geracao_universidade": True,
     "zona_residencial": "CENTRO", "dificuldade_acesso": "MUITO_DIFICIL"},
]


# ============================================
# FUNÇÕES PRINCIPAIS
# ============================================

def criar_roles(db: Session):
    """Cria os perfis de usuário"""
    print("\n👥 Criando perfis de usuário (roles)...")
    roles_map = {}
    for role_data in ROLES_DEMO:
        existente = db.query(models.Role).filter(models.Role.nome == role_data["nome"]).first()
        if existente:
            print(f"   ⏭️  {role_data['nome']} já existe, pulando...")
            roles_map[role_data["nome"]] = existente
        else:
            role = models.Role(**role_data)
            db.add(role)
            db.flush()
            roles_map[role_data["nome"]] = role
            print(f"   ✅ {role_data['nome']} criado")
    db.commit()
    return roles_map


def criar_cursos(db: Session):
    """Cria os cursos demo"""
    print("\n📚 Criando cursos...")
    cursos_list = []
    for curso_data in CURSOS_DEMO:
        existente = db.query(models.Curso).filter(models.Curso.nome == curso_data["nome"]).first()
        if existente:
            print(f"   ⏭️  {curso_data['nome']} já existe, pulando...")
            cursos_list.append(existente)
        else:
            curso = models.Curso(**curso_data)
            db.add(curso)
            db.flush()
            cursos_list.append(curso)
            print(f"   ✅ {curso_data['nome']} ({curso_data['modalidade']})")
    db.commit()
    return cursos_list


def criar_usuarios(db: Session, roles_map: dict, cursos_list: list):
    """Cria os usuários demo com senhas hashadas"""
    print("\n👤 Criando usuários...")
    usuarios_map = {}
    for user_data in USUARIOS_DEMO:
        existente = db.query(models.Usuario).filter(models.Usuario.email == user_data["email"]).first()
        if existente:
            print(f"   ⏭️  {user_data['nome']} ({user_data['email']}) já existe, pulando...")
            usuarios_map[user_data["email"]] = existente
        else:
            role = roles_map[user_data["role_nome"]]
            usuario = models.Usuario(
                nome=user_data["nome"],
                email=user_data["email"],
                senha=pwd_context.hash(user_data["senha"]),
                role_id=role.id,
                curso_id=cursos_list[0].id,  # curso padrão
                ativo=True,
            )
            db.add(usuario)
            db.flush()
            usuarios_map[user_data["email"]] = usuario
            print(f"   ✅ {user_data['nome']} ({user_data['email']}) - senha: {user_data['senha']}")
    db.commit()
    return usuarios_map


def criar_alunos(db: Session, cursos_list: list):
    """Cria os 20 alunos demo com perfis variados"""
    print("\n🎓 Criando alunos...")
    alunos_por_curso = [0, 3, 3, 4, 3, 4, 3]  # distribuição aproximada

    # Distribuir alunos entre cursos
    idx = 0
    alunos_criados = []
    for i, aluno_data in enumerate(ALUNOS_DEMO):
        existente = db.query(models.Aluno).filter(
            models.Aluno.matricula == aluno_data["matricula"]
        ).first()
        if existente:
            print(f"   ⏭️  {aluno_data['matricula']} - {aluno_data['nome']} já existe, pulando...")
            alunos_criados.append(existente)
            continue

        # Distribuir entre cursos (cíclico)
        curso_idx = i % len(cursos_list)
        curso = cursos_list[curso_idx]

        # Classificar nível de risco
        if i < 5:
            nivel = "BAIXO"
        elif i < 10:
            nivel = "MÉDIO"
        elif i < 15:
            nivel = "ALTO"
        else:
            nivel = "MUITO ALTO"

        # Adicionar dados de responsáveis para alunos de alto risco
        dados_extra = {}
        if nivel in ("ALTO", "MUITO ALTO"):
            dados_extra = {
                "nome_responsavel_1": f"Responsável {aluno_data['nome'].split()[-1]}",
                "parentesco_responsavel_1": "Mãe",
                "telefone_responsavel_1": f"(92) 99{aluno_data['matricula'][-3:]}",
            }

        aluno = models.Aluno(
            matricula=aluno_data["matricula"],
            nome=aluno_data["nome"],
            email=aluno_data["email"],
            telefone=aluno_data.get("telefone"),
            data_nascimento=aluno_data.get("data_nascimento"),
            idade=17 if aluno_data["periodo"] <= 2 else 18,
            sexo=models.Sexo(aluno_data["sexo"]),
            curso_id=curso.id,
            periodo=aluno_data["periodo"],
            turno=models.Turno(aluno_data["turno"]),
            media_geral=aluno_data["media_geral"],
            frequencia=aluno_data["frequencia"],
            historico_reprovas=aluno_data.get("historico_reprovas", 0),
            renda_familiar=aluno_data.get("renda_familiar"),
            possui_auxilio=aluno_data.get("possui_auxilio", False),
            trabalha=aluno_data.get("trabalha", False),
            carga_horaria_trabalho=aluno_data.get("carga_horaria_trabalho"),
            tempo_deslocamento=aluno_data.get("tempo_deslocamento"),
            possui_computador=aluno_data.get("possui_computador", False),
            possui_internet=aluno_data.get("possui_internet", False),
            beneficiario_bolsa_familia=aluno_data.get("beneficiario_bolsa_familia", False),
            primeiro_geracao_universidade=aluno_data.get("primeiro_geracao_universidade", False),
            zona_residencial=models.ZonaResidencial(aluno_data.get("zona_residencial", "ZONA_NORTE")),
            dificuldade_acesso=models.DificuldadeAcesso(aluno_data.get("dificuldade_acesso", "MEDIA")),
            ano_ingresso=2026 - aluno_data["periodo"] + 1,
            **dados_extra,
        )
        db.add(aluno)
        db.flush()
        alunos_criados.append(aluno)
        risco_emoji = {"BAIXO": "🟢", "MÉDIO": "🟡", "ALTO": "🟠", "MUITO ALTO": "🔴"}
        print(f"   {risco_emoji.get(nivel, '⚪')} {aluno_data['matricula']} - {aluno_data['nome']} "
              f"| Média: {aluno_data['media_geral']} | Freq: {aluno_data['frequencia']}% | Risco: {nivel}")

    db.commit()
    print(f"\n   Total: {len(alunos_criados)} alunos cadastrados")
    return alunos_criados


def criar_frequencia_mensal(db: Session, alunos: list):
    """
    Cria histórico de frequência mensal PROPORCIONAL ao tempo do aluno no curso.

    REGRA DE OURO: Mínimo de 6 meses para predição confiável.
    - Período 1 (recém-chegados): 3 meses (pouco histórico — predição limitada)
    - Período 2: 9 meses (histórico mínimo para predição confiável)
    - Período 3: 15 meses (bom histórico)
    - Período 4: 21 meses (histórico rico)

    Além disso, simula TENDÊNCIA de queda gradual para alunos de risco,
    refletindo o agravamento do quadro ao longo do tempo.
    """
    print("\n📊 Criando frequência mensal (proporcional ao tempo do aluno)...")
    total_registros = 0
    hoje = date.today()

    # Meses de histórico por período do aluno
    MESES_POR_PERIODO = {
        1: 3,   # Aluno novo — dados insuficientes para predição robusta
        2: 9,   # ~1 ano — mínimo para predição confiável
        3: 15,  # Boa base histórica
        4: 21,  # Histórico rico — padrões claros
    }

    for aluno in alunos:
        periodo = aluno.periodo if aluno.periodo else 1
        meses_historico = MESES_POR_PERIODO.get(periodo, 6)
        freq_base = float(aluno.frequencia) if aluno.frequencia else 85.0

        for mes_offset in range(meses_historico - 1, -1, -1):
            mes_data = hoje.replace(day=1) - timedelta(days=30 * mes_offset)
            mes = mes_data.month
            ano = mes_data.year

            # Tendência: alunos de risco têm queda PROGRESSIVA ao longo do tempo
            # Queda mais acentuada nos alunos de período mais alto (acúmulo)
            tendencia = 0
            if aluno.media_geral and float(aluno.media_geral) < 4:
                tendencia = -4 * mes_offset  # Queda severa e progressiva
            elif aluno.media_geral and float(aluno.media_geral) < 5.5:
                tendencia = -2 * mes_offset  # Queda moderada
            elif aluno.media_geral and float(aluno.media_geral) < 6.5:
                tendencia = -1 * mes_offset  # Queda leve

            freq = max(0, min(100, freq_base + tendencia))
            total_aulas = 20
            faltas = int(total_aulas * (1 - freq / 100))
            faltas_nao_just = int(faltas * 0.7)
            faltas_just = faltas - faltas_nao_just

            registro = models.FrequenciaMensal(
                aluno_id=aluno.matricula,
                mes=mes,
                ano=ano,
                frequencia=round(freq, 2),
                faltas_justificadas=faltas_just,
                faltas_nao_justificadas=faltas_nao_just,
                total_aulas_mes=total_aulas,
            )
            db.add(registro)
            total_registros += 1

    db.commit()

    # Resumo por período
    print(f"\n   📋 Distribuição por período:")
    for periodo in sorted(MESES_POR_PERIODO):
        alunos_no_periodo = [a for a in alunos if a.periodo == periodo]
        if alunos_no_periodo:
            print(f"      Período {periodo}: {len(alunos_no_periodo)} alunos × {MESES_POR_PERIODO[periodo]} meses "
                  f"= {len(alunos_no_periodo) * MESES_POR_PERIODO[periodo]} registros")
    print(f"\n   ✅ Total: {total_registros} registros de frequência")


def criar_predicoes(db: Session, alunos: list):
    """Cria predições usando a lógica de ML"""
    print("\n🧠 Gerando predições de risco...")
    from ml_logic_v2 import calcular_risco_evasao

    total = 0
    for aluno in alunos:
        # Pular se já tem predição recente
        existente = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == aluno.matricula)
            .order_by(models.Predicao.data_predicao.desc())
            .first()
        )
        if existente and existente.data_predicao and existente.data_predicao.date() >= date.today():
            print(f"   ⏭️  {aluno.matricula} já tem predição recente, pulando...")
            continue

        resultado = calcular_risco_evasao(aluno, db)
        predicao = models.Predicao(
            aluno_id=aluno.matricula,
            risco_evasao=resultado["risco_evasao"],
            nivel_risco=resultado["nivel_risco"],
            fatores_principais=resultado["fatores_principais"],
            modelo_ml_versao="2.0.0-demo",
        )
        db.add(predicao)
        total += 1
    db.commit()
    print(f"   ✅ {total} predições geradas")


def criar_disciplinas(db: Session, cursos_list: list):
    """Cria disciplinas para cada curso"""
    print("\n📚 Criando disciplinas...")

    disciplinas_por_curso = {
        "Técnico em Informática": [
            "Algoritmos e Lógica de Programação", "Banco de Dados",
            "Redes de Computadores", "Desenvolvimento Web",
            "Programação Orientada a Objetos", "Engenharia de Software",
        ],
        "Técnico em Edificações": [
            "Desenho Técnico", "Topografia", "Materiais de Construção",
            "Estruturas de Concreto", "Instalações Prediais",
        ],
        "Técnico em Administração": [
            "Administração Geral", "Contabilidade Básica",
            "Economia", "Gestão de Pessoas", "Marketing",
        ],
        "Análise e Desenvolvimento de Sistemas": [
            "Programação Avançada", "Estruturas de Dados",
            "Sistemas Distribuídos", "Inteligência Artificial",
        ],
        "Engenharia Civil": [
            "Cálculo Estrutural", "Geotecnia", "Hidráulica",
            "Planejamento Urbano", "Fundações",
        ],
        "Técnico em Meio Ambiente": [
            "Ecologia Geral", "Gestão de Resíduos",
            "Legislação Ambiental", "Recursos Hídricos",
        ],
    }

    todas_disciplinas = []
    for curso in cursos_list:
        nomes = disciplinas_por_curso.get(curso.nome.replace(" (Integrado)", "")
                                         .replace(" (Subsequente)", ""), [])
        for nome in nomes:
            existente = db.query(models.Disciplina).filter(
                models.Disciplina.nome == nome,
                models.Disciplina.curso_id == curso.id,
            ).first()
            if existente:
                todas_disciplinas.append(existente)
                continue
            disc = models.Disciplina(nome=nome, ativa=True, curso_id=curso.id)
            db.add(disc)
            db.flush()
            todas_disciplinas.append(disc)
            print(f"   ✅ {nome} ({curso.nome})")

    db.commit()
    print(f"\n   Total: {len(todas_disciplinas)} disciplinas")
    return todas_disciplinas


def criar_faltas_disciplina(db: Session, alunos: list, disciplinas: list):
    """
    Cria registros de faltas diárias por disciplina.
    Alunos mais antigos (período maior) têm MAIS dias de histórico.

    - Período 1: 45 dias (recém-chegados)
    - Período 2: 90 dias (~1 semestre)
    - Período 3: 180 dias (~1 ano)
    - Período 4: 270 dias (~1.5 anos)
    """
    print("\n📅 Criando faltas por disciplina (proporcional ao tempo do aluno)...")

    DIAS_POR_PERIODO = {1: 45, 2: 90, 3: 180, 4: 270}
    hoje = date.today()
    total = 0

    for aluno in alunos:
        if not aluno.curso_id:
            continue

        # Disciplinas do curso do aluno
        discs_curso = [d for d in disciplinas if d.curso_id == aluno.curso_id]
        if not discs_curso:
            continue

        # Alunos de risco mais alto têm mais faltas
        if aluno.media_geral and float(aluno.media_geral) >= 8:
            prob_falta = 0.05   # 5% de chance de falta por dia
        elif aluno.media_geral and float(aluno.media_geral) >= 6:
            prob_falta = 0.12   # 12%
        elif aluno.media_geral and float(aluno.media_geral) >= 4:
            prob_falta = 0.25   # 25%
        else:
            prob_falta = 0.40   # 40% — muito alto risco

        # Quantos dias de histórico? Proporcional ao período
        periodo = aluno.periodo if aluno.periodo else 1
        dias_historico = DIAS_POR_PERIODO.get(periodo, 60)

        import random
        random.seed(int(aluno.matricula))  # reprodutível

        for dia_offset in range(dias_historico):
            dia = hoje - timedelta(days=dia_offset)
            if dia.weekday() >= 5:  # pula fins de semana
                continue

            # Cada disciplina tem chance de ter falta
            disc = random.choice(discs_curso)
            if random.random() < prob_falta:
                justificada = random.random() < 0.15  # 15% das faltas justificadas
                registro = models.RegistroFaltasDiarias(
                    aluno_matricula=aluno.matricula,
                    disciplina=disc.nome,
                    disciplina_id=disc.id,
                    data=dia,
                    justificada=justificada,
                    motivo_justificativa="Problemas de saúde" if justificada else None,
                )
                db.add(registro)
                total += 1

    db.commit()
    print(f"   ✅ {total} registros de faltas por disciplina criados")


def criar_egressos(db: Session, alunos: list):
    """Cria 3 casos de abandono para o feedback loop do ML"""
    print("\n🚪 Criando egressos (casos de abandono)...")

    # Selecionar 3 alunos de ALTO/MUITO ALTO risco para "abandonarem"
    alunos_alto_risco = [a for a in alunos if a.media_geral and float(a.media_geral) < 5]
    egressos_data = [
        {"aluno": alunos_alto_risco[-1] if len(alunos_alto_risco) > 0 else alunos[-1],
         "motivo": "ABANDONO", "motivo_abandono": "FINANCEIRO",
         "detalhes": "Precisou trabalhar integralmente para sustentar a família"},
        {"aluno": alunos_alto_risco[-2] if len(alunos_alto_risco) > 1 else alunos[-2],
         "motivo": "ABANDONO", "motivo_abandono": "TRABALHO",
         "detalhes": "Conseguiu emprego em tempo integral e não conseguiu conciliar"},
        {"aluno": alunos_alto_risco[-3] if len(alunos_alto_risco) > 2 else alunos[-3],
         "motivo": "TRANSFERENCIA", "motivo_abandono": None,
         "detalhes": "Transferido para outra instituição por mudança de cidade"},
    ]

    for eg_data in egressos_data:
        aluno = eg_data["aluno"]
        existente = db.query(models.Egresso).filter(
            models.Egresso.aluno_matricula == aluno.matricula
        ).first()
        if existente:
            print(f"   ⏭️  Egresso para {aluno.nome} já existe, pulando...")
            continue

        dados_egresso = {
            "aluno_matricula": aluno.matricula,
            "data_saida": date.today() - timedelta(days=90),
            "motivo_saida": eg_data["motivo"],
            "motivo_detalhes": eg_data["detalhes"],
            "tinha_predicao_risco": True,
            "recebeu_intervencao": eg_data["motivo"] == "ABANDONO",
        }
        if eg_data["motivo_abandono"]:
            dados_egresso["motivo_abandono_principal"] = eg_data["motivo_abandono"]

        egresso = models.Egresso(**dados_egresso)
        db.add(egresso)
        print(f"   ✅ Egresso: {aluno.nome} - {eg_data['motivo']} - {eg_data['detalhes'][:50]}...")

    db.commit()


def criar_intervencoes(db: Session, alunos: list, usuarios_map: dict):
    """Cria exemplos de intervenções pedagógicas"""
    print("\n🔧 Criando intervenções pedagógicas...")

    # Alunos de ALTO/MUITO ALTO risco recebem intervenções
    alunos_alvo = [a for a in alunos if a.media_geral and float(a.media_geral) < 5.5][:6]
    pedagogo = usuarios_map.get("pedagogo@dewas.com.br")
    if not pedagogo:
        print("   ⚠️  Pedagogo não encontrado, pulando intervenções...")
        return

    intervencoes_data = [
        {"tipo": "Aconselhamento Acadêmico", "status": "EM_ANDAMENTO",
         "descricao": "Sessão de orientação para organizar rotina de estudos. Aluno demonstrou interesse em melhorar.",
         "prioridade": "ALTA"},
        {"tipo": "Monitoria", "status": "CONCLUIDA",
         "descricao": "Aluno encaminhado para monitoria de matemática. Apresentou melhora de 20% nas notas.",
         "prioridade": "MEDIA"},
        {"tipo": "Visita Domiciliar", "status": "PENDENTE",
         "descricao": "Agendar visita para entender contexto familiar e oferecer suporte da assistência social.",
         "prioridade": "URGENTE"},
        {"tipo": "Encaminhamento Psicológico", "status": "EM_ANDAMENTO",
         "descricao": "Aluno relatou ansiedade e desmotivação. Encaminhado ao serviço de psicologia.",
         "prioridade": "ALTA"},
        {"tipo": "Bolsa Permanência", "status": "PENDENTE",
         "descricao": "Solicitar bolsa permanência para reduzir necessidade de trabalho externo.",
         "prioridade": "URGENTE"},
        {"tipo": "Reunião com Responsáveis", "status": "RASCUNHO",
         "descricao": "Convocar responsáveis para discutir frequência baixa e risco de evasão.",
         "prioridade": "ALTA", "auto_gerada": True},
    ]

    total = 0
    for i, inter_data in enumerate(intervencoes_data):
        aluno = alunos_alvo[i % len(alunos_alvo)]
        intervencao = models.Intervencao(
            aluno_id=aluno.matricula,
            usuario_id=pedagogo.id,
            data_intervencao=date.today() - timedelta(days=30 * i),
            tipo=inter_data["tipo"],
            descricao=inter_data["descricao"],
            status=models.StatusIntervencao(inter_data["status"]),
            prioridade=inter_data["prioridade"],
            data_limite=date.today() + timedelta(days=180),  # 6 meses
            auto_gerada=inter_data.get("auto_gerada", False),
        )
        db.add(intervencao)
        total += 1
        print(f"   ✅ [{inter_data['status']}] {inter_data['tipo']} - {aluno.nome}")
    db.commit()


def criar_questionarios(db: Session, alunos: list):
    """Cria respostas de questionário psicossocial para 5 alunos"""
    print("\n📋 Criando questionários psicossociais...")

    questionarios = [
        # Aluno de BAIXO risco - boas respostas
        {"aluno_idx": 0, "respostas": [2, 2, 2, 1, 4, 4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 1, 2, 3, 1, 2, 1, 1, 5, 1, 1]},
        # Aluno de MÉDIO risco
        {"aluno_idx": 5, "respostas": [3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 2, 3, 3, 2, 3, 2, 2, 3, 1, 2]},
        # Aluno de ALTO risco
        {"aluno_idx": 10, "respostas": [4, 4, 4, 3, 2, 2, 2, 1, 2, 1, 2, 2, 1, 1, 2, 4, 3, 2, 4, 4, 4, 4, 2, 3, 4]},
        # Aluno de MUITO ALTO risco
        {"aluno_idx": 15, "respostas": [5, 5, 5, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 4, 1, 5, 5, 5, 5, 1, 5, 5]},
        # Aluno de MUITO ALTO risco
        {"aluno_idx": 18, "respostas": [4, 5, 5, 4, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 5, 4, 1, 5, 5, 5, 5, 1, 4, 5]},
    ]

    campos = [
        "q1_ansiedade", "q2_depressao", "q3_estresse", "q4_sono", "q5_bem_estar",
        "q6_pertencimento", "q7_amizades", "q8_participacao", "q9_relacionamento_professores", "q10_apoio_colegas",
        "q11_expectativas", "q12_qualidade_aulas", "q13_infraestrutura", "q14_conteudo_programatico", "q15_motivacao_curso",
        "q16_trabalho_estudo", "q17_familia_estudo", "q18_tempo_lazer", "q19_cansaco", "q20_sobrecarga",
        "q21_pensou_abandonar", "q22_frequencia_pensamento", "q23_motivacao_permanencia", "q24_plano_abandonar", "q25_previsao_abandono",
    ]

    for q_data in questionarios:
        aluno = alunos[q_data["aluno_idx"]]

        existente = db.query(models.QuestionarioPsicossocial).filter(
            models.QuestionarioPsicossocial.aluno_matricula == aluno.matricula
        ).first()
        if existente:
            print(f"   ⏭️  Questionário para {aluno.nome} já existe, pulando...")
            continue

        valores = {campo: valor for campo, valor in zip(campos, q_data["respostas"])}

        # Calcular scores
        saude = sum(q_data["respostas"][0:5]) * (25.0 / 25.0)
        integracao_raw = sum(q_data["respostas"][5:10])
        integracao_invertida = 25 - integracao_raw  # quanto menor, pior
        integracao = max(0, min(20, (integracao_invertida / 25.0) * 20))
        satisfacao_raw = sum(q_data["respostas"][10:15])
        satisfacao_invertida = 25 - satisfacao_raw
        satisfacao = max(0, min(20, (satisfacao_invertida / 25.0) * 20))
        conflitos_raw = sum(q_data["respostas"][15:20])
        conflitos = max(0, min(20, (conflitos_raw / 25.0) * 20))
        intencao_raw = sum(q_data["respostas"][20:25])
        intencao = max(0, min(15, (intencao_raw / 25.0) * 15))

        score_total = round(saude + integracao + satisfacao + conflitos + intencao, 2)

        if score_total > 60:
            nivel_ps = "MUITO_ALTO"
        elif score_total > 40:
            nivel_ps = "ALTO"
        elif score_total > 20:
            nivel_ps = "MEDIO"
        else:
            nivel_ps = "BAIXO"

        questionario = models.QuestionarioPsicossocial(
            aluno_matricula=aluno.matricula,
            **valores,
            score_saude_mental=round(saude, 2),
            score_integracao_social=round(integracao, 2),
            score_satisfacao_curso=round(satisfacao, 2),
            score_conflitos=round(conflitos, 2),
            score_intencao_evasao=round(intencao, 2),
            score_psicossocial_total=score_total,
            nivel_risco_psicossocial=nivel_ps,
            termo_consentimento=True,
        )
        db.add(questionario)
        print(f"   ✅ Questionário: {aluno.nome} - Score: {score_total:.1f} - Risco: {nivel_ps}")

    db.commit()


def criar_comunicacoes(db: Session, alunos: list, usuarios_map: dict):
    """Cria exemplos de comunicações enviadas"""
    print("\n📨 Criando comunicações...")

    admin = usuarios_map.get("admin@dewas.com.br")
    if not admin:
        return

    comunicacoes_data = [
        {"tipo": "FALTAS", "canal": "WHATSAPP", "destinatario": "RESPONSAVEL",
         "mensagem": "Prezado responsável, o aluno acumulou 5 faltas consecutivas. Por favor, entre em contato com a coordenação.",
         "assunto": "Alerta de Faltas Consecutivas", "status": "ENVIADA"},
        {"tipo": "RISCO", "canal": "EMAIL", "destinatario": "ALUNO",
         "mensagem": "Prezado aluno, identificamos que seu rendimento acadêmico está abaixo do esperado. Agende um horário com a pedagoga.",
         "assunto": "Acompanhamento Acadêmico", "status": "ENTREGUE"},
        {"tipo": "LEMBRETE", "canal": "WHATSAPP", "destinatario": "COORDENADOR",
         "mensagem": "Lembrete: Reunião de acompanhamento de alunos em risco amanhã às 14h.",
         "assunto": "Lembrete de Reunião", "status": "LIDA"},
    ]

    for i, com_data in enumerate(comunicacoes_data):
        aluno = alunos[i % len(alunos)]
        comunicacao = models.Comunicacao(
            aluno_matricula=aluno.matricula,
            usuario_id=admin.id,
            tipo_comunicacao=models.TipoComunicacao(com_data["tipo"]),
            canal=models.CanalComunicacao(com_data["canal"]),
            destinatario_tipo=models.DestinatarioTipo(com_data["destinatario"]),
            destinatario_nome=aluno.nome,
            destinatario_contato=aluno.telefone or "(92) 90000-0000",
            assunto=com_data["assunto"],
            mensagem=com_data["mensagem"],
            status=models.StatusComunicacao(com_data["status"]),
            data_envio=datetime.now() - timedelta(days=i * 7),
        )
        db.add(comunicacao)
        print(f"   ✅ [{com_data['status']}] {com_data['tipo']} via {com_data['canal']} - {aluno.nome}")
    db.commit()


def criar_atendimentos(db: Session, alunos: list, usuarios_map: dict):
    """Cria registros de atendimentos"""
    print("\n💬 Criando atendimentos...")

    pedagogo = usuarios_map.get("pedagogo@dewas.com.br")
    if not pedagogo:
        return

    atends = [
        {"tipo": "PSICOLOGICO", "status": "REALIZADO", "dias": -45,
         "descricao": "Atendimento psicológico - aluno com sintomas de ansiedade. Técnicas de respiração ensinadas."},
        {"tipo": "SOCIAL", "status": "REALIZADO", "dias": -30,
         "descricao": "Visita domiciliar realizada. Família em situação de vulnerabilidade. Encaminhada ao CRAS."},
        {"tipo": "ACADEMICO", "status": "EM_ANDAMENTO", "dias": -15,
         "descricao": "Orientação acadêmica - plano de estudos personalizado. Aluno aderiu bem."},
        {"tipo": "CONVERSA_INFORMAL", "status": "CONCLUIDO", "dias": -10,
         "descricao": "Conversa sobre desmotivação. Aluno relatou problemas familiares. Aconselhado."},
        {"tipo": "SAUDE", "status": "AGENDADO", "dias": 7,
         "descricao": "Encaminhamento para avaliação médica - suspeita de problemas de visão afetando estudos."},
    ]

    for at_data in atends:
        aluno = alunos[10 + atends.index(at_data)]  # alunos de alto risco
        atendimento = models.Atendimento(
            aluno_matricula=aluno.matricula,
            usuario_id=pedagogo.id,
            tipo_atendimento=models.TipoAtendimento(at_data["tipo"]),
            status=models.StatusAtendimento(at_data["status"]),
            data_atendimento=date.today() + timedelta(days=at_data["dias"]) if at_data["dias"] > 0 else date.today() + timedelta(days=at_data["dias"]),
            descricao=at_data["descricao"],
        )
        db.add(atendimento)
        print(f"   ✅ [{at_data['status']}] {at_data['tipo']} - {aluno.nome}")
    db.commit()


def criar_configuracoes(db: Session):
    """Cria configurações padrão do sistema"""
    print("\n⚙️ Criando configurações do sistema...")

    configs = [
        {"chave": "limite_faltas_consecutivas_alerta", "valor": "5", "descricao": "Número de faltas consecutivas para gerar alerta"},
        {"chave": "frequencia_minima_percentual", "valor": "75", "descricao": "Percentual mínimo de frequência aceitável"},
        {"chave": "media_minima_aprovacao", "valor": "6.0", "descricao": "Média mínima para aprovação"},
        {"chave": "dias_prazo_intervencao", "valor": "180", "descricao": "Prazo padrão para ciclo de intervenção (dias)"},
        {"chave": "instituicao_nome", "valor": "Instituto Federal Demo - Campus Centro", "descricao": "Nome da instituição de ensino"},
    ]

    for cfg in configs:
        existente = db.query(models.ConfiguracaoSistema).filter(
            models.ConfiguracaoSistema.chave == cfg["chave"]
        ).first()
        if existente:
            continue
        config = models.ConfiguracaoSistema(**cfg)
        db.add(config)
    db.commit()
    print(f"   ✅ {len(configs)} configurações verificadas/criadas")


# ============================================
# EXECUÇÃO PRINCIPAL
# ============================================

def main():
    print("=" * 60)
    print("🌱 SAPEE DEWAS - SEED DEMO COMPLETO")
    print("=" * 60)
    print("Instituição FICTÍCIA: Instituto Federal Demo - Campus Centro")
    print("=" * 60)

    db = next(database.get_db())

    try:
        # 1. Roles
        roles_map = criar_roles(db)

        # 2. Cursos
        cursos_list = criar_cursos(db)

        # 3. Usuários
        usuarios_map = criar_usuarios(db, roles_map, cursos_list)

        # 4. Alunos
        alunos = criar_alunos(db, cursos_list)

        # 5. Frequência Mensal
        criar_frequencia_mensal(db, alunos)

        # 6. Predições
        criar_predicoes(db, alunos)

        # 7. Disciplinas
        disciplinas = criar_disciplinas(db, cursos_list)

        # 8. Faltas por Disciplina (últimos 60 dias)
        criar_faltas_disciplina(db, alunos, disciplinas)

        # 9. Egressos (casos de abandono)
        criar_egressos(db, alunos)

        # 10. Intervenções
        criar_intervencoes(db, alunos, usuarios_map)

        # 11. Questionários
        criar_questionarios(db, alunos)

        # 12. Comunicações
        criar_comunicacoes(db, alunos, usuarios_map)

        # 13. Atendimentos
        criar_atendimentos(db, alunos, usuarios_map)

        # 14. Configurações
        criar_configuracoes(db)

        # ============================================
        # RESUMO FINAL
        # ============================================
        print("\n" + "=" * 60)
        print("✅ SEED DEMO CONCLUÍDO COM SUCESSO!")
        print("=" * 60)
        print(f"""
📊 RESUMO:
   🏫  6 cursos
   👥  5 perfis (roles)
   👤  5 usuários
   🎓  20 alunos (5 🟢 baixo, 5 🟡 médio, 5 🟠 alto, 5 🔴 muito alto)
   📊  ~267 registros de frequência mensal
        ├─ Período 1 (novos): 3 meses
        ├─ Período 2: 9 meses
        ├─ Período 3: 15 meses
        └─ Período 4 (veteranos): 21 meses
   🧠  20 predições de risco
   📚  ~30 disciplinas (5-6 por curso)
   📅  ~1000+ faltas por disciplina (45-270 dias conforme período)
   🚪  3 egressos (casos de abandono)
   🔧  6 intervenções pedagógicas
   📋  5 questionários psicossociais
   📨  3 comunicações
   💬  5 atendimentos
   ⚙️  5 configurações do sistema

⚠️  REGRA DE OURO: Alunos com menos de 6 meses de histórico
    (Período 1) têm predição de confiabilidade REDUZIDA.

🔐 CREDENCIAIS DE TESTE:
   ┌──────────────┬──────────────────────────┬──────────────┐
   │ Função       │ Email                    │ Senha        │
   ├──────────────┼──────────────────────────┼──────────────┤
   │ ADMIN        │ admin@dewas.com.br       │ admin123     │
   │ COORDENADOR  │ coord@dewas.com.br       │ coord123     │
   │ PEDAGOGO     │ pedagogo@dewas.com.br    │ pedagogo123  │
   │ DIRETOR      │ diretor@dewas.com.br     │ diretor123   │
   │ PROFESSOR    │ professor@dewas.com.br   │ professor123 │
   └──────────────┴──────────────────────────┴──────────────┘

🚀 PRÓXIMOS PASSOS:
   1. Inicie o backend: uvicorn main:app --reload
   2. Inicie o frontend: npm run dev
   3. Acesse http://localhost:5173
   4. Faça login com admin@dewas.com.br / admin123
   5. Explore o Dashboard e veja os 20 alunos com diferentes níveis de risco!
""")

    except Exception as e:
        db.rollback()
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

    return True


if __name__ == "__main__":
    main()
