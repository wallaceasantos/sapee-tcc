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

"""Reseta banco e recria com 19 cursos SUPERIOR + admin."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

import database, models
from sqlalchemy import text

db = next(database.get_db())

# Desabilitar verificacao de FK para limpeza rapida
db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
db.commit()

tabelas = [
    "predicao_historico", "alertas_faltas_historico", "historico_encaminhamento",
    "comunicacoes", "atendimentos", "registro_faltas_diarias",
    "alertas_faltas_consecutivas", "notas_disciplina", "frequencia_mensal",
    "intervencoes", "questionario_psicossocial", "tokens_questionario",
    "predicoes", "aluno_metas", "planos_acao", "metas_semestrais",
    "egressos", "disciplina_professor", "alunos", "disciplinas",
    "cursos", "templates_comunicacao",
]

for t in tabelas:
    try:
        r = db.execute(text(f"DELETE FROM {t}"))
        db.commit()
        if r.rowcount > 0:
            print(f"  {t}: {r.rowcount}")
    except Exception as e:
        db.rollback()
        print(f"  {t}: erro - {e}")

# Preservar admin
db.execute(text("DELETE FROM usuarios WHERE email != 'admin@dewas.com.br'"))
db.execute(text("DELETE FROM roles WHERE nome != 'ADMIN'"))
db.execute(text("DELETE FROM audit_logs"))
db.execute(text("DELETE FROM configuracoes_sistema"))
db.commit()
print("Preservado: admin + role ADMIN")

# Habilitar FK novamente
db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
db.commit()

# Adicionar 19 cursos SUPERIOR
CURSOS = [
    "Administracao", "Ciencias Contabeis", "Direito",
    "Enfermagem", "Fisioterapia", "Farmacia",
    "Educacao Fisica", "Estetica e Cosmetica", "Nutricao",
    "Medicina Veterinaria", "Psicologia", "Pedagogia",
    "Analise e Desenvolvimento de Sistemas", "Logistica", "Marketing",
    "Gestao de Recursos Humanos", "Gestao Financeira",
    "Processos Gerenciais", "Servico Social",
]

for nome in CURSOS:
    db.add(models.Curso(nome=nome, modalidade="SUPERIOR"))

db.commit()

cursos = db.query(models.Curso).all()
print(f"\nCursos adicionados: {len(cursos)}")
for c in cursos:
    print(f"  ID={c.id} | {c.nome}")

db.close()
print("\nPronto. Banco limpo e com 19 cursos SUPERIOR.")
