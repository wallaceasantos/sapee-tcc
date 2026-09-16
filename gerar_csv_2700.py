"""Gera CSV com 2700 alunos nos 19 cursos SUPERIOR."""
import csv, random, io, math

random.seed(42)

CURSOS = [
    "Administracao", "Ciencias Contabeis", "Direito",
    "Enfermagem", "Fisioterapia", "Farmacia",
    "Educacao Fisica", "Estetica e Cosmetica", "Nutricao",
    "Medicina Veterinaria", "Psicologia", "Pedagogia",
    "Analise e Desenvolvimento de Sistemas", "Logistica", "Marketing",
    "Gestao de Recursos Humanos", "Gestao Financeira",
    "Processos Gerenciais", "Servico Social",
]

TURNOS = ["MATUTINO", "VESPERTINO", "NOTURNO"]
PESOS_TURNO = [0.40, 0.25, 0.35]  # 40% matutino, 25% vespertino, 35% noturno

ZONAS = ["ZONA_NORTE", "ZONA_SUL", "ZONA_LESTE", "ZONA_OESTE", "CENTRO", "INTERIOR"]
DIFICULDADES_BAIXA = ["FACIL", "MEDIA"]
DIFICULDADES_MEDIA = ["MEDIA", "DIFICIL"]
DIFICULDADES_ALTA = ["DIFICIL", "MUITO_DIFICIL"]
TRANSPORTE = ["ONIBUS", "VAN", "CARRO", "MOTO"]
AUXILIOS = ["", "BOLSA_MONITORIA", "AUXILIO_PERMANENCIA", "AUXILIO_MORADIA", "AUXILIO_TRANSPORTE"]

NOMES_F = [
    "Ana", "Beatriz", "Carla", "Diana", "Erika", "Fernanda", "Gabriela", "Helena",
    "Isabela", "Julia", "Karen", "Larissa", "Mariana", "Natalia", "Olivia", "Patricia",
    "Renata", "Sabrina", "Tatiane", "Vanessa", "Amanda", "Bianca", "Carolina", "Daniela",
    "Elaine", "Fabiana", "Gisele", "Ingrid", "Jaqueline", "Luana",
]
NOMES_M = [
    "Andre", "Bruno", "Caio", "Daniel", "Eduardo", "Felipe", "Gabriel", "Henrique",
    "Igor", "Joao", "Kevin", "Lucas", "Marcelo", "Nicolas", "Otavio", "Pedro",
    "Rafael", "Thiago", "Victor", "William", "Alex", "Bernardo", "Cesar", "Diego",
    "Emerson", "Fabio", "Gustavo", "Hugo", "Ivan", "Leonardo",
]
SOBRENOMES = [
    "Souza", "Lima", "Costa", "Oliveira", "Santos", "Pereira", "Alves", "Ferreira",
    "Ribeiro", "Barbosa", "Cardoso", "Freitas", "Marques", "Ramos", "Araujo", "Medeiros",
    "Nascimento", "Duarte", "Machado", "Teixeira", "Gomes", "Pinto", "Silva",
    "Rodrigues", "Camargo", "Borges", "Lira", "Campos", "Mendes", "Moreira",
]

BAIRROS = [
    "Centro", "Chapada", "Flores", "Aleixo", "Cachoeirinha", "Compensa",
    "Sao Jose", "Santa Etelvina", "Nossa Senhora das Gracas", "Glacis",
    "Dom Pedro", "Alvorada", "Parque 10", "Cidade Nova", "Petropolis",
]
LOGRADOUROS = [
    "Av. Djalma Batista", "Rua Parana", "Av. Constantino Nery",
    "Rua Ferreira Pena", "Av. Torquato Tapajos", "Rua Major Gabriel",
    "Av. Cosme Ferreira", "Av. Andre Araujo", "Rua Leonardo Malcher",
    "Av. do Turismo", "Rua Barao do Rio Branco",
]

TOTAL = 2700
BOM = "\ufeff"
DELIM = ";"

output = io.StringIO()
output.write(f"matricula{DELIM}nome{DELIM}email{DELIM}telefone{DELIM}data_nascimento{DELIM}idade{DELIM}sexo{DELIM}curso{DELIM}periodo{DELIM}turno{DELIM}media_geral{DELIM}frequencia{DELIM}renda_familiar{DELIM}renda_per_capita{DELIM}cidade{DELIM}cep{DELIM}logradouro{DELIM}numero{DELIM}complemento{DELIM}bairro{DELIM}zona_residencial{DELIM}possui_auxilio{DELIM}tipo_auxilio{DELIM}trabalha{DELIM}carga_horaria_trabalho{DELIM}historico_reprovas{DELIM}coeficiente_rendimento{DELIM}ano_ingresso{DELIM}tempo_deslocamento{DELIM}custo_transporte_diario{DELIM}dificuldade_acesso{DELIM}possui_computador{DELIM}possui_internet{DELIM}transporte_utilizado{DELIM}usa_transporte_alternativo{DELIM}beneficiario_bolsa_familia{DELIM}primeiro_geracao_universidade\n")

