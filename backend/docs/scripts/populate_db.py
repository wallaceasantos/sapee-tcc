"""
Script para popular banco com 50 alunos de exemplo
SAPEE DEWAS Backend
"""

from sqlalchemy import create_engine
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
import auth

def populate_database():
    """Popula banco com dados de exemplo"""
    
    db = Session(bind=engine)
    
    try:
        # Verificar se já tem dados
        alunos_count = db.query(models.Aluno).count()
        
        if alunos_count > 0:
            print(f"⚠️  Banco já possui {alunos_count} alunos!")
            resposta = input("\nDeseja LIMPAR e repopular com 50 alunos? (s/n): ")
            
            if resposta.lower() != 's':
                print("❌ Operação cancelada!")
                return
            
            print("\n🗑️ Limpando banco de dados...")
            db.query(models.AuditLog).delete()
            db.query(models.Intervencao).delete()
            db.query(models.Predicao).delete()
            db.query(models.Aluno).delete()
            db.query(models.Usuario).delete()
            db.query(models.Role).delete()
            db.query(models.Curso).delete()
            db.commit()
            print("   ✅ Banco limpo!\n")
        
        print("📝 Populando banco com dados de exemplo...")
        
        # Criar cursos
        cursos_data = [
            ("Informática", "INTEGRADO"),
            ("Edificações", "INTEGRADO"),
            ("Mecânica", "INTEGRADO"),
            ("Química", "INTEGRADO"),
            ("Eletrotécnica", "INTEGRADO"),
        ]
        
        for nome_curso, modalidade in cursos_data:
            existing = db.query(models.Curso).filter(
                models.Curso.nome == nome_curso
            ).first()
            if not existing:
                curso = models.Curso(nome=nome_curso, modalidade=modalidade)
                db.add(curso)
                print(f"   ✅ Curso adicionado: {nome_curso}")
        
        # Fazer flush para persistir cursos antes de criar alunos
        db.flush()
        print(f"\n📚 Cursos persistidos no banco!")
        
        # Buscar IDs reais dos cursos
        cursos_db = db.query(models.Curso).all()
        curso_ids = [c.id for c in cursos_db]
        print(f"📚 IDs dos cursos disponíveis: {curso_ids}")
        
        if not curso_ids:
            print("❌ ERRO: Nenhum curso encontrado!")
            return
        
        print(f"\n📚 Cursos disponíveis: {len(cursos_db)}")
        
        # Criar roles se não existirem
        roles_data = [
            ("ADMIN", "Administrador do sistema - acesso total", '{"dashboard": "all", "alunos": ["create", "read", "update", "delete"], "importar": true, "relatorios": "all", "logs": true, "usuarios": true, "configuracoes": true}'),
            ("COORDENADOR", "Coordenador de curso - acesso restrito ao curso", '{"dashboard": "curso", "alunos": ["read", "update"], "importar": true, "relatorios": "curso", "logs": false, "usuarios": false, "configuracoes": false}'),
            ("PEDAGOGO", "Pedagogo/Psicólogo - foco em intervenções", '{"dashboard": "curso", "alunos": ["read"], "importar": false, "relatorios": "curso", "logs": false, "usuarios": false, "configuracoes": false, "intervencoes": ["create", "read", "update"]}'),
            ("DIRETOR", "Diretor Geral - visão completa (consultivo)", '{"dashboard": "all", "alunos": ["read"], "importar": false, "relatorios": "all", "logs": true, "usuarios": false, "configuracoes": false}'),
        ]
        
        for nome_role, descricao, permissoes in roles_data:
            existing = db.query(models.Role).filter(models.Role.nome == nome_role).first()
            if not existing:
                role = models.Role(nome=nome_role, descricao=descricao, permissoes=permissoes)
                db.add(role)
                print(f"   ✅ Role adicionada: {nome_role}")
        
        db.flush()
        
        # Criar usuário ADMIN padrão
        admin_existing = db.query(models.Usuario).filter(
            models.Usuario.email == "admin@dewas.com.br"
        ).first()
        
        if not admin_existing:
            admin_role = db.query(models.Role).filter(models.Role.nome == "ADMIN").first()
            if admin_role:
                admin_user = models.Usuario(
                    nome="Administrador DEWAS",
                    email="admin@dewas.com.br",
                    senha=auth.gerar_hash_senha("admin123"),
                    role_id=admin_role.id,
                    curso_id=None,
                    ativo=True
                )
                db.add(admin_user)
                print(f"   ✅ Usuário ADMIN criado: admin@dewas.com.br / admin123")
        
        db.commit()
        
        # Criar 50 alunos com dados variados
        import random
        
        nomes_masculinos = ["João", "Pedro", "Lucas", "Matheus", "Gabriel", "Rafael", "Felipe", "Bruno", "Gustavo", "Henrique", "Rodrigo", "Thiago", "Carlos", "Daniel", "André", "Ricardo", "Fernando", "Paulo", "Marcos", "Alexandre"]
        nomes_femininos = ["Ana", "Maria", "Julia", "Mariana", "Beatriz", "Larissa", "Camila", "Fernanda", "Gabriela", "Patricia", "Amanda", "Bruna", "Carolina", "Daniela", "Vanessa", "Tatiane", "Priscila", "Renata", "Simone", "Cristina"]
        sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"]
        bairros = ["Centro", "Adrianópolis", "Nossa Senhora das Graças", "São Geraldo", "Educandos", "Compensa", "São José Operário", "Coroado", "Petrópolis", "Flores", "Chapada", "Aleixo", "Colônia Terra Nova", "Jorge Teixeira", "Tancredo Neves", "Santa Etelvina", "Novo Aleixo", "Cidade de Deus"]
        
        alunos_criados = []
        
        for i in range(50):
            # Gerar nome
            if random.random() > 0.5:
                nome = f"{random.choice(nomes_masculinos)} {random.choice(sobrenomes)} {random.choice(sobrenomes)}"
                sexo = "M"
            else:
                nome = f"{random.choice(nomes_femininos)} {random.choice(sobrenomes)} {random.choice(sobrenomes)}"
                sexo = "F"
            
            matricula = f"2024{101001 + i:06d}"
            
            # Usar IDs reais dos cursos
            curso_id = random.choice(curso_ids)
            periodo = random.randint(1, 8)
            turno = models.Turno.MATUTINO
            
            # Distribuição de risco: 20% alto, 30% médio, 50% baixo
            risco_tipo = random.random()
            
            if risco_tipo < 0.20:  # Risco Alto
                media_geral = round(random.uniform(3.0, 5.5), 1)
                frequencia = round(random.uniform(50, 70), 1)
                trabalha = random.random() > 0.3
                carga_horaria = random.randint(30, 50) if trabalha else 0
                renda_familiar = round(random.uniform(600, 1200), 2)
                tempo_deslocamento = random.randint(60, 150)
                dificuldade_acesso = models.DificuldadeAcesso.DIFICIL
                historico_reprovas = random.randint(2, 5)
            elif risco_tipo < 0.50:  # Risco Médio
                media_geral = round(random.uniform(5.5, 7.0), 1)
                frequencia = round(random.uniform(70, 85), 1)
                trabalha = random.random() > 0.5
                carga_horaria = random.randint(20, 40) if trabalha else 0
                renda_familiar = round(random.uniform(1200, 2000), 2)
                tempo_deslocamento = random.randint(40, 90)
                dificuldade_acesso = models.DificuldadeAcesso.MEDIA
                historico_reprovas = random.randint(1, 2)
            else:  # Risco Baixo
                media_geral = round(random.uniform(7.0, 10.0), 1)
                frequencia = round(random.uniform(85, 100), 1)
                trabalha = random.random() > 0.7
                carga_horaria = random.randint(10, 30) if trabalha else 0
                renda_familiar = round(random.uniform(2000, 5000), 2)
                tempo_deslocamento = random.randint(20, 60)
                dificuldade_acesso = models.DificuldadeAcesso.FACIL
                historico_reprovas = random.randint(0, 1)
            
            coeficiente_rendimento = round(media_geral * random.uniform(0.95, 1.05), 2)
            ano_ingresso = random.choice([2022, 2023, 2024])
            cidade = random.choice(bairros)
            transporte_utilizado = random.choice(["ONIBUS", "ONIBUS", "CARRO", "A_PE"])
            possui_auxilio = random.random() > 0.6
            possui_computador = random.random() > 0.3
            possui_internet = random.random() > 0.2
            
            aluno = models.Aluno(
                matricula=matricula,
                nome=nome,
                sexo=sexo,
                curso_id=curso_id,
                periodo=periodo,
                turno=turno,
                media_geral=media_geral,
                frequencia=frequencia,
                historico_reprovas=historico_reprovas,
                coeficiente_rendimento=coeficiente_rendimento,
                ano_ingresso=ano_ingresso,
                cidade=cidade,
                renda_familiar=renda_familiar,
                trabalha=trabalha,
                carga_horaria_trabalho=carga_horaria,
                possui_auxilio=possui_auxilio,
                possui_computador=possui_computador,
                possui_internet=possui_internet,
                tempo_deslocamento=tempo_deslocamento,
                dificuldade_acesso=dificuldade_acesso,
                transporte_utilizado=transporte_utilizado,
            )
            
            db.add(aluno)
            alunos_criados.append(aluno)
        
        db.commit()
        
        total_alunos = db.query(models.Aluno).count()
        
        print(f"\n   ✅ {len(alunos_criados)} alunos adicionados!")
        
        print("\n" + "=" * 60)
        print("✅ BANCO POPULADO COM SUCESSO!")
        print("=" * 60)
        print(f"\n📊 Total de alunos: {total_alunos}")
        print(f"📚 Total de cursos: {db.query(models.Curso).count()}")
        print("\n🚀 Agora execute:")
        print("   python generate_predictions.py")
        print("\nDepois recarregue o dashboard:")
        print("   URL: http://localhost:3000")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_database()
