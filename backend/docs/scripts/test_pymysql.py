"""
Teste com PyMySQL - Alternativa ao mysql-connector
"""

print("=" * 60)
print("🔍 TESTANDO COM PyMySQL")
print("=" * 60)

# 1. Tentar instalar/importar PyMySQL
print("\n📦 Verificando PyMySQL...")
try:
    import pymysql
    print("✅ PyMySQL disponível")
except ImportError:
    print("❌ PyMySQL não instalado")
    print("\nInstalando...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'pymysql'])
    import pymysql
    print("✅ PyMySQL instalado!")

# 2. Testar conexão
print("\n🔹 Testando conexão...")
try:
    # Conectar ao servidor
    conn = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='S@nx5497',
        charset='utf8mb4'
    )
    
    print("✅ Conexão bem-sucedida!")
    
    # Listar bancos
    cursor = conn.cursor()
    cursor.execute("SHOW DATABASES")
    databases = cursor.fetchall()
    
    print(f"\n📊 Bancos encontrados ({len(databases)}):")
    for db in databases:
        print(f"   - {db[0]}")
    
    # Verificar sapee_dewas
    db_names = [db[0].lower() for db in databases]
    if 'sapee_dewas' in db_names:
        print("\n✅ Banco 'sapee_dewas' existe!")
        
        # Conectar ao banco
        conn.select_db('sapee_dewas')
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        print(f"\n📊 Tabelas ({len(tables)}):")
        for table in tables:
            print(f"   - {table[0]}")
        
        print("\n" + "=" * 60)
        print("✅ TUDO OK!")
        print("=" * 60)
        
    else:
        print("\n❌ Banco 'sapee_dewas' NÃO existe!")
        print("\n✅ CRIE O BANCO:")
        print("  CREATE DATABASE sapee_dewas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    
    conn.close()
    
except pymysql.Error as e:
    print(f"\n❌ ERRO {e.args[0]}: {e.args[1]}")
    
    if e.args[0] == 1045:
        print("\n🔑 Senha incorreta!")
    elif e.args[0] == 2003:
        print("\n🌐 MySQL não está rodando!")
    else:
        print(f"\n💥 Erro: {e}")
        
except Exception as e:
    print(f"\n❌ ERRO: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
