"""
Script para resetar senha do ADMIN
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

# Importar models
import models

def reset_admin_password():
    """Reseta senha do ADMIN"""
    
    db = Session(bind=engine)
    
    try:
        # Buscar usuário ADMIN
        admin = db.query(models.Usuario).filter(
            models.Usuario.email == "admin@dewas.com.br"
        ).first()
        
        if not admin:
            print("❌ Usuário ADMIN não encontrado!")
            return
        
        # Gerar novo hash da senha
        nova_senha = "admin123"
        novo_hash = auth.gerar_hash_senha(nova_senha)
        
        print(f"🔑 Resetando senha do ADMIN...")
        print(f"   Email: {admin.email}")
        print(f"   Nova senha: {nova_senha}")
        print(f"   Hash: {novo_hash[:50]}...")
        
        # Atualizar senha
        admin.senha = novo_hash
        db.commit()
        
        print("\n" + "=" * 60)
        print("✅ SENHA RESETADA COM SUCESSO!")
        print("=" * 60)
        print(f"\n📧 Email: admin@dewas.com.br")
        print(f"🔑 Senha: {nova_senha}")
        print("\n" + "=" * 60)
        print("\n🚀 Agora você pode fazer login!")
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
    reset_admin_password()