for i in range(TOTAL):
    sexo = random.choice(["M", "F"])
    nome = random.choice(NOMES_M if sexo == "M" else NOMES_F)
    nome += " " + random.choice(SOBRENOMES) + " " + random.choice(SOBRENOMES)
    matricula = f"2025{str(i+1).zfill(6)}"
    email = nome.lower().replace(" ", ".") + "@academico.edu.br"
    ddd = random.choice(["92", "11", "21", "31", "41"])
    telefone = f"({ddd}) 9{random.randint(8000, 9999)}-{random.randint(1000, 9999)}"
    ano_nasc = random.randint(2000, 2006)
    data_nasc = f"{ano_nasc}-{str(random.randint(1, 12)).zfill(2)}-{str(random.randint(1, 28)).zfill(2)}"
    idade = 2026 - ano_nasc
    curso = random.choice(CURSOS)
    periodo = min(random.randint(1, 8), max(1, (2026 - random.randint(2019, 2025)) * 2))
    
    r = random.random()
    turno = random.choices(TURNOS, weights=PESOS_TURNO)[0]

    if r < 0.20:  # BAIXO RISCO
        media = round(random.uniform(7.8, 9.8), 1)
        freq = random.randint(85, 99)
        renda_fam = random.randint(3000, 8000)
        reprovas = 0
        coef = round(random.uniform(7.5, 9.8), 1)
        ano_ingresso = random.randint(2022, 2025)
        trabalha = "False"
        carga = 0
        dif = random.choice(DIFICULDADES_BAIXA)
    elif r < 0.45:  # MEDIO RISCO
        media = round(random.uniform(5.5, 7.5), 1)
        freq = random.randint(65, 82)
        renda_fam = random.randint(1800, 4000)
        reprovas = random.randint(0, 2)
        coef = round(random.uniform(5.0, 7.5), 1)
        ano_ingresso = random.randint(2021, 2024)
        trabalha = random.choice(["True", "False", "False"])
        carga = random.choice([20, 30, 0])
        dif = random.choice(DIFICULDADES_MEDIA)
    elif r < 0.75:  # ALTO RISCO
        media = round(random.uniform(3.5, 5.5), 1)
        freq = random.randint(45, 62)
        renda_fam = random.randint(1000, 2500)
        reprovas = random.randint(2, 4)
        coef = round(random.uniform(3.0, 5.0), 1)
        ano_ingresso = random.randint(2019, 2022)
        trabalha = random.choice(["True", "True", "False"])
        carga = random.choice([30, 40, 44, 0])
        dif = random.choice(DIFICULDADES_ALTA)
    else:  # MUITO ALTO RISCO
        media = round(random.uniform(1.0, 3.5), 1)
        freq = random.randint(20, 45)
        renda_fam = random.randint(600, 1800)
        reprovas = random.randint(3, 6)
        coef = round(random.uniform(1.0, 3.0), 1)
        ano_ingresso = random.randint(2019, 2021)
        trabalha = "True"
        carga = random.choice([40, 44, 44])
        dif = random.choice(DIFICULDADES_ALTA)

    renda_pc = round(renda_fam / random.randint(2, 5))
    cep = f"69{random.randint(100, 999)}-{random.randint(100, 999)}"
    zona = random.choice(ZONAS)
    bairro = random.choice(BAIRROS)
    logr = random.choice(LOGRADOUROS)
    num = str(random.randint(10, 9999))
    comp = random.choice(["", "", "", f"Apto {random.randint(1, 20)}", f"Bloco {random.choice('ABCD')}"])
    pc = random.choice(["True", "True", "True", "False"])
    net = random.choice(["True", "True", "True", "False"])
    transp = random.choice(TRANSPORTE)
    transp_alt = random.choice(["False", "False", "False", "True"])

    auxilio = random.choice(["True", "False"])
    tipo_aux = random.choice(AUXILIOS) if auxilio == "True" else ""
    bolsa = random.choice(["True", "False"])
    prim_ger = random.choice(["True", "False"])
    tempo_desl = random.choice([15, 20, 25, 30, 35, 40, 50, 60, 75, 90])
    custo = round(random.uniform(4.5, 25.0), 1)

    output.write(
        f"{matricula}{DELIM}{nome}{DELIM}{email}{DELIM}{telefone}{DELIM}{data_nasc}{DELIM}{idade}{DELIM}{sexo}{DELIM}"
        f"{curso}{DELIM}{periodo}{DELIM}{turno}{DELIM}{media}{DELIM}{freq}{DELIM}{renda_fam}{DELIM}{renda_pc}{DELIM}"
        f"Manaus{DELIM}{cep}{DELIM}{logr}{DELIM}{num}{DELIM}{comp}{DELIM}{bairro}{DELIM}{zona}{DELIM}"
        f"{auxilio}{DELIM}{tipo_aux}{DELIM}{trabalha}{DELIM}{carga}{DELIM}{reprovas}{DELIM}{coef}{DELIM}"
        f"{ano_ingresso}{DELIM}{tempo_desl}{DELIM}{custo}{DELIM}{dif}{DELIM}{pc}{DELIM}{net}{DELIM}"
        f"{transp}{DELIM}{transp_alt}{DELIM}{bolsa}{DELIM}{prim_ger}\n"
    )

    if (i + 1) % 500 == 0:
        print(f"Gerados {i + 1}/{TOTAL}...")

path = r"C:\Users\wallace\Documents\Projetos Web Iniciados\sapee---sistema-de-alerta-de-predição-de-evasão-escolar\test_data_import.csv"
with open(path, "w", encoding="utf-8-sig", newline="") as f:
    f.write(output.getvalue())

kb = round(len(output.getvalue()) / 1024, 1)
print(f"\nArquivo: {path}")
print(f"Tamanho: {kb} KB")
print(f"Total: {TOTAL} alunos")

# Validacao rapida
with open(path, "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f, delimiter=DELIM)
    cursos_csv = set()
    turnos_csv = {}
    anos_csv = {}
    for row in reader:
        cursos_csv.add(row["curso"])
        turnos_csv[row["turno"]] = turnos_csv.get(row["turno"], 0) + 1
        anos_csv[row["ano_ingresso"]] = anos_csv.get(row["ano_ingresso"], 0) + 1

print(f"\nCursos unicos: {len(cursos_csv)}")
print(f"Turnos: {turnos_csv}")
print(f"Anos: {dict(sorted(anos_csv.items()))}")
