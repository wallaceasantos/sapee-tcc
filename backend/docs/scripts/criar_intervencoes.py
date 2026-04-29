"""
Script para criar/verificar tabela de intervencoes
SAPEE DEWAS - Sistema de Intervencoes Pedagogicas
"""

import pymysql
from dotenv import load_dotenv
import os

# Carregar variáveis de ambiente
load_dotenv()

# Parse da DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:senha@localhost:3306/sapee_dewas")
# Extrair componentes da URL
# Formato: mysql+pymysql://user:password@host:port/database
parts = DATABASE_URL.replace("mysql+pymysql://", "").split("@")
user_pass = parts[0].split(":")
user = user_pass[0]
password = user_pass[1]
host_db = parts[1].split("/")
host_port = host_db[0].split(":")
host = host_port[0]
port = int(host_port[1]) if len(host_port) > 1 else 3306
database = host_db[1]

print("=" * 60)
print("SAPEE DEWAS - Criacao de Tabela de Intervencoes")
print("=" * 60)
print(f"Host: {host}:{port}")
print(f"Database: {database}")
print(f"User: {user}")
print("=" * 60)

try:
    # Conectar ao MySQL
    connection = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4'
    )
    
    cursor = connection.cursor()
    
    print("\n✅ Conexao estabelecida com sucesso!")
    
    # Verificar se a tabela existe
    cursor.execute("SHOW TABLES LIKE 'intervencoes'")
    tabela_existe = cursor.fetchone()
    
    if tabela_existe:
        print("\n⚠️  Tabela 'intervencoes' ja existe!")
        
        # Verificar estrutura
        cursor.execute("DESCRIBE intervencoes")
        colunas = cursor.fetchall()
        
        print("\nEstrutura atual:")
        for coluna in colunas:
            print(f"  - {coluna[0]}: {coluna[1]}")
    else:
        print("\n📋 Criando tabela 'intervencoes'...")
        
        # SQL para criar tabela
        sql = """
        CREATE TABLE IF NOT EXISTS intervencoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            aluno_id VARCHAR(20) NOT NULL,
            usuario_id INT NOT NULL,
            data_intervencao DATE NOT NULL,
            tipo VARCHAR(100) NOT NULL,
            descricao TEXT,
            status ENUM('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') DEFAULT 'PENDENTE',
            prioridade ENUM('BAIXA', 'MEDIA', 'ALTA', 'URGENTE') DEFAULT 'MEDIA',
            data_conclusao DATE,
            observacoes TEXT,
            criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (aluno_id) REFERENCES alunos(matricula) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
            INDEX idx_aluno (aluno_id),
            INDEX idx_usuario (usuario_id),
            INDEX idx_status (status),
            INDEX idx_data (data_intervencao)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
        
        cursor.execute(sql)
        connection.commit()
        
        print("✅ Tabela 'intervencoes' criada com sucesso!")
        
        # Verificar estrutura
        cursor.execute("DESCRIBE intervencoes")
        colunas = cursor.fetchall()
        
        print("\nEstrutura criada:")
        for coluna in colunas:
            print(f"  - {coluna[0]}: {coluna[1]}")
    
    # Contar registros existentes
    cursor.execute("SELECT COUNT(*) FROM intervencoes")
    count = cursor.fetchone()[0]
    print(f"\n📊 Registros existentes: {count}")
    
    print("\n" + "=" * 60)
    print("✅ Processo concluido com sucesso!")
    print("=" * 60)
    
    cursor.close()
    connection.close()
    
except pymysql.Error as e:
    print(f"\n❌ Erro ao conectar ao MySQL: {e}")
    exit(1)
except Exception as e:
    print(f"\n❌ Erro inesperado: {e}")
    exit(1)
