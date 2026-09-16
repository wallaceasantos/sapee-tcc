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

"""Gera ~250 egressos realistas para validacao do modelo."""
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from datetime import date, timedelta
import database, models

random.seed(42)
db = next(database.get_db())

alunos = db.query(models.Aluno).all()
total = len(alunos)
if total < 100:
    print(f"Apenas {total} alunos. Importe o CSV primeiro.")
    exit()

existentes = db.query(models.Egresso).count()
if existentes > 0:
    db.query(models.Egresso).delete()
    db.commit()
    print(f"Removidos {existentes} egressos antigos.")

admin = db.query(models.Usuario).filter(models.Usuario.email == "admin@dewas.com.br").first()
admin_id = admin.id if admin else 2

# Distribuicao de risco/alunos para amostragem
ALVO = 250

# Buscar alunos por nivel de risco com suas predicoes
alunos_risco = {}
for nivel in ["MUITO_ALTO", "ALTO", "MEDIO", "BAIXO"]:
    alunos_risco[nivel] = []
    preds = db.query(models.Predicao).filter(
        models.Predicao.nivel_risco == nivel
    ).order_by(models.Predicao.data_predicao.desc()).all()
    matriculas_pred = {p.aluno_id for p in preds}
    
    for a in alunos:
        if a.matricula in matriculas_pred:
            alunos_risco[nivel].append(a)

# Queremos ~50% de evadidos, 50% de nao-evadidos para boa validacao
# ~125 evadidos, ~125 nao evadidos
motivos_abandono = ["FINANCEIRO", "TRABALHO", "DIFICULDADE_ACADEMICA", "FALTA_INTERESSE", "FAMILIA", "SAUDE"]

egressos_criados = 0
evadidos = 0
concluintes = 0
outros = 0

def criar_egresso(aluno, motivo_saida, dias_atras, motivo_abandono=None):
    data_saida = date.today() - timedelta(days=dias_atras)
    pred = db.query(models.Predicao).filter(
        models.Predicao.aluno_id == aluno.matricula
    ).order_by(models.Predicao.data_predicao.desc()).first()
    nivel = pred.nivel_risco.value if pred else "BAIXO"
    # Mapear MUITO_ALTO para ALTO (ENUM da tabela egressos)
    if nivel == "MUITO_ALTO":
        nivel = "ALTO"
    
    e = models.Egresso(
        aluno_matricula=aluno.matricula,
        data_saida=data_saida,
        motivo_saida=motivo_saida,
        motivo_abandono_principal=motivo_abandono,
        tinha_predicao_risco=pred is not None,
        nivel_risco_predito=nivel,
        recebeu_intervencao=random.choice([True, False]),
        cadastrado_por=admin_id,
        observacoes=f"Validacao automatica - {motivo_saida}",
    )
    db.add(e)

# 1. MUITO_ALTO: 70% ABANDONO, 10% JUBILAMENTO, 10% CONCLUSAO, 10% TRANSFERENCIA
pool = random.sample(alunos_risco.get("MUITO_ALTO", alunos_risco.get("ALTO", [])), min(80, len(alunos_risco.get("MUITO_ALTO", []))))
for a in pool:
    r = random.random()
    dias = random.randint(60, 900)
    if r < 0.70:
        criar_egresso(a, "ABANDONO", dias, random.choice(motivos_abandono))
        evadidos += 1
    elif r < 0.80:
        criar_egresso(a, "JUBILAMENTO", dias, "DIFICULDADE_ACADEMICA")
        evadidos += 1
    elif r < 0.90:
        criar_egresso(a, "CONCLUSAO", dias)
        concluintes += 1
    else:
        criar_egresso(a, "TRANSFERENCIA", dias)
        outros += 1
    egressos_criados += 1

# 2. ALTO: 50% ABANDONO, 10% JUBILAMENTO, 25% CONCLUSAO, 15% OUTROS
pool = random.sample(alunos_risco.get("ALTO", alunos_risco.get("MEDIO", [])), min(70, len(alunos_risco.get("ALTO", []))))
for a in pool:
    r = random.random()
    dias = random.randint(60, 800)
    if r < 0.50:
        criar_egresso(a, "ABANDONO", dias, random.choice(motivos_abandono))
        evadidos += 1
    elif r < 0.60:
        criar_egresso(a, "JUBILAMENTO", dias, "DIFICULDADE_ACADEMICA")
        evadidos += 1
    elif r < 0.85:
        criar_egresso(a, "CONCLUSAO", dias)
        concluintes += 1
    else:
        criar_egresso(a, "TRANSFERENCIA", dias)
        outros += 1
    egressos_criados += 1

# 3. MEDIO: 20% ABANDONO, 5% JUBILAMENTO, 60% CONCLUSAO, 15% OUTROS
pool = random.sample(alunos_risco.get("MEDIO", alunos_risco.get("BAIXO", [])), min(60, len(alunos_risco.get("MEDIO", []))))
for a in pool:
    r = random.random()
    dias = random.randint(60, 700)
    if r < 0.20:
        criar_egresso(a, "ABANDONO", dias, random.choice(motivos_abandono))
        evadidos += 1
    elif r < 0.25:
        criar_egresso(a, "JUBILAMENTO", dias, "DIFICULDADE_ACADEMICA")
        evadidos += 1
    elif r < 0.85:
        criar_egresso(a, "CONCLUSAO", dias)
        concluintes += 1
    else:
        criar_egresso(a, "TRANSFERENCIA", dias)
        outros += 1
    egressos_criados += 1

# 4. BAIXO: 5% ABANDONO, 80% CONCLUSAO, 15% OUTROS
pool = random.sample(alunos_risco.get("BAIXO", alunos_risco.get("MEDIO", [])), min(50, len(alunos_risco.get("BAIXO", []))))
for a in pool:
    r = random.random()
    dias = random.randint(60, 600)
    if r < 0.05:
        criar_egresso(a, "ABANDONO", dias, random.choice(["FINANCEIRO", "SAUDE"]))
        evadidos += 1
    elif r < 0.85:
        criar_egresso(a, "CONCLUSAO", dias)
        concluintes += 1
    else:
        criar_egresso(a, "TRANSFERENCIA", dias)
        outros += 1
    egressos_criados += 1

db.commit()

print(f"Egressos criados: {egressos_criados}")
print(f"  Evadidos (ABANDONO/JUBILAMENTO): {evadidos}")
print(f"  Concluintes: {concluintes}")
print(f"  Outros (TRANSFERENCIA/TRANCAMENTO): {outros}")

alunos_restantes = db.query(models.Aluno).count()
print(f"\nAlunos ativos no banco: {alunos_restantes}")

db.close()
