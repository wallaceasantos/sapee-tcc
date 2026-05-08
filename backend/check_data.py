import pymysql

config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'S@nx5497',
    'database': 'sapee_dewas',
    'cursorclass': pymysql.cursors.DictCursor
}

connection = pymysql.connect(**config)
with connection.cursor() as cursor:
    # Check predicao_historico
    cursor.execute("SELECT COUNT(*) as total FROM predicao_historico")
    total = cursor.fetchone()
    print(f"Total predicao_historico: {total['total']}")
    
    # Check by tipo_erro
    cursor.execute("SELECT tipo_erro, COUNT(*) as qtd FROM predicao_historico GROUP BY tipo_erro")
    for row in cursor.fetchall():
        print(f"  {row['tipo_erro']}: {row['qtd']}")
    
    # Check egressos
    cursor.execute("SELECT COUNT(*) as total FROM egressos")
    total = cursor.fetchone()
    print(f"Total egressos: {total['total']}")

connection.close()
