"""
Bootstrap de producao do backend SAPEE.

Executado antes do uvicorn para:
1. Validar variaveis de ambiente obrigatorias (falha com mensagem clara);
2. Garantir o schema do banco a partir dos modelos (idempotente);
3. Opcionalmente aplicar migracoes Alembic (se RUN_MIGRATIONS=true).

Necessario porque a migration baseline do projeto e um *diff* (ALTER/DROP)
que falha em um banco vazio, derrubando o container na inicializacao.
"""

import os
import sys

# Carrega o .env quando existir (em producao as variaveis vem do ambiente)
try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass


def _garantir_admin() -> None:
    """Cria a role ADMIN e o usuario administrador padrao, se ainda nao existirem."""
    if os.getenv("SEED_ADMIN", "true").lower() != "true":
        print("[bootstrap] SEED_ADMIN != true: pulando criacao do usuario admin.")
        return

    import auth
    import models
    from database import SessionLocal

    email = os.getenv("ADMIN_EMAIL", "admin@dewas.com.br").strip().lower()
    senha = os.getenv("ADMIN_PASSWORD", "admin123")

    db = SessionLocal()
    try:
        role = db.query(models.Role).filter(models.Role.nome == "ADMIN").first()
        if not role:
            role = models.Role(
                nome="ADMIN",
                descricao="Administrador do sistema - acesso total",
                permissoes='{"dashboard": "all", "alunos": ["create", "read", "update", "delete"], '
                '"importar": true, "relatorios": "all", "logs": true, "usuarios": true, '
                '"configuracoes": true}',
            )
            db.add(role)
            db.commit()
            db.refresh(role)
            print("[bootstrap] role ADMIN criada.")

        usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
        if usuario:
            print(f"[bootstrap] usuario admin ja existe: {email}")
        else:
            db.add(
                models.Usuario(
                    nome="Administrador DEWAS",
                    email=email,
                    senha=auth.gerar_hash_senha(senha),
                    role_id=role.id,
                    ativo=True,
                )
            )
            db.commit()
            print(f"[bootstrap] usuario admin criado: {email}")
    finally:
        db.close()


def main() -> int:
    faltando = [v for v in ("DATABASE_URL", "SECRET_KEY") if not os.getenv(v)]
    if faltando:
        print(f"[bootstrap] ERRO: variaveis obrigatorias ausentes: {', '.join(faltando)}")
        return 1

    try:
        import database
        import models
    except Exception as e:  # pragma: no cover - diagnostico
        print(f"[bootstrap] ERRO ao importar modulos da aplicacao: {e}")
        return 1

    print("[bootstrap] garantindo schema a partir dos modelos (idempotente)...")
    try:
        models.Base.metadata.create_all(bind=database.engine)
    except Exception as e:
        print(f"[bootstrap] ERRO ao criar schema no banco: {e}")
        return 1

    if os.getenv("RUN_MIGRATIONS", "false").lower() == "true":
        print("[bootstrap] aplicando migracoes Alembic (RUN_MIGRATIONS=true)...")
        try:
            from alembic import command
            from alembic.config import Config

            command.upgrade(Config("alembic.ini"), "head")
            print("[bootstrap] migracoes aplicadas com sucesso")
        except Exception as e:
            print(f"[bootstrap] AVISO: Alembic falhou (ignorado): {e}")

    print("[bootstrap] garantindo usuario administrador padrao...")
    try:
        _garantir_admin()
    except Exception as e:
        print(f"[bootstrap] AVISO: nao foi possivel criar o admin: {e}")

    print("[bootstrap] pronto.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
