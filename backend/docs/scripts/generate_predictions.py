"""
Script para gerar predições de risco para todos os alunos
SAPEE DEWAS Backend
"""

from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session, declarative_base
import os
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(__file__))

# Carregar .env
load_dotenv()

# Criar engine e base
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
Base = declarative_base()

# Importar models
import models
from ml_logic import calcular_risco_evasao

def gerar_predicoes():
    """Gera predições de risco para alunos SEM predição"""
    
    db = Session(bind=engine)
    
    try:
        # ============================================
        # OPÇÃO 1: Gerar apenas para alunos SEM predição
        # ============================================
        alunos_com_predicao = db.query(
            models.Predicao.aluno_id
        ).distinct().subquery()
        
        alunos_sem_predicao = db.query(models.Aluno).filter(
            ~models.Aluno.matricula.in_(alunos_com_predicao)
        ).all()
        
        # Se não houver alunos sem predição, pergunta se quer regenerar todas
        if not alunos_sem_predicao:
            print("✅ Todos os alunos já possuem predições!")
            resposta = input("\nDeseja REGERAR todas as predições? (s/n): ")
            
            if resposta.lower() != 's':
                print("❌ Operação cancelada!")
                return
            
            # Deletar todas as predições existentes
            print("\n🗑️ Deletando predições antigas...")
            db.query(models.Predicao).delete()
            db.commit()
            
            # Buscar todos os alunos
            alunos = db.query(models.Aluno).all()
            print(f"   ✅ {len(alunos)} alunos serão processados\n")
        else:
            alunos = alunos_sem_predicao
            print(f"📊 {len(alunos)} alunos sem predição encontrados.\n")
        
        print(f"🔍 Gerando predições para {len(alunos)} alunos...\n")
        
        for aluno in alunos:
            print(f"🔍 Analisando: {aluno.nome} ({aluno.matricula})")
            
            # Calcular risco
            try:
                resultado = calcular_risco_evasao(aluno)
                
                print(f"   Risco: {resultado['risco_evasao']}% - {resultado['nivel_risco']}")
                print(f"   Fatores: {resultado['fatores_principais'][:50]}...")
                
                # Criar predição
                predicao = models.Predicao(
                    aluno_id=aluno.matricula,
                    risco_evasao=resultado['risco_evasao'],
                    nivel_risco=resultado['nivel_risco'],
                    fatores_principais=resultado['fatores_principais'],
                    modelo_ml_versao='1.0.0'
                )
                
                db.add(predicao)
                print(f"   ✅ Predição criada!\n")
                
            except Exception as e:
                print(f"   ❌ Erro ao calcular risco: {e}\n")
        
        db.commit()
        
        # ============================================
        # VERIFICAÇÃO AUTOMÁTICA DOS DADOS
        # ============================================
        print("\n" + "=" * 60)
        print("🔍 VERIFICANDO DADOS NO BANCO...")
        print("=" * 60)
        
        # Contar alunos
        total_alunos = db.query(models.Aluno).count()
        
        # Contar predições
        total_predicoes = db.query(models.Predicao).count()
        
        # Contar por nível de risco (últimas predições)
        subq = db.query(
            models.Predicao.aluno_id,
            func.max(models.Predicao.data_predicao).label('max_data')
        ).group_by(models.Predicao.aluno_id).subquery()
        
        ultimas_predicoes = db.query(models.Predicao).join(
            subq,
            models.Predicao.aluno_id == subq.c.aluno_id
        ).filter(
            models.Predicao.data_predicao == subq.c.max_data
        )
        
        risco_alto = ultimas_predicoes.filter(
            models.Predicao.nivel_risco == 'ALTO'
        ).count()
        
        risco_medio = ultimas_predicoes.filter(
            models.Predicao.nivel_risco == 'MEDIO'
        ).count()
        
        risco_baixo = ultimas_predicoes.filter(
            models.Predicao.nivel_risco == 'BAIXO'
        ).count()
        
        # Calcular média geral
        media_result = db.query(func.avg(models.Aluno.media_geral)).scalar()
        media_geral = float(media_result) if media_result else 0.0
        
        # Alunos sem predição
        alunos_com_predicao = db.query(
            models.Predicao.aluno_id
        ).distinct().count()
        alunos_sem_predicao = total_alunos - alunos_com_predicao
        
        print("\n📊 ALUNOS:")
        print(f"   Total: {total_alunos}")
        print(f"   Com predição: {alunos_com_predicao}")
        print(f"   Sem predição: {alunos_sem_predicao}")
        
        print("\n📊 PREDIÇÕES:")
        print(f"   Total: {total_predicoes}")
        print(f"   🔴 Alto: {risco_alto}")
        print(f"   🟡 Médio: {risco_medio}")
        print(f"   🟢 Baixo: {risco_baixo}")
        
        print("\n📈 MÉDIA GERAL:")
        print(f"   Média: {media_geral:.2f}")
        
        # Validação
        print("\n" + "=" * 60)
        print("✅ VALIDAÇÃO:")
        print("=" * 60)
        
        if alunos_sem_predicao > 0:
            print(f"⚠️  ATENÇÃO: {alunos_sem_predicao} alunos ainda sem predição!")
            print(f"   Execute o script novamente ou use a API.")
        else:
            print(f"✅ OK: Todos os alunos possuem predições")
        
        if risco_alto + risco_medio + risco_baixo != alunos_com_predicao:
            print(f"⚠️  ATENÇÃO: Soma dos riscos ({risco_alto + risco_medio + risco_baixo}) ≠ Com predição ({alunos_com_predicao})!")
        else:
            print(f"✅ OK: Soma dos riscos confere")
        
        print("\n🚀 AGORA RECARREGUE O DASHBOARD!")
        print("   URL: http://localhost:3000")
        print("   API: http://localhost:8000/dashboard/stats")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    gerar_predicoes()
