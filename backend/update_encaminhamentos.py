"""
Script para marcar atendimentos existentes como necessitando encaminhamento.
"""
import pymysql

config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'S@nx5497',
    'database': 'sapee_dewas',
    'cursorclass': pymysql.cursors.DictCursor
}

try:
    connection = pymysql.connect(**config)
    with connection.cursor() as cursor:
        print("🔄 Atualizando atendimentos para testar encaminhamentos...")
        
        # Vamos marcar alguns atendimentos específicos
        updates = [
            ("2024101001", "PSICOLOGICO", "CAPS (Centro de Atenção Psicossocial)"),
            ("2024101023", "SAUDE", "UBS Central - Oftalmologia"),
            ("2024101038", "ENCAMINHAMENTO_EXTERNO", "Conselho Tutelar")
        ]
        
        for matricula, tipo, destino in updates:
            cursor.execute("""
                UPDATE atendimentos 
                SET necessita_encaminhamento = 1, 
                    tipo_encaminhamento = %s,
                    status_encaminhamento = 'SOLICITADO'
                WHERE aluno_matricula = %s AND tipo_atendimento = %s
            """, (destino, matricula, tipo))
            print(f"   ✅ {matricula} -> {destino}")
            
        connection.commit()
        print("✅ Dados atualizados com sucesso!")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
