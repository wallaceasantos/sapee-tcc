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

"""Seed completo: Disciplinas, Notas, Faltas, Intervencoes, Planos, Atendimentos, Comunicacoes."""
import os, sys, random, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from datetime import date, datetime, timedelta, time
import database, models
from sqlalchemy import text

random.seed(42)
db = next(database.get_db())

# Limpar dados antigos dos modulos (preserva alunos, cursos, predicoes, frequencia_mensal)
print("Limpando dados antigos dos modulos...")
for table in ["notas_disciplina", "registro_faltas_diarias", "intervencoes",
              "atendimentos", "comunicacoes", "planos_acao", "disciplinas"]:
    try:
        r = db.execute(text(f"DELETE FROM {table}"))
        db.commit()
        if r.rowcount > 0:
            print(f"  {table}: {r.rowcount}")
    except Exception as e:
        db.rollback()
        print(f"  {table}: ignorado - {e}")

alunos = db.query(models.Aluno).all()
cursos = db.query(models.Curso).all()
admin = db.query(models.Usuario).filter(models.Usuario.email == "admin@dewas.com.br").first()
admin_id = admin.id if admin else 2

print(f"Alunos: {len(alunos)} | Cursos: {len(cursos)} | Admin ID: {admin_id}")

# ============================================
# 1. DISCIPLINAS (~5 por curso = ~95)
# ============================================
DISCIPLINAS_POR_CURSO = {
    "Administracao": ["Teoria Geral da Administracao", "Contabilidade Geral", "Matematica Financeira", "Gestao de Pessoas", "Marketing"],
    "Ciencias Contabeis": ["Contabilidade Avancada", "Auditoria", "Direito Tributario", "Controladoria", "Pericia Contabil"],
    "Direito": ["Direito Civil", "Direito Penal", "Direito Constitucional", "Direito do Trabalho", "Processo Civil"],
    "Enfermagem": ["Anatomia Humana", "Farmacologia", "Saude Coletiva", "Enfermagem Clinica", "Urgencia e Emergencia"],
    "Fisioterapia": ["Anatomia Humana", "Cinesiologia", "Fisioterapia Ortopedica", "Neurologia", "Fisioterapia Respiratória"],
    "Farmacia": ["Quimica Farmaceutica", "Farmacognosia", "Farmacologia Clinica", "Toxicologia", "Biotecnologia"],
    "Educacao Fisica": ["Fisiologia do Exercicio", "Anatomia Humana", "Biomecanica", "Didatica", "Esportes Coletivos"],
    "Estetica e Cosmetica": ["Cosmetologia", "Dermatologia", "Visagismo", "Estetica Facial", "Empreendedorismo"],
    "Nutricao": ["Nutricao Basica", "Bioquimica", "Dietetica", "Nutricao Clinica", "Saude Publica"],
    "Medicina Veterinaria": ["Anatomia Animal", "Patologia Veterinaria", "Clinica Medica", "Cirurgia", "Zoonoses"],
    "Psicologia": ["Psicologia Geral", "Psicopatologia", "Psicologia Social", "Neuropsicologia", "Psicologia Clinica"],
    "Pedagogia": ["Didatica", "Psicologia da Educacao", "Fundamentos da Educacao", "Gestao Escolar", "Alfabetizacao"],
    "Analise e Desenvolvimento de Sistemas": ["Logica de Programacao", "Banco de Dados", "Engenharia de Software", "Redes de Computadores", "Seguranca da Informacao"],
    "Logistica": ["Gestao de Estoques", "Transporte e Distribuicao", "Supply Chain", "Logistica Reversa", "Gestao de Compras"],
    "Marketing": ["Marketing Digital", "Comportamento do Consumidor", "Pesquisa de Mercado", "Branding", "Midias Sociais"],
    "Gestao de Recursos Humanos": ["Recrutamento e Selecao", "Treinamento e Desenvolvimento", "Legislacao Trabalhista", "Cargos e Salarios", "Comportamento Organizacional"],
    "Gestao Financeira": ["Matematica Financeira", "Orcamento Empresarial", "Mercado de Capitais", "Analise de Investimentos", "Controladoria"],
    "Processos Gerenciais": ["Gestao de Processos", "Qualidade Total", "Empreendedorismo", "Planejamento Estrategico", "Indicadores de Desempenho"],
    "Servico Social": ["Politica Social", "Fundamentos do Servico Social", "Etica Profissional", "Servico Social e Saude", "Direitos Humanos"],
}

