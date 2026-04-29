"""
Script de Teste de Conexão - SAPEE DEWAS
Executar: python test_connection.py
"""

import sys
import os
import re
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

print("=" * 60)
print("🔍 TESTE DE CONEXÃO - SAPEE DEWAS")
print("=" * 60)

# 1. Verificar DATABASE_URL
print("\n1️⃣ Verificando DATABASE_URL...")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERRO: DATABASE_URL não configurada no .env")
    sys.exit(1)

# Mascarar senha para exibição
try:
    masked_url = re.sub(r':([^:@]+)@', ':***@', DATABASE_URL)
except:
    masked_url = "***"
print(f"✅ DATABASE_URL configurada: {masked_url}")

# 2. Testar import do mysql-connector
print("\n2️⃣ Testando mysql-connector-python...")
try:
    import mysql.connector
    print(f"✅ mysql-connector-python instalado (versão: {mysql.connector.__version__})")
except ImportError as e:
    print(f"❌ ERRO: mysql-connector-python não instalado")
    print("\nSolução: pip install mysql-connector-python")
    sys.exit(1)

# 3. Testar conexão
print("\n3️⃣ Testando conexão com MySQL...")
try:
    # Extrair dados da URL
    url_clean = DATABASE_URL.replace("mysql+mysqlconnector://", "")
    pattern = r'^([^:]+):(.+)@([^:]+):(\d+)/(.+)$'
    match = re.match(pattern, url_clean)
    
    if not match:
        print(f"❌ ERRO: Formato da URL inválido")
        sys.exit(1)
    
    user = match.group(1)
    password = match.group(2)
    host = match.group(3)
    port = int(match.group(4))
    database = match.group(5)
    
    print(f"   Host: {host}:{port}")
    print(f"   User: {user}")
    print(f"   Database: {database}")
    
    # Conectar ao servidor primeiro
    print("\n   🔹 Conectando ao servidor MySQL...")
    conn_server = mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password
    )
    print("   ✅ Servidor MySQL acessível!")
    
    # Verificar se banco existe
    cursor = conn_server.cursor()
    cursor.execute("SHOW DATABASES LIKE 'sapee_dewas'")
    db_exists = cursor.fetchone()
    
    if not db_exists:
        print(f"\n❌ ERRO: Banco de dados 'sapee_dewas' NÃO existe!")
        print("\n✅ SOLUÇÃO - Criar banco:")
        print("\n  Opção 1: MySQL Workbench")
        print("    CREATE DATABASE sapee_dewas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print("\n  Opção 2: Terminal")
        print(f'    mysql -u{user} -p -e "CREATE DATABASE sapee_dewas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"')
        print("\n  Opção 3: Executar script do DATABASE.md")
        conn_server.close()
        sys.exit(1)
    
    print(f"   ✅ Banco de dados 'sapee_dewas' existe!")
    conn_server.close()
    
    # Conectar ao banco
    print("\n   🔹 Conectando ao banco 'sapee_dewas'...")
    conn = mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database
    )
    
    if conn.is_connected():
        print("   ✅ Conexão ao banco bem-sucedida!")
        
        # Listar tabelas
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        print(f"\n📊 Tabelas encontradas ({len(tables)}):")
        for table in tables:
            print(f"   - {table[0]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✅ TUDO OK! Banco de dados está pronto!")
        print("=" * 60)
        print("\n🚀 Próximo passo: Implementar schemas.py e main.py")
        print("\nComandos:")
        print("  python -m uvicorn main:app --reload --port 8000")
        
except mysql.connector.Error as err:
    print(f"\n❌ ERRO MySQL {err.errno}: {err}")
    
    if err.errno == 1045:
        print("\n🔑 PROBLEMA: Senha incorreta ou usuário não existe")
        print("\nSolução:")
        print("  1. Verifique a senha no arquivo backend/.env")
        print("  2. Teste no MySQL Workbench")
        print("  3. Reset a senha se necessário")
    
    elif err.errno == 2003 or err.errno == 2002:
        print("\n🌐 PROBLEMA: MySQL não está rodando")
        print("\nSolução:")
        print("  1. Win+R → services.msc")
        print("  2. Procure 'MySQL80'")
        print("  3. Botão direito → Start")
    
    elif err.errno == 1049:
        print("\n📁 PROBLEMA: Banco não existe")
        print("\nSolução: Criar banco (veja acima)")
    
    else:
        print("\n💥 Consulte o erro acima e verifique:")
        print("  - MySQL está rodando?")
        print("  - Usuário/senha corretos?")
        print("  - Banco foi criado?")

except Exception as e:
    print(f"\n❌ ERRO: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
