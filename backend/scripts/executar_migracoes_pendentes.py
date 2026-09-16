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
Script unificado para executar todas as migrações SQL pendentes.
Verifica cada script, executa apenas o que for necessário, e reporta o status.
"""
import pymysql
import os
import re
import sys
from pathlib import Path

# Configs da conexão (do .env)
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "S@nx5497",
    "database": "sapee_dewas",
}

SCRIPT_DIR = Path(__file__).resolve().parent.parent / "scripts"
BACKEND_DIR = Path(__file__).resolve().parent


def conectar():
    return pymysql.connect(**DB_CONFIG)


def executar_sql(conn: pymysql.Connection, sql_script: str, nome: str) -> bool:
    """
    Executa um script SQL multi-statement usando o conector.
    Processa cada statement individualmente, ignorando comentários.
    Retorna True se tudo executou com sucesso.
    """
    cur = conn.cursor()

    # Remove comentários e linhas vazias; divide por ";"
    statements = []
    for line in sql_script.replace("\r\n", "\n").split("\n"):
        stripped = line.strip()
        # Ignora comentários
        if stripped.startswith("--") or stripped.startswith("#") or not stripped:
            continue
        statements.append(line)

    full_sql = "\n".join(statements)
    # Divide por ponto-e-vírgula (preservando strings; hack simples)
    commands = [cmd.strip() for cmd in full_sql.split(";") if cmd.strip()]

    ok, falhas = 0, 0
    for i, cmd in enumerate(commands, 1):
        # Pula comandos puramente de SELECT/DESCRIBE (relatórios)
        if re.match(r"^\s*(SELECT|DESCRIBE|SHOW)\s", cmd, re.IGNORECASE):
            continue
        try:
            cur.execute(cmd)
            print(f"  [{i}/{len(commands)}] OK: {cmd[:80]}...")
            ok += 1
        except pymysql.err.OperationalError as e:
            code = e.args[0]
            # 1060 = Duplicate column, 1050 = Table exists, 1061 = Duplicate key
            if code in (1060, 1050, 1061, 1062, 1022):
                print(f"  [{i}/{len(commands)}] JÁ EXISTE (ignorando): {cmd[:80]}...")
            else:
                print(f"  [{i}/{len(commands)}] ERRO [{code}]: {e}")
                falhas += 1
        except Exception as e:
            print(f"  [{i}/{len(commands)}] ERRO: {e}")
            falhas += 1

    return falhas == 0


def verificar_coluna(conn: pymysql.Connection, tabela: str, coluna: str) -> bool:
    """Retorna True se a coluna existe na tabela."""
    cur = conn.cursor()
    cur.execute(f"DESCRIBE {tabela}")
    colunas = [row[0] for row in cur.fetchall()]
    return coluna in colunas


def verificar_tabela(conn: pymysql.Connection, tabela: str) -> bool:
    """Retorna True se a tabela existe."""
    cur = conn.cursor()
    cur.execute(f"SHOW TABLES LIKE '{tabela}'")
    return cur.fetchone() is not None


def main():
    print("=" * 70)
    print("SAPEE DEWAS - Executando Migrações SQL Pendentes")
    print("=" * 70)

    # 1. Testar conexão
    print("\n[1/5] Testando conexão com MySQL...")
    try:
        conn = conectar()
        print("  ✅ Conectado a sapee_dewas com sucesso!")
    except Exception as e:
        print(f"  ❌ ERRO de conexão: {e}")
        print("  Verifique se o MySQL está rodando e o .env está correto.")
        sys.exit(1)

    # 2. Scripts de migração individuais
    scripts_migracao = [
        "migracao_contato_responsaveis.sql",
        "migracao_responsaveis_alunos.sql",
        "migracao_responsavel_alertas.sql",
        "migracao_historico_alertas.sql",
        "migracao_prazo_alertas.sql",
    ]

    print("\n[2/5] Executando scripts de migração estrutural...")
    for script_file in scripts_migracao:
        path = SCRIPT_DIR / script_file
        nome = script_file.replace(".sql", "")
        if not path.exists():
            print(f"  ⚠️  Script não encontrado: {script_file}")
            continue
        sql = path.read_text(encoding="utf-8")
        print(f"\n  ▶ {script_file}:")
        try:
            executar_sql(conn, sql, nome)
            conn.commit()
        except Exception as e:
            print(f"  ❌ Falha ao executar {script_file}: {e}")
            conn.rollback()

    # 3. Scripts nos diretórios backend e scripts/
    scripts_extra = [
        BACKEND_DIR / "atualizar_predicoes_enum.sql",
        SCRIPT_DIR / "atualizar_motivo_risco_mysql.sql",
        SCRIPT_DIR / "atualizar_motivo_risco.sql",
        SCRIPT_DIR / "criar_alertas_teste.sql",
        SCRIPT_DIR / "dados_teste_consolidacao.sql",
        SCRIPT_DIR / "dados_teste_faltas_responsaveis.sql",
        SCRIPT_DIR / "migrar_frequencia_faltas.sql",
    ]

    print("\n[3/5] Executando scripts de atualização de dados...")
    for path in scripts_extra:
        if not path.exists():
            print(f"  ⚠️  Script não encontrado: {path.name}")
            continue
        sql = path.read_text(encoding="utf-8")
        print(f"\n  ▶ {path.name}:")
        try:
            executar_sql(conn, sql, path.name)
            conn.commit()
        except Exception as e:
            print(f"  ❌ Falha ao executar {path.name}: {e}")
            conn.rollback()

    # 4. Verificar consistência: models.py vs banco
    print("\n[4/5] Verificando consistência models.py × banco de dados...")

    # Colunas críticas que devem existir (baseado nos scripts SQL)
    verificacoes = [
        # (tabela, coluna, origem)
        ("alertas_faltas_consecutivas", "contato_responsavel_data", "migracao_contato_responsaveis.sql"),
        ("alertas_faltas_consecutivas", "contato_responsavel_meio", "migracao_contato_responsaveis.sql"),
        ("alertas_faltas_consecutivas", "contato_responsavel_obs", "migracao_contato_responsaveis.sql"),
        ("alertas_faltas_consecutivas", "responsavel_id", "migracao_responsavel_alertas.sql"),
    ]

    pendentes = []
    for tabela, coluna, origem in verificacoes:
        try:
            if verificar_coluna(conn, tabela, coluna):
                print(f"  ✅ {tabela}.{coluna} → OK")
            else:
                print(f"  ❌ {tabela}.{coluna} → NÃO EXISTE (script: {origem})")
                pendentes.append((tabela, coluna, origem))
        except Exception as e:
            print(f"  ⚠️  {tabela}.{coluna} → erro ao verificar: {e}")

    # 5. Resumo final
    print("\n" + "=" * 70)
    print("[5/5] RESUMO FINAL")
    print("=" * 70)

    # Contar tabelas
    cur = conn.cursor()
    cur.execute("SHOW TABLES")
    total_tabelas = len(cur.fetchall())

    print(f"  • Tabelas no banco: {total_tabelas}")
    print(f"  • Colunas pendentes: {len(pendentes)}")
    if pendentes:
        print("\n  ⚠️  Colunas que ainda NÃO existem no banco:")
        for tabela, coluna, origem in pendentes:
            print(f"     - {tabela}.{coluna} (script: {origem})")
        print("\n  Execute novamente este script ou execute os scripts manualmente no MySQL Workbench.")
    else:
        print("  ✅ Todas as colunas críticas estão presentes!")

    conn.close()
    print("\n  ✅ Conexão fechada.")
    print("\n" + "=" * 70)
    print("Migrações concluídas!")
    print("=" * 70)


if __name__ == "__main__":
    main()