print("\n1. Criando disciplinas...")
disc_map = {}  # {curso_id: [disciplina_obj, ...]}
for curso in cursos:
    nomes = DISCIPLINAS_POR_CURSO.get(curso.nome, [f"Disciplina {i+1} do curso {curso.nome}" for i in range(5)])
    disc_map[curso.id] = []
    for nome in nomes:
        nome_unico = f"{nome} - {curso.nome}" if any(nome in disc_nomes for disc_nomes in DISCIPLINAS_POR_CURSO.values() if curso.nome not in str(disc_nomes)) else nome
        nome_unico = nome  # manter nome original, verificar duplicata antes
        exist = db.query(models.Disciplina).filter(
            models.Disciplina.nome == nome,
            models.Disciplina.curso_id == curso.id
        ).first()
        if not exist:
            exist = db.query(models.Disciplina).filter(models.Disciplina.nome == nome).first()
        if exist and exist.curso_id != curso.id:
            nome_unico = f"{nome} ({curso.nome})"
            exist = None
        if exist and exist.curso_id == curso.id:
            disc_map[curso.id].append(exist)
        else:
            d = models.Disciplina(nome=nome_unico, ativa=True, curso_id=curso.id)
            db.add(d)
            db.flush()
            disc_map[curso.id].append(d)
    db.commit()
total_disc = sum(len(v) for v in disc_map.values())
print(f"   Criadas/mapeadas: {total_disc} disciplinas")

# ============================================
# 2. NOTAS (~3 por aluno, amostra 60% = ~4800)
# ============================================
print("\n2. Criando notas...")
periodos = ["2024-1", "2024-2", "2025-1", "2025-2", "2026-1"]
notas_count = 0
amostra_alunos = random.sample(alunos, int(len(alunos) * 0.6))

for aluno in amostra_alunos:
    disc_curso = disc_map.get(aluno.curso_id, [])
    if not disc_curso:
        continue
    pred = db.query(models.Predicao).filter(models.Predicao.aluno_id == aluno.matricula).first()
    nivel = pred.nivel_risco.value if pred else "MEDIO"

    for _ in range(random.randint(2, 4)):
        disc = random.choice(disc_curso)
        periodo = random.choice(periodos)
        bimestre = random.randint(1, 4)
        
        if nivel in ("MUITO_ALTO", "ALTO"):
            nota = round(random.uniform(1.0, 5.5), 1)
            sit = random.choice(["REPROVADO", "CURSANDO"])
        elif nivel == "MEDIO":
            nota = round(random.uniform(4.5, 7.5), 1)
            sit = random.choice(["CURSANDO", "APROVADO"])
        else:
            nota = round(random.uniform(7.0, 10.0), 1)
            sit = "APROVADO"

        db.add(models.NotaDisciplina(
            aluno_matricula=aluno.matricula, disciplina=disc.nome,
            disciplina_id=disc.id, periodo_letivo=periodo,
            bimestre=bimestre, nota=nota,
            faltas_disciplina=random.randint(0, 8) if nivel in ("MUITO_ALTO", "ALTO") else random.randint(0, 2),
            situacao=sit,
        ))
        notas_count += 1
    if notas_count % 1000 == 0:
        db.commit()
        print(f"   {notas_count} notas...")
db.commit()
print(f"   Total: {notas_count} notas")

# ============================================
# 3. FALTAS DIARIAS (~60 dias, 20% alunos = ~32400)
# ============================================
print("\n3. Criando faltas diarias...")
faltas_count = 0
alunos_faltas = random.sample(alunos, int(len(alunos) * 0.2))
hoje = date.today()
dias_uteis = []
d = hoje - timedelta(days=60)
while d <= hoje:
    if d.weekday() < 5:
        dias_uteis.append(d)
    d += timedelta(days=1)

for aluno in alunos_faltas:
    disc_curso = disc_map.get(aluno.curso_id, [])
    if not disc_curso:
        continue
    pred = db.query(models.Predicao).filter(models.Predicao.aluno_id == aluno.matricula).first()
    nivel = pred.nivel_risco.value if pred else "MEDIO"
    
    if nivel in ("MUITO_ALTO", "ALTO"):
        taxa_falta = 0.50
    elif nivel == "MEDIO":
        taxa_falta = 0.25
    else:
        taxa_falta = 0.05

    for dia in dias_uteis:
        if random.random() < taxa_falta:
            disc = random.choice(disc_curso)
            db.add(models.RegistroFaltasDiarias(
                aluno_matricula=aluno.matricula, disciplina=disc.nome,
                disciplina_id=disc.id, data=dia, justificada=random.random() < 0.1,
            ))
            faltas_count += 1
    if faltas_count % 5000 == 0:
        db.commit()
        print(f"   {faltas_count} faltas...")
db.commit()
print(f"   Total: {faltas_count} faltas diarias")

