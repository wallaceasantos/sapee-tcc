"""
Script para criar usuário ADMIN
SAPEE DEWAS Backend
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base
import auth
import os
from dotenv import load_dotenv

# Carregar .env
load_dotenv()

# Criar engine e base
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
Base = declarative_base()

# Importar models DEPOIS de criar o engine
import models

def create_admin_user():
    """Cria usuário ADMIN padrão"""
    
    # Criar tabelas se não existirem
    print("📝 Criando tabelas no banco...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas!")
    
    db = Session(bind=engine)
    
    try:
        # Verificar se ADMIN já existe
        admin = db.query(models.Usuario).filter(
            models.Usuario.email == "admin@dewas.com.br"
        ).first()
        
        if admin:
            print("⚠️  Usuário ADMIN já existe!")
            return
        
        # Criar role ADMIN se não existir
        role_admin = db.query(models.Role).filter(
            models.Role.nome == "ADMIN"
        ).first()
        
        if not role_admin:
            print("📝 Criando role ADMIN...")
            role_admin = models.Role(
                nome="ADMIN",
                descricao="Administrador do sistema - acesso total",
                permissoes='{"dashboard": "all", "alunos": ["create", "read", "update", "delete"], "importar": true, "relatorios": "all", "logs": true, "usuarios": true, "configuracoes": true}'
            )
            db.add(role_admin)
            db.commit()
            db.refresh(role_admin)
            print(f"✅ Role ADMIN criada (ID: {role_admin.id})")
        
        # Criar usuário ADMIN
        print("\n🔧 Criando usuário ADMIN...")
        admin_user = models.Usuario(
            nome="Administrador DEWAS",
            email="admin@dewas.com.br",
            senha=auth.gerar_hash_senha("admin123"),
            role_id=role_admin.id,
            curso_id=None,
            ativo=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n" + "=" * 60)
        print("✅ ADMIN CRIADO COM SUCESSO!")
        print("=" * 60)
        print(f"\n📧 Email: admin@dewas.com.br")
        print(f"🔑 Senha: admin123")
        print(f"👤 Role: ADMIN")
        print(f"🆔 ID: {admin_user.id}")
        print("\n" + "=" * 60)
        print("\n🚀 Agora você pode fazer login no Swagger UI!")
        print("   URL: http://localhost:8000/docs")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
