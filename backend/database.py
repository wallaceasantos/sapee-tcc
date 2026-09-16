import logging
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do Banco de Dados
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL não configurada no arquivo .env")

# Criar engine de conexão (PyMySQL)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,  
    pool_pre_ping=True,  
    pool_recycle=3600,  
)

# Criar session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para models
Base = declarative_base()


# Dependência para obter sessão do banco
def get_db():
    """
    Dependência do FastAPI para obter sessão do banco.
    Uso: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Função para testar conexão
def test_connection():
    """Testa a conexão com o banco de dados"""
    try:
        connection = engine.connect()
        logger.info("Conexão com banco de dados bem-sucedida!")
        connection.close()
        return True
    except Exception as e:
        logger.error("Erro ao conectar ao banco de dados: %s", e)
        return False
