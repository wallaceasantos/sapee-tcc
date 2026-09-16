# --- Bootstrap de execucao (injetado): garante imports do backend e carrega o .env ---
import os as _os
import sys as _sys

_BACKEND_DIR = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _BACKEND_DIR not in _sys.path:
    _sys.path.insert(0, _BACKEND_DIR)
try:
    from dotenv import load_dotenv as _load_dotenv

    _load_dotenv(_os.path.join(_BACKEND_DIR, ".env"))
except Exception:
    pass
# --- fim do bootstrap ---

"""
🧹 LIMPEZA DO BANCO DE DADOS - SAPEE DEWAS
===========================================
Remove TODOS os dados existentes preservando a estrutura das tabelas.
Útil para recomeçar com dados limpos antes de rodar o seed demo.

🚀 EXECUÇÃO:
    cd backend
    .\venv\Scripts\Activate.ps1
    python limpar_banco.py

⚠️  ATENÇÃO: Este script remove TODOS os dados. Não tem desfazer!
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import database
import models
from sqlalchemy import text


def main():
    print("=" * 60)
    print("🧹 LIMPEZA DO BANCO DE DADOS - SAPEE DEWAS")
    print("=" * 60)

    confirmacao = input("\n⚠️  Isso vai REMOVER TODOS os dados. Confirma? (S/N): ")
    if confirmacao.upper() != "S":
        print("Operação cancelada.")
        return

    db = next(database.get_db())

    try:
        # Ordem de exclusão: dependentes primeiro → tabelas pai depois
        tabelas = [
            # Tabelas mais dependentes (FK para várias)
            ("predicao_historico", models.PredicaoHistorico),
            ("alertas_faltas_historico", models.AlertaFaltasHistorico),
            ("historico_encaminhamento", models.HistoricoEncaminhamento),
            ("comunicacoes", models.Comunicacao),
            ("atendimentos", models.Atendimento),
            ("registro_faltas_diarias", models.RegistroFaltasDiarias),
            ("alertas_faltas_consecutivas", models.AlertaFaltasConsecutivas),
            ("notas_disciplina", models.NotaDisciplina),
            ("frequencia_mensal", models.FrequenciaMensal),
            ("intervencoes", models.Intervencao),
            ("questionario_psicossocial", models.QuestionarioPsicossocial),
            ("tokens_questionario", models.TokenQuestionario),
            ("predicoes", models.Predicao),
            ("aluno_metas", models.AlunoMeta),
            ("planos_acao", models.PlanosAcao),
            ("metas_semestrais", models.MetasSemestrais),
            ("egressos", models.Egresso),
            # Tabelas dependentes de alunos e cursos
            ("disciplina_professor", models.DisciplinaProfessor),
            ("alunos", models.Aluno),
            ("disciplinas", models.Disciplina),
            # Tabelas dependentes de usuarios
            ("audit_logs", models.AuditLog),
            # Tabelas sem model (raw SQL)
            ("backup_alunos_cursos", None),
            ("templates_comunicacao", None),
            # Tabelas pai (PRESERVAR admin e role ADMIN)
            ("usuarios", models.Usuario),
            ("cursos", models.Curso),
            ("roles", models.Role),
            ("configuracoes_sistema", models.ConfiguracaoSistema),
        ]

        total_removidos = 0

        for item in tabelas:
            try:
                nome_tabela = item[0]
                model_class = item[1]

                if model_class is None:
                    tabelas_permitidas = {"backup_alunos_cursos", "templates_comunicacao"}
                    if nome_tabela not in tabelas_permitidas:
                        print(f"   ⚠️  {nome_tabela}: tabela sem model nao permitida para raw SQL. Ignorada.")
                        continue
                    result = db.execute(text(f"DELETE FROM {nome_tabela}"))
                    count = result.rowcount
                elif nome_tabela == "audit_logs":
                    # Preservar logs do admin
                    admin = db.query(models.Usuario).filter(
                        models.Usuario.email == "admin@dewas.com.br"
                    ).first()
                    if admin:
                        count = db.query(model_class).filter(
                            model_class.usuario_id != admin.id
                        ).delete()
                    else:
                        count = db.query(model_class).delete()
                elif nome_tabela == "usuarios":
                    # Preservar admin: admin@dewas.com.br
                    count = db.query(model_class).filter(
                        model_class.email != "admin@dewas.com.br"
                    ).delete()
                elif nome_tabela == "roles":
                    # Preservar role ADMIN para o usuário admin
                    count = db.query(model_class).filter(
                        model_class.nome != "ADMIN"
                    ).delete()
                else:
                    count = db.query(model_class).delete()

                if count > 0:
                    print(f"   🗑️  {nome_tabela}: {count} registros removidos")
                    total_removidos += count
                else:
                    print(f"   ✅ {nome_tabela}: já estava vazia")
            except Exception as e:
                print(f"   ⚠️  {nome_tabela}: {e}")

        db.commit()

        print("\n" + "=" * 60)
        print(f"✅ LIMPEZA CONCLUÍDA! {total_removidos} registros removidos.")
        print("=" * 60)
        print("\n💡 Agora execute o seed demo:")
        print("   python seed_demo_completo.py")

    except Exception as e:
        db.rollback()
        print(f"\n❌ ERRO: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
