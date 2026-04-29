"""
🔍 VERIFICAÇÃO DE DADOS PARA ML
SAPEE DEWAS

Verifica se há dados suficientes para treinar o modelo ML
antes de executar o treinamento.

EXECUÇÃO:
    python scripts\verificar_dados_ml.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import models
from tabulate import tabulate

def main():
    print("=" * 70)
    print("🔍 VERIFICAÇÃO DE DADOS PARA MACHINE LEARNING")
    print("=" * 70)
    
    try:
        db = next(database.get_db())
        
        # Contagens
        total_alunos = db.query(models.Aluno).count()
        total_egressos = db.query(models.Egresso).count()
        
        evasoes = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == 'ABANDONO'
        ).count()
        
        transferencias = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == 'TRANSFERENCIA'
        ).count()
        
        conclusoes = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == 'CONCLUSAO'
        ).count()
        
        outros = total_egressos - evasoes - transferencias - conclusoes
        
        permanecem = total_alunos - total_egressos
        
        # Tabela resumo
        dados = [
            ["Total de Alunos", total_alunos, "✅" if total_alunos >= 10 else "❌"],
            ["  - Permanecem", permanecem, "-"],
            ["  - Egressos", total_egressos, "-"],
            ["    - Abandono (Evasão)", evasoes, "✅" if evasoes >= 2 else "❌"],
            ["    - Transferência", transferencias, "-"],
            ["    - Conclusão", conclusoes, "-"],
            ["    - Outros", outros, "-"],
        ]
        
        print("\n📊 RESUMO DOS DADOS:")
        print(tabulate(dados, headers=["Categoria", "Quantidade", "Status"], tablefmt="grid"))
        
        # Verificação de requisitos
        print("\n" + "=" * 70)
        print("📋 VERIFICAÇÃO DE REQUISITOS")
        print("=" * 70)
        
        requisitos = [
            ("Mínimo 10 alunos", total_alunos >= 10),
            ("Mínimo 2 evasões", evasoes >= 2),
            ("Balanceamento (20-80%)", 0.2 <= (evasoes/max(total_alunos,1)) <= 0.8 if evasoes > 0 else False),
        ]
        
        todos_ok = True
        for requisito, ok in requisitos:
            status = "✅ OK" if ok else "❌ FALHA"
            print(f"   {requisito}: {status}")
            if not ok:
                todos_ok = False
        
        print("\n" + "=" * 70)
        if todos_ok:
            print("✅ STATUS: Pronto para treinamento!")
            print("\nExecute:")
            print("   python scripts\\treinar_modelo_real.py")
        else:
            print("❌ STATUS: Dados insuficientes para ML")
            print("\nRecomendações:")
            print("   1. Continue usando o sistema normalmente")
            print("   2. Registre evasões na tabela 'Egressos'")
            print("   3. Quando tiver 10+ alunos e 2+ evasões, execute o treinamento")
            print("\nPor enquanto, o Fallback (regras) funciona perfeitamente!")
        print("=" * 70)
        
        return todos_ok
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    import sys
    # Tentar importar tabulate, se não tiver, instalar
    try:
        from tabulate import tabulate
    except ImportError:
        print("Instalando tabulate...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "tabulate"])
        from tabulate import tabulate
    
    sucesso = main()
    sys.exit(0 if sucesso else 1)
