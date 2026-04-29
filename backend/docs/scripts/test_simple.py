"""
Teste de Conexão Simplificado - SAPEE DEWAS
"""

import mysql.connector

print("=" * 60)
print("🔍 TESTE DE CONEXÃO SIMPLIFICADO")
print("=" * 60)

# Configurações MANUAIS - Edite aqui se necessário
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'S@nx5497',  # Sua senha
}

print("\n📋 Configuração:")
print(f"   Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
print(f"   User: {DB_CONFIG['user']}")
print(f"   Senha: {'*' * len(DB_CONFIG['password'])}")

# 1. Testar conexão ao servidor
print("\n🔹 Testando conexão ao servidor MySQL...")
try:
    conn = mysql.connector.connect(**DB_CONFIG)
    print("✅ Servidor MySQL está rodando e acessível!")
    
    # Listar bancos
    cursor = conn.cursor()
    cursor.execute("SHOW DATABASES")
    databases = cursor.fetchall()
    
    print(f"\n📊 Bancos de dados encontrados ({len(databases)}):")
    for db in databases:
        print(f"   - {db[0]}")
    
    # Verificar sapee_dewas
    db_names = [db[0] for db in databases]
    if 'sapee_dewas' in db_names:
        print("\n✅ Banco 'sapee_dewas' existe!")
        
        # Conectar ao banco
        print("\n🔹 Conectando ao banco 'sapee_dewas'...")
        DB_CONFIG['database'] = 'sapee_dewas'
        conn_db = mysql.connector.connect(**DB_CONFIG)
        
        cursor = conn_db.cursor()
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        print(f"   ✅ Conexão bem-sucedida!")
        print(f"\n📊 Tabelas em sapee_dewas ({len(tables)}):")
        for table in tables:
            print(f"   - {table[0]}")
        
        conn_db.close()
        
    else:
        print("\n❌ Banco 'sapee_dewas' NÃO existe!")
        print("\n✅ CRIE O BANCO:")
        print("\n  Via Workbench:")
        print("    CREATE DATABASE sapee_dewas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print("\n  Via terminal:")
        print('    mysql -uroot -pS@nx5497 -e "CREATE DATABASE sapee_dewas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"')
    
    conn.close()
    
except mysql.connector.Error as err:
    print(f"\n❌ ERRO {err.errno}: {err}")
    
    if err.errno == 1045:
        print("\n🔑 Senha incorreta!")
        print("   Verifique se a senha 'S@nx5497' está correta")
    elif err.errno == 2003:
        print("\n🌐 MySQL não está rodando!")
        print("   Win+R → services.msc → MySQL80 → Start")
    else:
        print(f"\n💥 Erro: {err}")
        
except Exception as e:
    print(f"\n❌ ERRO: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
