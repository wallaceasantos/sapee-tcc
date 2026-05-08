import pymysql
import re

config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'S@nx5497',
    'database': 'sapee_dewas',
    'cursorclass': pymysql.cursors.DictCursor
}

file_path = r'c:\Users\wallace\Documents\Projetos Web Iniciados\sapee---sistema-de-alerta-de-predição-de-evasão-escolar\backend\migrations\seed_validacao_modelo.sql'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove comments to avoid syntax issues during batch execution
content = re.sub(r'--.*$', '', content, flags=re.MULTILINE)

# Split statements
statements = [s.strip() for s in content.split(';') if s.strip()]

try:
    connection = pymysql.connect(**config)
    with connection.cursor() as cursor:
        for stmt in statements:
            if stmt:
                cursor.execute(stmt)
        connection.commit()
        print(f"✅ Seed executado com sucesso! ({len(statements)} comandos)")
except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
