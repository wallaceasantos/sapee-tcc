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
Substitui cursos antigos pelos 19 cursos SUPERIOR.
Executar APOS limpar_banco.py ou com banco vazio.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
import database, models

db = next(database.get_db())

# Remove cursos existentes
old = db.query(models.Curso).delete()
db.commit()
print(f"Removidos {old} cursos antigos.")

CURSOS = [
    "Administracao",
    "Ciencias Contabeis",
    "Direito",
    "Enfermagem",
    "Fisioterapia",
    "Farmacia",
    "Educacao Fisica",
    "Estetica e Cosmetica",
    "Nutricao",
    "Medicina Veterinaria",
    "Psicologia",
    "Pedagogia",
    "Analise e Desenvolvimento de Sistemas",
    "Logistica",
    "Marketing",
    "Gestao de Recursos Humanos",
    "Gestao Financeira",
    "Processos Gerenciais",
    "Servico Social",
]

for nome in CURSOS:
    db.add(models.Curso(nome=nome, modalidade="SUPERIOR"))

db.commit()
print(f"Adicionados {len(CURSOS)} cursos SUPERIOR.")

cursos = db.query(models.Curso).all()
for c in cursos:
    print(f"  ID={c.id} | {c.nome}")

db.close()
