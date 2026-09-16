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
Script de otimização: adiciona índices nas foreign keys baseadas em matricula.

Este script deve ser executado uma vez para melhorar performance de queries.
A migração futura de matricula (String PK -> Integer PK) requer planejamento
cuidadoso e será feita via Alembic em versão futura.

Estratégia planejada para migração futura:
1. Adicionar coluna `id` AUTO_INCREMENT na tabela alunos
2. Adicionar coluna `aluno_id_int` nas tabelas filhas
3. Popular `aluno_id_int` via JOIN com matricula
4. Trocar FKs para `aluno_id_int`
5. Tornar `id` a nova PK e `matricula` UNIQUE
6. Remover colunas antigas

Executar: python add_fk_indexes.py
"""

from sqlalchemy import text

from database import engine


def add_indexes():
    indexes = [
        (
            "predicoes",
            "ix_predicoes_aluno_id",
            "aluno_id",
        ),
        (
            "frequencia_mensal",
            "ix_frequencia_mensal_aluno_id",
            "aluno_id",
        ),
        (
            "registro_faltas_diarias",
            "ix_faltas_diarias_aluno_id",
            "aluno_id",
        ),
        (
            "notas_disciplina",
            "ix_notas_disciplina_aluno_id",
            "aluno_id",
        ),
        (
            "intervencoes",
            "ix_intervencoes_aluno_id",
            "aluno_id",
        ),
        (
            "atendimentos",
            "ix_atendimentos_aluno_id",
            "aluno_id",
        ),
        (
            "comunicacoes",
            "ix_comunicacoes_aluno_id",
            "aluno_id",
        ),
    ]

    with engine.connect() as conn:
        for table, index_name, column in indexes:
            try:
                conn.execute(
                    text(
                        f"CREATE INDEX {index_name} ON {table} ({column})"
                    )
                )
                conn.commit()
                print(f"OK: {index_name} criado em {table}.{column}")
            except Exception as e:
                if "Duplicate key name" in str(e) or "already exists" in str(e):
                    print(f"SKIP: {index_name} ja existe em {table}")
                else:
                    print(f"ERRO: {index_name} em {table}: {e}")


if __name__ == "__main__":
    add_indexes()