# ============================================
# 4. INTERVENCOES (1-2 p/ ALTO e MUITO_ALTO)
# ============================================
print("\n4. Criando intervencoes...")
intv_count = 0
tipos_intv = ["ACONSELHAMENTO", "MONITORIA", "SUPORTE_PSICOLOGICO", "AUXILIO_FINANCEIRO", "PLANO_ESTUDOS",
              "REUNIAO_PAIS", "ENCAMINHAMENTO_SAUDE", "ACOMPANHAMENTO_PEDAGOGICO"]
status_intv = ["EM_ANDAMENTO", "CONCLUIDA", "PENDENTE", "CONCLUIDA"]

motivos = {
    "MUITO_ALTO": ["Frequencia abaixo de 45%", "Media geral abaixo de 4.0", "5+ reprovacoes historicas"],
    "ALTO": ["Frequencia entre 45-62%", "Queda no coeficiente de rendimento", "3+ reprovacoes"],
}

for aluno in alunos:
    pred = db.query(models.Predicao).filter(models.Predicao.aluno_id == aluno.matricula).first()
    if not pred:
        continue
    nivel = pred.nivel_risco.value
    if nivel not in ("MUITO_ALTO", "ALTO"):
        continue

    qtd = 2 if nivel == "MUITO_ALTO" else 1
    for i in range(qtd):
        dias_atras = random.randint(5, 180)
        dt_intv = date.today() - timedelta(days=dias_atras)
        st = random.choice(status_intv)
        dt_conc = dt_intv + timedelta(days=random.randint(15, 60)) if st == "CONCLUIDA" else None
        
        db.add(models.Intervencao(
            aluno_id=aluno.matricula, usuario_id=admin_id,
            data_intervencao=dt_intv, tipo=random.choice(tipos_intv),
            descricao=f"Intervencao {i+1} para aluno com risco {nivel}.",
            status=st, prioridade="URGENTE" if nivel == "MUITO_ALTO" else "ALTA",
            data_conclusao=dt_conc,
            data_limite=date.today() + timedelta(days=random.randint(10, 90)),
            auto_gerada=False,
            motivo_risco=random.choice(motivos.get(nivel, ["Risco elevado"])),
        ))
        intv_count += 1
    if intv_count % 500 == 0:
        db.commit()
        print(f"   {intv_count} intervencoes...")
db.commit()
print(f"   Total: {intv_count} intervencoes")

# ============================================
# 5. PLANOS DE ACAO (1 por curso por nivel)
# ============================================
print("\n5. Criando planos de acao...")
acoes_por_nivel = {
    "BAIXO": '["Monitorar frequencia mensalmente", "Parabenizar bom desempenho", "Incentivar participacao extracurricular"]',
    "MEDIO": '["Agendar conversa com coordenador", "Oferecer monitoria academica", "Verificar condicoes socioeconomicas"]',
    "ALTO": '["Convocar reuniao com familia", "Encaminhar para apoio psicologico", "Oferecer auxilio financeiro emergencial", "Criar plano de estudos personalizado"]',
    "MUITO_ALTO": '["Intervencao imediata da equipe pedagogica", "Visita domiciliar", "Encaminhamento para assistencia social", "Bolsa emergencial", "Acompanhamento semanal"]',
}

planos_count = 0
for curso in cursos:
    for nivel in ["BAIXO", "MEDIO", "ALTO", "ALTO"]:  # ALTO cobre MUITO_ALTO (ENUM do MySQL)
        db.add(models.PlanosAcao(
            curso_id=curso.id, nivel_risco=nivel,
            meta_frequencia_minima={"BAIXO": 80, "MEDIO": 70, "ALTO": 50}[nivel],
            meta_media_minima={"BAIXO": 7.0, "MEDIO": 6.0, "ALTO": 4.0}[nivel],
            prazo_dias={"BAIXO": 90, "MEDIO": 60, "ALTO": 15}[nivel],
            acoes_recomendadas=acoes_por_nivel[nivel],
            ativo=True,
        ))
        planos_count += 1
db.commit()
print(f"   Total: {planos_count} planos (19 cursos x 4 niveis)")

# ============================================
# 6. ATENDIMENTOS (~500 vinculados a alunos com intervencao)
# ============================================
print("\n6. Criando atendimentos...")
atend_count = 0
tipos_atend = ["PSICOLOGICO", "SOCIAL", "ACADEMICO", "CONVERSA_INFORMAL", "DISCIPLINAR", "SAUDE", "ENCAMINHAMENTO_EXTERNO"]
status_atend = ["REALIZADO", "REALIZADO", "REALIZADO", "EM_ANDAMENTO", "AGENDADO"]
prioridades = ["BAIXA", "MEDIA", "ALTA", "URGENTE"]

alunos_com_intv = db.query(models.Intervencao.aluno_id).distinct().all()
matriculas_intv = {a[0] for a in alunos_com_intv}

for aluno in alunos:
    if aluno.matricula not in matriculas_intv:
        continue
    if atend_count >= 500:
        break
    if random.random() < 0.4:
        continue

    dias_atras = random.randint(5, 400)
    dt_atend = date.today() - timedelta(days=dias_atras)
    st = random.choice(status_atend)
    tipo = random.choice(tipos_atend)
    prior = "URGENTE" if random.random() < 0.15 else random.choice(prioridades[:3])
    encaminha = st in ("EM_ANDAMENTO", "AGENDADO")

    db.add(models.Atendimento(
        aluno_matricula=aluno.matricula, usuario_id=admin_id,
        tipo_atendimento=tipo, status=st,
        data_atendimento=dt_atend,
        descricao=f"Atendimento de {tipo.lower()} para aluno com indicadores de risco.",
        prioridade=prior,
        necessita_encaminhamento=encaminha,
        status_encaminhamento="EM_ATENDIMENTO" if encaminha else None,
        tipo_encaminhamento=random.choice(["CAPS", "UBS", "CRAS"]) if encaminha else None,
        data_encaminhamento=dt_atend if encaminha else None,
        necessita_followup=st in ("EM_ANDAMENTO", "AGENDADO"),
        data_proximo_atendimento=dt_atend + timedelta(days=30) if st in ("EM_ANDAMENTO", "AGENDADO") else None,
    ))
    atend_count += 1
    if atend_count % 200 == 0:
        db.commit()
        print(f"   {atend_count} atendimentos...")
db.commit()
print(f"   Total: {atend_count} atendimentos")

# ============================================
# 7. COMUNICACOES (~300)
# ============================================
print("\n7. Criando comunicacoes...")
com_count = 0
tipos_com = {
    "FALTAS": "Alerta de Faltas Consecutivas",
    "RISCO": "Alerta de Risco de Evasao",
    "ATENDIMENTO": "Confirmacao de Atendimento",
    "LEMBRETE": "Lembrete de Atendimento Agendado",
}
canais = ["SISTEMA", "EMAIL", "WHATSAPP", "SISTEMA"]

for aluno in alunos:
    if com_count >= 300:
        break
    if random.random() < 0.85:
        continue
    pred = db.query(models.Predicao).filter(models.Predicao.aluno_id == aluno.matricula).first()
    if not pred:
        continue
    nivel = pred.nivel_risco.value

    tipo = "RISCO" if nivel in ("MUITO_ALTO", "ALTO") else random.choice(["FALTAS", "RISCO", "LEMBRETE"])
    canal = random.choice(canais)
    dias = random.randint(5, 120)
    dt_envio = datetime.now() - timedelta(days=dias)
    status_com = random.choice(["ENVIADA", "ENVIADA", "ENVIADA", "ENTREGUE", "LIDA"])

    template_id = {"FALTAS": "ALERTA_FALTAS", "RISCO": "RISCO_ALTO_NOTIFICACAO", "LEMBRETE": "LEMBRETE_ATENDIMENTO"}.get(tipo, "RISCO_ALTO_NOTIFICACAO")

    msg = f"Prezado(a) responsavel pelo(a) aluno(a) {aluno.nome}. {tipos_com.get(tipo, '')}. Entre em contato com a instituicao. Atenciosamente, Equipe IFN."

    db.add(models.Comunicacao(
        aluno_matricula=aluno.matricula, usuario_id=admin_id,
        destinatario_tipo="RESPONSAVEL",
        destinatario_nome=f"Responsavel de {aluno.nome}",
        destinatario_contato="(92) 99999-9999",
        tipo_comunicacao=tipo, canal=canal,
        assunto=f"IFN - {tipos_com.get(tipo, 'Notificacao')}",
        mensagem=msg, template_id=template_id,
        status=status_com,
        data_envio=dt_envio if status_com != "PENDENTE" else None,
        data_envio_efetivo=dt_envio if status_com in ("ENTREGUE", "LIDA") else None,
        data_leitura=dt_envio + timedelta(hours=random.randint(1, 48)) if status_com == "LIDA" else None,
        eh_lembrete=(tipo == "LEMBRETE"),
    ))
    com_count += 1
    if com_count % 100 == 0:
        db.commit()
        print(f"   {com_count} comunicacoes...")
db.commit()
print(f"   Total: {com_count} comunicacoes")

# ============================================
# RESUMO
# ============================================
print("\n" + "=" * 50)
print("SEED CONCLUIDO!")
print(f"  Disciplinas:    {total_disc}")
print(f"  Notas:          {notas_count}")
print(f"  Faltas diarias: {faltas_count}")
print(f"  Intervencoes:   {intv_count}")
print(f"  Planos de acao: {planos_count}")
print(f"  Atendimentos:   {atend_count}")
print(f"  Comunicacoes:   {com_count}")
print(f"  Alunos no banco: {db.query(models.Aluno).count()}")
print("=" * 50)

db.close()
