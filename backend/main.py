"""
SAPEE DEWAS - Backend API
Sistema de Alerta de Predição de Evasão Escolar
"""

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
import json

# Imports absolutos (sem ponto)
import models, schemas, auth, database
from database import engine
from ml_logic_v2 import calcular_risco_evasao
from ml_logic import calcular_risco_psicossocial, get_perguntas_questionario
import uuid
from datetime import datetime, timedelta

# Importar rotas de notificações
from routes.notificacoes import router as notificacoes_router

# ============================================
# CONFIGURAÇÃO INICIAL
# ============================================

# Criar tabelas no banco (em produção usar Alembic)
models.Base.metadata.create_all(bind=engine)

# Criar app FastAPI
app = FastAPI(
    title="SAPEE DEWAS API",
    description="Sistema de Alerta de Predição de Evasão Escolar",
    version="1.0.0"
)

# ============================================
# CORS (Cross-Origin Resource Sharing)
# ============================================
# CONFIGURAÇÃO DE CORS (Permitir Frontend)
# ============================================
import os

# Define as origens permitidas (Locais + Railway)
origens_permitidas = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://sapee-dewas.up.railway.app",  # SEU SITE NO RAILWAY
    os.getenv("FRONTEND_URL", "")          # LÊ A VARIÁVEL DO RAILWAY SE EXISTIR
]

# Filtra strings vazias caso a variável não exista
origens_permitidas = [url for url in origens_permitidas if url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# ENDPOINTS - SAÚDE & INFO
# ============================================

@app.get("/")
def read_root():
    """Endpoint de teste"""
    return {
        "message": "SAPEE DEWAS API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    """Verificar saúde da API"""
    return {
        "status": "healthy",
        "database": database.test_connection()
    }

# ============================================
# ENDPOINTS - AUTENTICAÇÃO
# ============================================

@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    """
    Login de usuário
    """
    # Buscar usuário
    user = db.query(models.Usuario).filter(
        models.Usuario.email == login_data.email
    ).first()
    
    # Verificar usuário e senha
    if not user or not auth.verificar_senha(login_data.senha, user.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verificar se está ativo
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    
    # Atualizar último acesso
    user.ultimo_acesso = models.func.now()
    db.commit()
    
    # Criar tokens
    access_token = auth.criar_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.nome}
    )
    refresh_token = auth.criar_refresh_token(
        data={"sub": user.id}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.get("/auth/me", response_model=schemas.UsuarioResponse)
def get_current_user_info(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Obter informações do usuário atual"""
    from sqlalchemy.orm import joinedload
    
    # Recarregar usuário com role e curso para evitar problemas de serialização
    user = db.query(models.Usuario).options(
        joinedload(models.Usuario.role),
        joinedload(models.Usuario.curso)
    ).filter(models.Usuario.id == current_user.id).first()
    
    return user

@app.put("/auth/trocar-senha")
def trocar_senha(
    troca: schemas.TrocaSenhaRequest,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Trocar senha do usuário atual"""
    # Verificar senha atual
    if not auth.verificar_senha(troca.senha_atual, current_user.senha):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )

    # Verificar se a nova senha é diferente da atual
    if troca.senha_atual == troca.senha_nova:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da senha atual"
        )

    # Atualizar senha
    current_user.senha = auth.gerar_hash_senha(troca.senha_nova)
    db.commit()

    return {"message": "Senha alterada com sucesso"}

# ============================================
# ENDPOINTS - USUÁRIOS (ADMIN)
# ============================================

@app.get("/usuarios", response_model=List[schemas.UsuarioResponse])
def list_usuarios(
    skip: int = 0,
    limit: int = 100,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Listar todos os usuários (APENAS ADMIN)"""
    usuarios = db.query(models.Usuario).offset(skip).limit(limit).all()
    return usuarios

@app.post("/usuarios", response_model=schemas.UsuarioResponse)
def create_usuario(
    usuario: schemas.UsuarioCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Criar novo usuário (APENAS ADMIN)"""
    # Verificar se email já existe
    existing = db.query(models.Usuario).filter(
        models.Usuario.email == usuario.email
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    # Criar usuário com senha hash
    db_usuario = models.Usuario(
        **usuario.model_dump(),
        senha=auth.gerar_hash_senha(usuario.senha)
    )
    
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    
    return db_usuario

@app.get("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def get_usuario(
    usuario_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Obter usuário por ID (APENAS ADMIN)"""
    usuario = db.query(models.Usuario).filter(
        models.Usuario.id == usuario_id
    ).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return usuario

@app.put("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def update_usuario(
    usuario_id: int,
    usuario_update: schemas.UsuarioUpdate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Atualizar usuário (APENAS ADMIN)"""
    db_usuario = db.query(models.Usuario).filter(
        models.Usuario.id == usuario_id
    ).first()
    
    if not db_usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Atualizar campos
    update_data = usuario_update.model_dump(exclude_unset=True)
    
    # Hash da senha se foi alterada
    if 'senha' in update_data and update_data['senha']:
        update_data['senha'] = auth.gerar_hash_senha(update_data['senha'])
    
    for key, value in update_data.items():
        setattr(db_usuario, key, value)
    
    db.commit()
    db.refresh(db_usuario)
    
    return db_usuario

@app.delete("/usuarios/{usuario_id}")
def delete_usuario(
    usuario_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Excluir usuário (APENAS ADMIN)"""
    db_usuario = db.query(models.Usuario).filter(
        models.Usuario.id == usuario_id
    ).first()
    
    if not db_usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Não permitir excluir a si mesmo
    if db_usuario.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não pode excluir a si mesmo"
        )
    
    db.delete(db_usuario)
    db.commit()
    
    return {"message": "Usuário excluído com sucesso"}

# ============================================
# ENDPOINTS - CURSOS
# ============================================

@app.get("/cursos", response_model=List[schemas.Curso])
def list_cursos(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Listar todos os cursos"""
    cursos = db.query(models.Curso).order_by(models.Curso.nome).all()
    return cursos

# ============================================
# ENDPOINTS - AUDIT LOGS
# ============================================

@app.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    acao: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Listar logs de auditoria"""
    query = db.query(models.AuditLog).options(
        joinedload(models.AuditLog.usuario)
    )

    if acao:
        query = query.filter(models.AuditLog.acao.ilike(f"%{acao}%"))

    logs = query.order_by(models.AuditLog.criado_at.desc()).offset(skip).limit(limit).all()
    return logs

@app.post("/audit-logs")
def create_audit_log(
    log_data: dict,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Criar novo log de auditoria"""
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao=log_data.get("acao", ""),
        detalhes=log_data.get("detalhes", ""),
        ip_address=log_data.get("ip_address", ""),
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log

# ============================================
# ENDPOINTS - ALUNOS
# ============================================

@app.get("/alunos/buscar")
def buscar_alunos(
    q: str = "",
    limit: int = 20,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Buscar alunos por nome ou matrícula.
    Retorna dados resumidos + última predição para uso em formulários.
    """
    from sqlalchemy import or_
    from sqlalchemy.orm import joinedload
    
    query = db.query(models.Aluno).options(joinedload(models.Aluno.curso))
    
    # Filtro por ADMIN vs outros
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)
    
    # Busca por nome ou matrícula
    if q:
        query = query.filter(
            or_(
                models.Aluno.nome.ilike(f"%{q}%"),
                models.Aluno.matricula.like(f"%{q}%")
            )
        )
    
    alunos = query.limit(limit).all()
    
    # Buscar últimas predições
    from sqlalchemy import func
    subq = db.query(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number().over(
            partition_by=models.Predicao.aluno_id,
            order_by=models.Predicao.data_predicao.desc()
        ).label('rn')
    ).subquery()
    
    predicoes_map = {}
    predicoes = db.query(subq).filter(subq.c.rn == 1).all()
    for p in predicoes:
        predicoes_map[p.aluno_id] = {
            'risco_evasao': float(p.risco_evasao) if p.risco_evasao else 0,
            'nivel_risco': p.nivel_risco
        }
    
    resultado = []
    for a in alunos:
        pred = predicoes_map.get(a.matricula, {'risco_evasao': 0, 'nivel_risco': 'BAIXO'})
        resultado.append({
            'matricula': a.matricula,
            'nome': a.nome,
            'curso': a.curso.nome if a.curso else 'N/A',
            'periodo': a.periodo,
            'media_geral': float(a.media_geral) if a.media_geral else 0,
            'frequencia': float(a.frequencia) if a.frequencia else 0,
            'risco_evasao': pred['risco_evasao'],
            'nivel_risco': pred['nivel_risco'].value if hasattr(pred['nivel_risco'], 'value') else pred['nivel_risco']
        })
    
    return resultado


@app.get("/alunos/em-risco")
def alunos_em_risco(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Lista alunos com risco ALTO/MUITO_ALTO que NÃO possuem intervenção ativa.
    Útil para identificar quem precisa de atenção imediata.
    """
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func, or_
    from datetime import datetime, timedelta
    
    # 1. Buscar alunos com risco ALTO ou MUITO_ALTO
    subq_pred = db.query(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number().over(
            partition_by=models.Predicao.aluno_id,
            order_by=models.Predicao.data_predicao.desc()
        ).label('rn')
    ).subquery()
    
    alunos_risco = db.query(subq_pred).filter(
        subq_pred.c.nivel_risco.in_(['ALTO', 'MUITO_ALTO']),
        subq_pred.c.rn == 1
    ).all()
    
    if not alunos_risco:
        return {'alunos': [], 'total': 0}
    
    matriculas_risco = [a.aluno_id for a in alunos_risco]
    
    # 2. Buscar intervenções ativas para esses alunos
    data_limite = datetime.now() - timedelta(days=30)
    intervencoes_ativas = db.query(models.Intervencao.aluno_id).filter(
        models.Intervencao.aluno_id.in_(matriculas_risco),
        models.Intervencao.status.in_(['PENDENTE', 'EM_ANDAMENTO']),
        models.Intervencao.data_intervencao >= data_limite
    ).distinct().all()
    
    matriculas_com_intervencao = set(i.aluno_id for i in intervencoes_ativas)
    matriculas_sem_intervencao = [m for m in matriculas_risco if m not in matriculas_com_intervencao]
    
    if not matriculas_sem_intervencao:
        return {'alunos': [], 'total': 0}
    
    # 3. Buscar dados completos dos alunos sem intervenção
    query = db.query(models.Aluno).options(joinedload(models.Aluno.curso)).filter(
        models.Aluno.matricula.in_(matriculas_sem_intervencao)
    )
    
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)
    
    alunos = query.all()
    
    # Montar mapa de predições
    predicoes_map = {}
    for p in alunos_risco:
        predicoes_map[p.aluno_id] = {
            'risco_evasao': float(p.risco_evasao) if p.risco_evasao else 0,
            'nivel_risco': p.nivel_risco
        }
    
    resultado = []
    for a in alunos:
        pred = predicoes_map.get(a.matricula, {'risco_evasao': 0, 'nivel_risco': 'ALTO'})
        resultado.append({
            'matricula': a.matricula,
            'nome': a.nome,
            'curso': a.curso.nome if a.curso else 'N/A',
            'periodo': a.periodo,
            'turno': a.turno,
            'media_geral': float(a.media_geral) if a.media_geral else 0,
            'frequencia': float(a.frequencia) if a.frequencia else 0,
            'risco_evasao': pred['risco_evasao'],
            'nivel_risco': pred['nivel_risco'] if isinstance(pred['nivel_risco'], str) else pred['nivel_risco'].value,
            'motivo_risco': _get_motivo_risco(a, pred['risco_evasao']),
            # Dados socioeconômicos para contexto social
            'trabalha': a.trabalha,
            'carga_horaria_trabalho': a.carga_horaria_trabalho,
            'renda_familiar': float(a.renda_familiar) if a.renda_familiar else None,
            'tempo_deslocamento': a.tempo_deslocamento,
            'dificuldade_acesso': a.dificuldade_acesso,
            'possui_computador': a.possui_computador,
            'possui_internet': a.possui_internet,
            'beneficiario_bolsa_familia': a.beneficiario_bolsa_familia
        })

    return {'alunos': resultado, 'total': len(resultado)}


def _formatar_contexto_social(a):
    """Gera resumo do contexto social para exibição"""
    linhas = []
    if a.get('trabalha'):
        linhas.append(f"👷 {a.get('carga_horaria_trabalho', '?')}h/sem")
    if a.get('renda_familiar'):
        linhas.append(f"💰 R${a['renda_familiar']:.0f}")
    if a.get('tempo_deslocamento') and a['tempo_deslocamento'] > 60:
        linhas.append(f"🚌 {a['tempo_deslocamento']}min")
    if a.get('dificuldade_acesso') in ['DIFICIL', 'MUITO_DIFICIL']:
        linhas.append(f"🚧 Acesso {' difícil' if a['dificuldade_acesso'] == 'DIFICIL' else ' mto difícil'}")
    if not a.get('possui_computador'):
        linhas.append("💻 Sem PC")
    if not a.get('possui_internet'):
        linhas.append("🌐 Sem internet")
    if a.get('beneficiario_bolsa_familia'):
        linhas.append("🏛️ Bolsa Família")
    return " | ".join(linhas) if linhas else None


@app.get("/alunos/monitoramento")
def alunos_monitoramento(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Lista alunos com risco MEDIO para acompanhamento preventivo.
    Útil para identificar alunos que podem piorar se não houver atenção.
    """
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func
    
    # 1. Buscar alunos com risco MEDIO
    subq_pred = db.query(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number().over(
            partition_by=models.Predicao.aluno_id,
            order_by=models.Predicao.data_predicao.desc()
        ).label('rn')
    ).subquery()
    
    alunos_medio = db.query(subq_pred).filter(
        subq_pred.c.nivel_risco == 'MEDIO',
        subq_pred.c.rn == 1
    ).all()
    
    if not alunos_medio:
        return {'alunos': [], 'total': 0}
    
    matriculas_medio = [a.aluno_id for a in alunos_medio]
    
    # 2. Buscar dados completos dos alunos
    query = db.query(models.Aluno).options(joinedload(models.Aluno.curso)).filter(
        models.Aluno.matricula.in_(matriculas_medio)
    )
    
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)
    
    alunos = query.all()
    
    # Montar mapa de predições
    predicoes_map = {}
    for p in alunos_medio:
        predicoes_map[p.aluno_id] = {
            'risco_evasao': float(p.risco_evasao) if p.risco_evasao else 0,
            'nivel_risco': p.nivel_risco
        }
    
    resultado = []
    for a in alunos:
        pred = predicoes_map.get(a.matricula, {'risco_evasao': 0, 'nivel_risco': 'MEDIO'})
        resultado.append({
            'matricula': a.matricula,
            'nome': a.nome,
            'curso': a.curso.nome if a.curso else 'N/A',
            'periodo': a.periodo,
            'turno': a.turno,
            'media_geral': float(a.media_geral) if a.media_geral else 0,
            'frequencia': float(a.frequencia) if a.frequencia else 0,
            'risco_evasao': pred['risco_evasao'],
            'nivel_risco': pred['nivel_risco'] if isinstance(pred['nivel_risco'], str) else pred['nivel_risco'].value,
            'motivo_risco': _get_motivo_risco(a, pred['risco_evasao']),
            # Dados socioeconômicos para contexto social
            'trabalha': a.trabalha,
            'carga_horaria_trabalho': a.carga_horaria_trabalho,
            'renda_familiar': float(a.renda_familiar) if a.renda_familiar else None,
            'tempo_deslocamento': a.tempo_deslocamento,
            'dificuldade_acesso': a.dificuldade_acesso,
            'possui_computador': a.possui_computador,
            'possui_internet': a.possui_internet,
            'beneficiario_bolsa_familia': a.beneficiario_bolsa_familia
        })
    
    return {'alunos': resultado, 'total': len(resultado)}


def _get_motivo_risco(aluno, score):
    """Gera motivo simplificado do risco"""
    motivos = []
    if aluno.frequencia and float(aluno.frequencia) < 75:
        motivos.append(f"Freq {aluno.frequencia}%")
    if aluno.media_geral and float(aluno.media_geral) < 6:
        motivos.append(f"Media {aluno.media_geral}")
    if aluno.historico_reprovas and aluno.historico_reprovas > 1:
        motivos.append(f"{aluno.historico_reprovas} repr")
    if aluno.trabalha:
        motivos.append("Trabalha")
    return ", ".join(motivos) if motivos else "Score alto"


@app.get("/alunos", response_model=List[schemas.AlunoComPredicao])
def list_alunos(
    skip: int = 0,
    limit: int = 100,
    curso_id: Optional[int] = None,
    nivel_risco: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Listar alunos com filtros opcionais (OTIMIZADO - Sem N+1 query)
    
    Filtros disponíveis:
    - skip: Paginação (offset)
    - limit: Quantidade máxima de registros
    - curso_id: Filtrar por curso específico
    - nivel_risco: Filtrar por nível de risco (BAIXO, MEDIO, ALTO)
    
    Para COORDENADOR/PEDAGOGO, filtra automaticamente pelo curso do usuário.
    """
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func, over

    # Usar joinedload para carregar curso junto (evita N+1 para cursos)
    query = db.query(models.Aluno).options(joinedload(models.Aluno.curso))

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)

    # Filtro adicional por curso
    if curso_id:
        query = query.filter(models.Aluno.curso_id == curso_id)

    # Filtro por nível de risco (usa subquery para pegar última predição)
    if nivel_risco:
        subq = db.query(
            models.Predicao.aluno_id,
            models.Predicao.nivel_risco,
            func.row_number().over(
                partition_by=models.Predicao.aluno_id,
                order_by=models.Predicao.data_predicao.desc()
            ).label('rn')
        ).subquery()
        
        alunos_com_risco = db.query(subq.c.aluno_id).filter(
            subq.c.nivel_risco == nivel_risco.upper(),
            subq.c.rn == 1
        )
        
        query = query.filter(models.Aluno.matricula.in_(alunos_com_risco))

    alunos = query.offset(skip).limit(limit).all()

    # ============================================
    # OTIMIZAÇÃO: Buscar todas as últimas predições em UMA query
    # ============================================
    # Usar window function para pegar última predição de cada aluno
    subq_pred = db.query(
        models.Predicao.aluno_id,
        models.Predicao.id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        models.Predicao.fatores_principais,
        models.Predicao.modelo_ml_versao,
        models.Predicao.data_predicao,
        func.row_number().over(
            partition_by=models.Predicao.aluno_id,
            order_by=models.Predicao.data_predicao.desc()
        ).label('rn')
    ).filter(
        models.Predicao.aluno_id.in_([a.matricula for a in alunos])
    ).subquery()

    # Pegar apenas as últimas predições (rn = 1)
    ultimas_predicoes = db.query(
        subq_pred.c.aluno_id,
        subq_pred.c.id,
        subq_pred.c.risco_evasao,
        subq_pred.c.nivel_risco,
        subq_pred.c.fatores_principais,
        subq_pred.c.modelo_ml_versao,
        subq_pred.c.data_predicao
    ).filter(subq_pred.c.rn == 1).all()

    # Criar dicionário para acesso rápido
    predicoes_dict = {p.aluno_id: p for p in ultimas_predicoes}

    # ============================================
    # Serializar alunos com predições
    # ============================================
    alunos_com_predicao = []
    for aluno in alunos:
        predicao = predicoes_dict.get(aluno.matricula)
        
        aluno_dict = {
            'matricula': aluno.matricula,
            'nome': aluno.nome,
            'email': aluno.email,
            'telefone': aluno.telefone,
            'data_nascimento': aluno.data_nascimento,
            'idade': aluno.idade,
            'sexo': aluno.sexo,
            'curso_id': aluno.curso_id,
            'periodo': aluno.periodo,
            'turno': aluno.turno,
            'media_geral': aluno.media_geral,
            'frequencia': aluno.frequencia,
            'historico_reprovas': aluno.historico_reprovas,
            'coeficiente_rendimento': aluno.coeficiente_rendimento,
            'ano_ingresso': aluno.ano_ingresso,
            'cidade': aluno.cidade,
            'cep': aluno.cep,
            'logradouro': aluno.logradouro,
            'numero': aluno.numero,
            'complemento': aluno.complemento,
            'bairro': aluno.bairro,
            'zona_residencial': aluno.zona_residencial,
            'renda_familiar': aluno.renda_familiar,
            'renda_per_capita': aluno.renda_per_capita,
            'possui_auxilio': aluno.possui_auxilio,
            'tipo_auxilio': aluno.tipo_auxilio,
            'trabalha': aluno.trabalha,
            'carga_horaria_trabalho': aluno.carga_horaria_trabalho,
            'tempo_deslocamento': aluno.tempo_deslocamento,
            'custo_transporte_diario': aluno.custo_transporte_diario,
            'dificuldade_acesso': aluno.dificuldade_acesso,
            'transporte_utilizado': aluno.transporte_utilizado,
            'usa_transporte_alternativo': aluno.usa_transporte_alternativo,
            'possui_computador': aluno.possui_computador,
            'possui_internet': aluno.possui_internet,
            'beneficiario_bolsa_familia': aluno.beneficiario_bolsa_familia,
            'primeiro_geracao_universidade': aluno.primeiro_geracao_universidade,
            'curso': aluno.curso,
            'predicao_atual': {
                'id': predicao.id,
                'aluno_id': predicao.aluno_id,  # ✅ CAMPO FALTANTE!
                'risco_evasao': float(predicao.risco_evasao) if predicao else 0,
                'nivel_risco': predicao.nivel_risco if predicao else None,
                'fatores_principais': predicao.fatores_principais if predicao else None,
                'modelo_ml_versao': predicao.modelo_ml_versao if predicao else '1.0.0',
                'data_predicao': predicao.data_predicao if predicao else None,
            } if predicao else None,
        }
        alunos_com_predicao.append(aluno_dict)

    return alunos_com_predicao

@app.post("/alunos", response_model=schemas.AlunoResponse)
def create_aluno(
    aluno: schemas.AlunoCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Criar novo aluno"""
    from datetime import datetime
    
    try:
        # Verificar se matrícula já existe
        existing = db.query(models.Aluno).filter(
            models.Aluno.matricula == aluno.matricula
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Matrícula já cadastrada"
            )

        # Debug: mostrar dados recebidos
        print(f"🔵 Criando aluno: {aluno.matricula} - {aluno.nome}")
        print(f"🔵 Frequência: {aluno.frequencia}")

        # Criar aluno
        db_aluno = models.Aluno(**aluno.model_dump())

        db.add(db_aluno)
        db.commit()
        db.refresh(db_aluno)

        # ============================================
        # NOVO: Criar frequência mensal automaticamente
        # ============================================
        if aluno.frequencia and aluno.frequencia > 0:
            hoje = datetime.now()
            
            # Verificar se já existe frequência para este mês
            freq_existente = db.query(models.FrequenciaMensal).filter(
                models.FrequenciaMensal.aluno_id == db_aluno.matricula,
                models.FrequenciaMensal.mes == hoje.month,
                models.FrequenciaMensal.ano == hoje.year
            ).first()
            
            if not freq_existente:
                frequencia_mensal = models.FrequenciaMensal(
                    aluno_id=db_aluno.matricula,
                    mes=hoje.month,
                    ano=hoje.year,
                    frequencia=aluno.frequencia,
                    total_aulas_mes=20,  # Padrão
                    faltas_justificadas=0,
                    faltas_nao_justificadas=0,
                    observacoes="Frequência inicial do cadastro"
                )
                db.add(frequencia_mensal)
                db.commit()
                print(f"✅ Frequência mensal criada: {hoje.month}/{hoje.year} = {aluno.frequencia}%")
            else:
                print(f"⚠️ Frequência já existe para {hoje.month}/{hoje.year}")

        # ============================================
        # GERAR PREDIÇÃO AUTOMATICAMENTE
        # ============================================
        try:
            from ml_logic_v2 import calcular_risco_evasao as calcular_risco_v2

            # Aguardar 100ms para garantir commit do aluno
            import time
            time.sleep(0.1)

            # Recarregar aluno do banco para garantir dados completos
            db.refresh(db_aluno)

            # Calcular risco com versao v2 melhorada
            resultado = calcular_risco_v2(db_aluno, db)
            
            # Criar predição
            predicao = models.Predicao(
                aluno_id=db_aluno.matricula,
                risco_evasao=resultado['risco_evasao'],
                nivel_risco=resultado['nivel_risco'],
                fatores_principais=resultado['fatores_principais'],
                modelo_ml_versao='2.0.0-fallback'
            )
            db.add(predicao)
            db.commit()
            
            print(f"✅ Predição gerada para {db_aluno.nome}:")
            print(f"   Score: {resultado['risco_evasao']}")
            print(f"   Nível: {resultado['nivel_risco']}")
            print(f"   Fatores: {resultado['fatores_principais'][:50]}...")

        except Exception as e:
            print(f"⚠️ Erro ao gerar predição: {type(e).__name__}: {e}")
            # NÃO faz rollback do aluno, apenas loga o erro
            # Predição pode ser gerada depois manualmente

        return db_aluno
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar aluno: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar aluno: {str(e)}"
        )

@app.get("/alunos/{matricula}", response_model=schemas.AlunoResponse)
def get_aluno(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Obter aluno por matrícula COM PREDIÇÃO ATUAL"""
    from sqlalchemy.orm import joinedload

    # Buscar aluno
    aluno = db.query(models.Aluno).options(
        joinedload(models.Aluno.curso)
    ).filter(
        models.Aluno.matricula == matricula
    ).first()

    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Converter para dict e adicionar predicao_atual
    
    # Calcular idade automaticamente se estiver vazia
    idade_final = aluno.idade
    if not idade_final and aluno.data_nascimento:
        from datetime import date
        hoje = date.today()
        # Se for objeto datetime.date
        if hasattr(aluno.data_nascimento, 'year'):
            idade_final = hoje.year - aluno.data_nascimento.year - ((hoje.month, hoje.day) < (aluno.data_nascimento.month, aluno.data_nascimento.day))
        # Se for string (fallback)
        elif isinstance(aluno.data_nascimento, str):
            try:
                from datetime import datetime
                nasc = datetime.strptime(aluno.data_nascimento, '%Y-%m-%d').date()
                idade_final = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
            except:
                pass

    aluno_dict = {
        'matricula': aluno.matricula,
        'nome': aluno.nome,
        'email': aluno.email,
        'telefone': aluno.telefone,
        'data_nascimento': aluno.data_nascimento,
        'idade': idade_final,
        'sexo': aluno.sexo,
        'curso_id': aluno.curso_id,
        'curso': aluno.curso,
        'periodo': aluno.periodo,
        'turno': aluno.turno,
        'media_geral': aluno.media_geral,
        'frequencia': aluno.frequencia,
        'historico_reprovas': aluno.historico_reprovas,
        'coeficiente_rendimento': aluno.coeficiente_rendimento,
        'ano_ingresso': aluno.ano_ingresso,
        'cidade': aluno.cidade,
        'cep': aluno.cep,
        'logradouro': aluno.logradouro,
        'numero': aluno.numero,
        'complemento': aluno.complemento,
        'bairro': aluno.bairro,
        'zona_residencial': aluno.zona_residencial,
        'renda_familiar': aluno.renda_familiar,
        'renda_per_capita': aluno.renda_per_capita,
        'possui_auxilio': aluno.possui_auxilio,
        'tipo_auxilio': aluno.tipo_auxilio,
        'trabalha': aluno.trabalha,
        'carga_horaria_trabalho': aluno.carga_horaria_trabalho,
        'tempo_deslocamento': aluno.tempo_deslocamento,
        'custo_transporte_diario': aluno.custo_transporte_diario,
        'dificuldade_acesso': aluno.dificuldade_acesso,
        'transporte_utilizado': aluno.transporte_utilizado,
        'usa_transporte_alternativo': aluno.usa_transporte_alternativo,
        'possui_computador': aluno.possui_computador,
        'possui_internet': aluno.possui_internet,
        'beneficiario_bolsa_familia': aluno.beneficiario_bolsa_familia,
        'primeiro_geracao_universidade': aluno.primeiro_geracao_universidade,
    }

    # Pegar última predição (BUSCAR DIRETAMENTE DO BANCO)
    ultima_predicao = db.query(models.Predicao).filter(
        models.Predicao.aluno_id == matricula
    ).order_by(
        models.Predicao.data_predicao.desc()
    ).first()
    
    if ultima_predicao:
        aluno_dict['predicao_atual'] = {
            'id': ultima_predicao.id,
            'risco_evasao': float(ultima_predicao.risco_evasao),
            'nivel_risco': ultima_predicao.nivel_risco,
            'fatores_principais': ultima_predicao.fatores_principais,
            'modelo_ml_versao': ultima_predicao.modelo_ml_versao,
            'data_predicao': ultima_predicao.data_predicao.isoformat() if ultima_predicao.data_predicao else None,
            'aluno_id': ultima_predicao.aluno_id,
        }

    return aluno_dict

@app.put("/alunos/{matricula}", response_model=schemas.AlunoResponse)
def update_aluno(
    matricula: str,
    aluno_update: schemas.AlunoUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Atualizar aluno e recalcular predição"""
    db_aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == matricula
    ).first()

    if not db_aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Atualizar campos
    update_data = aluno_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_aluno, key, value)

    db.commit()
    db.refresh(db_aluno)
    
    # ============================================
    # ATUALIZAR PREDIÇÃO AUTOMATICAMENTE
    # ============================================
    try:
        # Deletar predição antiga
        db.query(models.Predicao).filter(
            models.Predicao.aluno_id == matricula
        ).delete()
        
        # Gerar nova predição
        resultado = calcular_risco_evasao(db_aluno, db)
        
        predicao = models.Predicao(
            aluno_id=db_aluno.matricula,
            risco_evasao=resultado['risco_evasao'],
            nivel_risco=resultado['nivel_risco'],
            fatores_principais=resultado['fatores_principais'],
            modelo_ml_versao='1.0.0'
        )
        db.add(predicao)
        db.commit()
        
        print(f"✅ Predição atualizada para {db_aluno.nome}: {resultado['nivel_risco']}")
        
    except Exception as e:
        print(f"⚠️ Erro ao atualizar predição: {e}")
        db.rollback()

    return db_aluno

@app.delete("/alunos/{matricula}")
def delete_aluno(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Excluir aluno (APENAS ADMIN)"""
    db_aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == matricula
    ).first()

    if not db_aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    db.delete(db_aluno)
    db.commit()

    return {"message": "Aluno excluído com sucesso"}

# ============================================
# ENDPOINTS - AÇÕES EM MASSA
# ============================================

@app.post("/alunos/delete-multiple")
def delete_multiple_alunos(
    matriculas: list[str],
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """
    Excluir múltiplos alunos de uma vez (APENAS ADMIN)
    
    Recebe uma lista de matrículas e exclui todos em uma transação.
    """
    if not matriculas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lista de matrículas vazia"
        )

    # Buscar todos os alunos
    alunos = db.query(models.Aluno).filter(
        models.Aluno.matricula.in_(matriculas)
    ).all()

    if not alunos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum aluno encontrado"
        )

    # Excluir todos
    for aluno in alunos:
        db.delete(aluno)

    db.commit()

    return {
        "message": f"{len(alunos)} aluno(s) excluído(s) com sucesso",
        "excluidos": len(alunos),
        "matriculas": matriculas
    }

# ============================================
# ENDPOINTS - IMPORTAÇÃO CSV
# ============================================

@app.post("/alunos/importar-csv")
def importar_alunos_csv(
    file: UploadFile = File(...),
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Importar alunos de arquivo CSV
    
    Formato esperado do CSV:
    matricula,nome,email,telefone,data_nascimento,idade,sexo,curso,periodo,turno,
    media_geral,frequencia,historico_reprovas,coeficiente_rendimento,ano_ingresso,
    cidade,cep,logradouro,numero,complemento,bairro,zona_residencial,
    renda_familiar,renda_per_capita,possui_auxilio,tipo_auxilio,
    trabalha,carga_horaria_trabalho,tempo_deslocamento,custo_transporte_diario,
    dificuldade_acesso,transporte_utilizado,usa_transporte_alternativo,
    possui_computador,possui_internet,beneficiario_bolsa_familia,primeiro_geracao_universidade
    
    Apenas ADMIN e COORDENADOR podem importar.
    """
    import csv
    import io
    from datetime import datetime
    
    # Verificar permissão
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada. Apenas ADMIN e COORDENADOR podem importar."
        )

    try:
        # Ler arquivo CSV
        contents = file.file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(contents))
        
        alunos_importados = []
        erros = []
        predicoes_geradas = 0
        
        for idx, row in enumerate(reader, start=2):  # Começa em 2 (cabeçalho é linha 1)
            try:
                # Buscar curso por nome
                curso_nome = row.get('curso', '').strip()
                curso = db.query(models.Curso).filter(
                    models.Curso.nome.ilike(f"%{curso_nome}%")
                ).first()
                
                if not curso:
                    erros.append(f"Linha {idx}: Curso '{curso_nome}' não encontrado")
                    continue

                # Converter dados
                data = {
                    'matricula': row.get('matricula', '').strip(),
                    'nome': row.get('nome', '').strip(),
                    'email': row.get('email', '').strip() or None,
                    'telefone': row.get('telefone', '').strip() or None,
                    'curso_id': curso.id,
                    'periodo': int(row.get('periodo', 1)),
                    'turno': row.get('turno', 'MATUTINO').upper(),
                    'media_geral': float(row.get('media_geral', 0)) or None,
                    'frequencia': float(row.get('frequencia', 0)) or None,
                    'historico_reprovas': int(row.get('historico_reprovas', 0)) or 0,
                    'ano_ingresso': int(row.get('ano_ingresso', datetime.now().year)) or None,
                    'cidade': row.get('cidade', '').strip() or None,
                    'renda_familiar': float(row.get('renda_familiar', 0)) or None,
                    'trabalha': row.get('trabalha', 'false').lower() == 'true',
                    'possui_auxilio': row.get('possui_auxilio', 'false').lower() == 'true',
                    'possui_computador': row.get('possui_computador', 'false').lower() == 'true',
                    'possui_internet': row.get('possui_internet', 'false').lower() == 'true',
                }
                
                # Campos opcionais de data
                if row.get('data_nascimento'):
                    try:
                        data['data_nascimento'] = datetime.strptime(
                            row.get('data_nascimento'), '%Y-%m-%d'
                        ).date()
                    except:
                        data['data_nascimento'] = None
                
                # Campos opcionais numéricos
                for campo in ['idade', 'carga_horaria_trabalho', 'tempo_deslocamento']:
                    if row.get(campo):
                        try:
                            data[campo] = int(row.get(campo))
                        except:
                            pass
                
                for campo in ['coeficiente_rendimento', 'renda_per_capita', 'custo_transporte_diario']:
                    if row.get(campo):
                        try:
                            data[campo] = float(row.get(campo))
                        except:
                            pass
                
                # Campos booleanos
                for campo in ['beneficiario_bolsa_familia', 'primeiro_geracao_universidade', 
                              'usa_transporte_alternativo']:
                    if row.get(campo):
                        data[campo] = row.get(campo).lower() == 'true'
                
                # Campos enum
                if row.get('sexo'):
                    data['sexo'] = row.get('sexo').upper()
                if row.get('zona_residencial'):
                    data['zona_residencial'] = row.get('zona_residencial').upper()
                if row.get('dificuldade_acesso'):
                    data['dificuldade_acesso'] = row.get('dificuldade_acesso').upper()
                
                # Verificar se matrícula já existe
                existing = db.query(models.Aluno).filter(
                    models.Aluno.matricula == data['matricula']
                ).first()
                
                if existing:
                    erros.append(f"Linha {idx}: Matrícula '{data['matricula']}' já existe")
                    continue

                # Criar aluno
                db_aluno = models.Aluno(**data)
                db.add(db_aluno)
                db.flush()  # Para pegar o ID antes do commit
                alunos_importados.append(db_aluno)

                # ============================================
                # NOVO: Criar frequência mensal automaticamente
                # ============================================
                from datetime import datetime
                hoje = datetime.now()
                
                if data.get('frequencia') and data['frequencia'] > 0:
                    # Verificar se já existe
                    freq_existente = db.query(models.FrequenciaMensal).filter(
                        models.FrequenciaMensal.aluno_id == db_aluno.matricula,
                        models.FrequenciaMensal.mes == hoje.month,
                        models.FrequenciaMensal.ano == hoje.year
                    ).first()
                    
                    if not freq_existente:
                        frequencia_mensal = models.FrequenciaMensal(
                            aluno_id=db_aluno.matricula,
                            mes=hoje.month,
                            ano=hoje.year,
                            frequencia=data['frequencia'],
                            total_aulas_mes=20,
                            faltas_justificadas=0,
                            faltas_nao_justificadas=0,
                            observacoes="Importado via CSV"
                        )
                        db.add(frequencia_mensal)
                        predicoes_geradas += 1  # Reusando contador

                # Gerar predição automaticamente
                try:
                    resultado = calcular_risco_evasao(db_aluno, db)
                    predicao = models.Predicao(
                        aluno_id=db_aluno.matricula,
                        risco_evasao=resultado['risco_evasao'],
                        nivel_risco=resultado['nivel_risco'],
                        fatores_principais=resultado['fatores_principais'],
                        modelo_ml_versao='1.0.0'
                    )
                    db.add(predicao)
                    predicoes_geradas += 1
                except Exception as e:
                    print(f"⚠️ Erro ao gerar predição: {e}")
                    
            except Exception as e:
                erros.append(f"Linha {idx}: Erro ao processar - {str(e)}")
                continue
        
        # Commit de todos os alunos
        db.commit()
        
        return {
            "message": f"Importação concluída!",
            "alunos_importados": len(alunos_importados),
            "predicoes_geradas": predicoes_geradas,
            "erros": erros,
            "total_erros": len(erros)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao importar CSV: {str(e)}"
        )

# ============================================
# ENDPOINTS - FREQUÊNCIA MENSAL
# ============================================

@app.post("/frequencias/lancar", response_model=schemas.FrequenciaLancamentoResponse)
def lancar_frequencia_mensal(
    data: schemas.FrequenciaLancamento,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Lançar frequência mensal de um ou mais alunos.
    Apenas ADMIN e COORDENADOR podem lançar.
    """
    # Verificar permissão
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada. Apenas ADMIN e COORDENADOR podem lançar frequência."
        )
    
    registros_criados = 0
    erros = []
    
    for item in data.alunos:
        try:
            # Verificar se aluno existe
            aluno = db.query(models.Aluno).filter(
                models.Aluno.matricula == item.aluno_id
            ).first()
            
            if not aluno:
                erros.append(f"Aluno {item.aluno_id} não encontrado")
                continue
            
            # Verificar se já existe registro
            existing = db.query(models.FrequenciaMensal).filter(
                models.FrequenciaMensal.aluno_id == item.aluno_id,
                models.FrequenciaMensal.mes == data.mes,
                models.FrequenciaMensal.ano == data.ano
            ).first()
            
            if existing:
                # Atualizar
                existing.frequencia = item.frequencia
                existing.faltas_justificadas = item.faltas_justificadas
                existing.faltas_nao_justificadas = item.faltas_nao_justificadas
                existing.total_aulas_mes = item.total_aulas_mes
                existing.observacoes = data.observacoes or existing.observacoes
                
                # Atualizar frequência atual do aluno
                aluno.frequencia = item.frequencia
                
                print(f"✅ Frequência atualizada: {item.aluno_id} - {data.mes}/{data.ano} = {item.frequencia}%")
            else:
                # Criar
                frequencia = models.FrequenciaMensal(
                    aluno_id=item.aluno_id,
                    mes=data.mes,
                    ano=data.ano,
                    frequencia=item.frequencia,
                    faltas_justificadas=item.faltas_justificadas,
                    faltas_nao_justificadas=item.faltas_nao_justificadas,
                    total_aulas_mes=item.total_aulas_mes,
                    observacoes=data.observacoes
                )
                db.add(frequencia)
                
                # Atualizar frequência atual do aluno
                aluno.frequencia = item.frequencia
                
                print(f"✅ Frequência criada: {item.aluno_id} - {data.mes}/{data.ano} = {item.frequencia}%")
            
            registros_criados += 1
            
        except Exception as e:
            erros.append(f"Erro ao processar aluno {item.aluno_id}: {str(e)}")
            print(f"❌ {erros[-1]}")
    
    db.commit()
    
    mensagem = f"{registros_criados} registro(s) criado(s) com sucesso!"
    if erros:
        mensagem += f" {len(erros)} erro(s)."
    
    return {
        "registros_criados": registros_criados,
        "mes": data.mes,
        "ano": data.ano,
        "mensagem": mensagem
    }

@app.post("/alunos/{matricula}/frequencia", response_model=schemas.FrequenciaMensalResponse)
def registrar_frequencia_mensal(
    matricula: str,
    frequencia_data: schemas.FrequenciaMensalCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Registrar frequência mensal de um aluno"""
    
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == matricula
    ).first()
    
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )
    
    # Verificar se já existe registro para este mês/ano
    existing = db.query(models.FrequenciaMensal).filter(
        models.FrequenciaMensal.aluno_id == matricula,
        models.FrequenciaMensal.mes == frequencia_data.mes,
        models.FrequenciaMensal.ano == frequencia_data.ano
    ).first()
    
    if existing:
        # Atualizar registro existente
        existing.frequencia = frequencia_data.frequencia
        existing.faltas_justificadas = frequencia_data.faltas_justificadas
        existing.faltas_nao_justificadas = frequencia_data.faltas_nao_justificadas
        existing.total_aulas_mes = frequencia_data.total_aulas_mes
        existing.observacoes = frequencia_data.observacoes
        
        db.commit()
        db.refresh(existing)
        
        return existing
    else:
        # Criar novo registro
        db_frequencia = models.FrequenciaMensal(
            aluno_id=matricula,
            **frequencia_data.model_dump()
        )
        
        db.add(db_frequencia)
        db.commit()
        db.refresh(db_frequencia)
        
        return db_frequencia

@app.get("/alunos/{matricula}/frequencia-historico", response_model=List[schemas.FrequenciaMensalResponse])
def get_historico_frequencia(
    matricula: str,
    meses: int = 4,  # ✅ Padrão: 4 meses (ideal para evasão)
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Obter histórico de frequência dos últimos meses.
    Padrão: 4 meses (ideal para detecção de evasão)
    """
    from sqlalchemy import desc
    
    historico = db.query(models.FrequenciaMensal).filter(
        models.FrequenciaMensal.aluno_id == matricula
    ).order_by(
        desc(models.FrequenciaMensal.ano),
        desc(models.FrequenciaMensal.mes)
    ).limit(meses).all()
    
    # Retornar em ordem cronológica (mais antigo primeiro)
    return list(reversed(historico))

@app.get("/alunos/{matricula}/frequencia-tendencia")
def get_tendencia_frequencia(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Calcular tendência de frequência (últimos 4 meses).
    
    Retorna:
    - tendencia: "SUBINDO", "ESTAVEL", "DESCENDO"
    - variacao: diferença em pontos percentuais
    - alerta: True se queda brusca (>10%)
    
    Regras (baseadas em 4 meses):
    - Compara último mês com média dos 3 anteriores
    - Alerta se queda > 10%
    """
    
    from sqlalchemy import desc

    # Buscar últimos 4 meses
    historico = db.query(models.FrequenciaMensal).filter(
        models.FrequenciaMensal.aluno_id == matricula
    ).order_by(
        desc(models.FrequenciaMensal.ano),
        desc(models.FrequenciaMensal.mes)
    ).limit(4).all()
    
    # Precisa de pelo menos 2 meses para calcular tendência
    if not historico or len(historico) < 2:
        return {
            "tendencia": "INSUFICIENTE",
            "variacao": 0,
            "alerta": False,
            "mensagem": "Dados insuficientes para calcular tendência (mínimo 2 meses)"
        }
    
    # Calcular média dos últimos 3 meses vs. anteriores
    # Com 4 meses: compara mês 4 com média dos meses 1-3
    if len(historico) >= 4:
        recentes = historico[:1]  # Mês mais recente (mês 4)
        antigas = historico[1:4]  # 3 meses anteriores (meses 1-3)
    else:
        # Com 2-3 meses: compara último com média dos anteriores
        recentes = historico[:1]
        antigas = historico[1:]
    
    media_recente = sum(f.frequencia for f in recentes) / len(recentes)
    media_antiga = sum(f.frequencia for f in antigas) / len(antigas)
    
    variacao = media_recente - media_antiga
    
    # Classificar tendência (regras para 4 meses)
    if variacao > 5:
        tendencia = "SUBINDO"  # ✅ Melhoria significativa
    elif variacao < -5:
        tendencia = "DESCENDO"  # ⚠️ Queda preocupante
    else:
        tendencia = "ESTAVEL"  # ➡️ Estável
    
    # Alerta de queda brusca (>10% em 4 meses)
    alerta = variacao < -10
    
    return {
        "tendencia": tendencia,
        "variacao": round(variacao, 2),
        "alerta": alerta,
        "media_recente": round(media_recente, 2),
        "media_antiga": round(media_antiga, 2),
        "mensagem": f"Frequência {tendencia.lower()} {abs(variacao):.1f}%"
    }

# ============================================
# ENDPOINTS - PREDIÇÕES EM LOTE
# ============================================

@app.post("/predicoes/gerar-todas")
def gerar_predicoes_em_lote(
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """
    Gerar predições para todos os alunos sem predição.
    Útil após importação de CSV ou para corrigir dados.
    Apenas ADMIN pode executar.
    """
    from ml_logic_v2 import calcular_risco_evasao as calcular_risco_v2
    
    # Buscar alunos SEM predição
    alunos_com_predicao = db.query(
        models.Predicao.aluno_id
    ).distinct().subquery()
    
    alunos_sem_predicao = db.query(models.Aluno).filter(
        ~models.Aluno.matricula.in_(alunos_com_predicao)
    ).all()
    
    if not alunos_sem_predicao:
        return {
            "message": "Todos os alunos já possuem predições!",
            "alunos_processados": 0
        }
    
    predicoes_geradas = 0
    erros = 0
    
    for aluno in alunos_sem_predicao:
        try:
            resultado = calcular_risco_v2(aluno, db)
            
            predicao = models.Predicao(
                aluno_id=aluno.matricula,
                risco_evasao=resultado['risco_evasao'],
                nivel_risco=resultado['nivel_risco'],
                fatores_principais=resultado['fatores_principais'],
                modelo_ml_versao='1.0.0'
            )
            db.add(predicao)
            predicoes_geradas += 1
            
        except Exception as e:
            print(f"⚠️ Erro ao gerar predição para {aluno.matricula}: {e}")
            erros += 1
    
    db.commit()
    
    return {
        "message": f"{predicoes_geradas} predições geradas com sucesso!",
        "alunos_processados": predicoes_geradas,
        "erros": erros,
        "total_alunos_sem_predicao": len(alunos_sem_predicao)
    }

@app.get("/predicoes/resumo")
def get_resumo_predicoes(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Obter resumo das predições"""
    total_alunos = db.query(models.Aluno).count()
    
    # Subquery para última predição
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
    
    # Contar por nível
    alunos_com_predicao = ultimas_predicoes.count()
    risco_alto = ultimas_predicoes.filter(models.Predicao.nivel_risco == 'ALTO').count()
    risco_medio = ultimas_predicoes.filter(models.Predicao.nivel_risco == 'MEDIO').count()
    risco_baixo = ultimas_predicoes.filter(models.Predicao.nivel_risco == 'BAIXO').count()
    sem_predicao = total_alunos - alunos_com_predicao
    
    return {
        "total_alunos": total_alunos,
        "alunos_com_predicao": alunos_com_predicao,
        "alunos_sem_predicao": sem_predicao,
        "risco_alto": risco_alto,
        "risco_medio": risco_medio,
        "risco_baixo": risco_baixo,
        "percentual_com_predicao": round((alunos_com_predicao / total_alunos * 100), 2) if total_alunos > 0 else 0
    }

# ============================================
# ENDPOINTS - DASHBOARD
# ============================================

@app.get("/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Obter estatísticas do dashboard"""
    # Query base
    query = db.query(models.Aluno)
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)
    
    total = query.count()
    
    # Contar por nível de risco (última predição)
    from sqlalchemy import func
    
    # Subquery para pegar última predição de cada aluno
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
    
    # Filtrar por curso se necessário
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        ultimas_predicoes = ultimas_predicoes.join(models.Aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )
    
    risco_alto = ultimas_predicoes.filter(
        models.Predicao.nivel_risco == models.NivelRisco.ALTO
    ).count()

    risco_medio = ultimas_predicoes.filter(
        models.Predicao.nivel_risco == models.NivelRisco.MEDIO
    ).count()

    risco_muito_alto = ultimas_predicoes.filter(
        models.Predicao.nivel_risco == models.NivelRisco.MUITO_ALTO
    ).count()

    risco_baixo = total - risco_alto - risco_medio - risco_muito_alto
    
    # Média geral
    media_result = query.with_entities(func.avg(models.Aluno.media_geral)).scalar()
    media_geral = float(media_result) if media_result else 0.0
    
    # Intervenções ativas
    intervencoes_ativas = db.query(models.Intervencao).filter(
        models.Intervencao.status.in_([
            models.StatusIntervencao.PENDENTE,
            models.StatusIntervencao.EM_ANDAMENTO
        ])
    ).count()
    
    return {
        "total_alunos": total,
        "risco_muito_alto": risco_muito_alto,
        "risco_alto": risco_alto,
        "risco_medio": risco_medio,
        "risco_baixo": risco_baixo,
        "media_geral_campus": round(media_geral, 2),
        "intervencoes_ativas": intervencoes_ativas
    }

# ============================================
# ENDPOINTS - INTERVENÇÕES
# ============================================

@app.get("/alunos/{matricula}/intervencoes", response_model=List[schemas.IntervencaoResponse])
def list_intervencoes_by_aluno(
    matricula: str,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Listar intervenções de um aluno específico.
    
    Filtros disponíveis:
    - status: Filtrar por status (PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA)
    """
    from sqlalchemy.orm import joinedload
    
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )
    
    # Query base
    query = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno),
        joinedload(models.Intervencao.usuario)
    ).filter(
        models.Intervencao.aluno_id == matricula
    )
    
    # Filtrar por status se fornecido
    if status:
        query = query.filter(models.Intervencao.status == status)
    
    # Ordenar por data (mais recente primeiro)
    intervencoes = query.order_by(models.Intervencao.data_intervencao.desc()).all()
    
    return intervencoes


@app.get("/intervencoes/sugestoes-pendentes")
def listar_sugestoes_pendentes(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Lista rascunhos de intervenções auto-geradas pendentes de aprovação."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno),
        joinedload(models.Intervencao.usuario)
    ).filter(
        models.Intervencao.status == models.StatusIntervencao.RASCUNHO
    )
    
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.Intervencao.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )
    
    return query.order_by(models.Intervencao.criado_at.desc()).all()


@app.post("/intervencoes/{intervencao_id}/aprovar")
def aprovar_intervencao(
    intervencao_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Aprova um rascunho de intervenção, atribuindo ao usuário atual e definindo o ciclo de 6 meses."""
    from dateutil.relativedelta import relativedelta

    intervencao = db.query(models.Intervencao).filter(
        models.Intervencao.id == intervencao_id
    ).first()

    if not intervencao:
        raise HTTPException(status_code=404, detail="Intervenção não encontrada")

    if intervencao.status != models.StatusIntervencao.RASCUNHO:
        raise HTTPException(status_code=400, detail="Apenas rascunhos podem ser aprovados")

    hoje = datetime.now().date()
    
    # Atualiza status e responsáveis
    intervencao.status = models.StatusIntervencao.PENDENTE
    intervencao.usuario_id = current_user.id
    intervencao.data_aprovacao = hoje
    intervencao.auto_gerada = True
    
    # Define o ciclo de intervenção: 6 meses a partir de hoje
    intervencao.data_limite = hoje + relativedelta(months=6)

    db.commit()
    db.refresh(intervencao)

    return {
        "message": "Intervenção aprovada com sucesso",
        "id": intervencao.id,
        "ciclo_inicio": str(intervencao.data_aprovacao),
        "ciclo_fim": str(intervencao.data_limite)
    }


@app.post("/intervencoes/{intervencao_id}/rejeitar")
def rejeitar_intervencao(
    intervencao_id: int,
    motivo: str = "",
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Rejeita um rascunho de intervenção."""
    intervencao = db.query(models.Intervencao).filter(
        models.Intervencao.id == intervencao_id
    ).first()
    
    if not intervencao:
        raise HTTPException(status_code=404, detail="Intervenção não encontrada")
    
    if intervencao.status != models.StatusIntervencao.RASCUNHO:
        raise HTTPException(status_code=400, detail="Apenas rascunhos podem ser rejeitados")
    
    intervencao.status = models.StatusIntervencao.CANCELADA
    intervencao.data_rejeicao = datetime.now().date()
    intervencao.motivo_rejeicao = motivo
    
    db.commit()
    
    return {"message": "Intervenção rejeitada"}


@app.get("/intervencoes/gerar-sugestoes")
def gerar_sugestoes_automaticas(
    nivel_risco: str = "ALTO",  # Parâmetro para definir qual risco buscar (ALTO ou MEDIO)
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Gera rascunhos de intervenção para alunos com risco específico.
    Padrão: ALTO/MUITO_ALTO. Se nivel_risco='MEDIO', busca risco MÉDIO.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func

    # 1. Buscar alunos com risco definido
    subq_pred = db.query(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number().over(
            partition_by=models.Predicao.aluno_id,
            order_by=models.Predicao.data_predicao.desc()
        ).label('rn')
    ).subquery()

    # Lógica de filtro baseada no parâmetro
    niveis_alvo = ['MEDIO'] if nivel_risco.upper() == 'MEDIO' else ['ALTO', 'MUITO_ALTO']

    alunos_risco = db.query(subq_pred).filter(
        subq_pred.c.nivel_risco.in_(niveis_alvo),
        subq_pred.c.rn == 1
    ).all()

    if not alunos_risco:
        return {"message": f"Nenhum aluno com risco {nivel_risco} encontrado", "sugestoes_geradas": 0}
    
    # 2. Alunos que já têm intervenção ativa ou rascunho
    alunos_com_intervencao = db.query(models.Intervencao.aluno_id).filter(
        models.Intervencao.status.in_(['PENDENTE', 'EM_ANDAMENTO', 'RASCUNHO'])
    ).distinct().all()
    matriculas_com_intervencao = set(a.aluno_id for a in alunos_com_intervencao)
    
    # 3. Gerar rascunhos
    sugestoes_geradas = 0
    
    for p in alunos_risco:
        if p.aluno_id in matriculas_com_intervencao:
            continue
        
        aluno = db.query(models.Aluno).filter(models.Aluno.matricula == p.aluno_id).first()
        if not aluno:
            continue
        
        risco = float(p.risco_evasao) if p.risco_evasao else 0
        nivel = p.nivel_risco

        # Determinar tipo de intervenção baseado no perfil
        tipo = "Acompanhamento Pedagógico"
        descricao = ""
        prioridade = "ALTA"

        if nivel == "MUITO_ALTO" or risco >= 80:
            tipo = "Reunião com Responsáveis"
            prioridade = "URGENTE"
            descricao = f"Aluno em risco crítico ({risco:.0f}%). Necessária reunião urgente com família."
        elif nivel == "ALTO" and risco >= 60:
            tipo = "Acompanhamento Pedagógico"
            prioridade = "ALTA"
            descricao = f"Risco elevado ({risco:.0f}%). Monitoramento próximo necessário."
        elif nivel == "MEDIO":
            # Lógica específica para Monitoramento Preventivo (Risco Médio)
            prioridade = "MEDIA"
            if aluno.frequencia and float(aluno.frequencia) < 75:
                tipo = "Orientação Pedagógica"
                descricao = f"Frequência em atenção ({aluno.frequencia}%). Reforçar importância da presença."
            elif aluno.trabalha:
                tipo = "Apoio Social"
                descricao = f"Aluno trabalhador. Verificar conciliação estudo/trabalho."
            else:
                tipo = "Acompanhamento Preventivo"
                descricao = f"Risco médio identificado ({risco:.0f}%). Manter monitoramento."
        elif aluno.frequencia and float(aluno.frequencia) < 60:
            tipo = "Reunião com Aluno"
            descricao = f"Frequência crítica ({aluno.frequencia}%). Conversar sobre permanência."
        elif aluno.frequencia and float(aluno.frequencia) < 75:
            tipo = "Acompanhamento Pedagógico"
            descricao = f"Frequência baixa ({aluno.frequencia}%)+média {aluno.media_geral}. Plano de recuperação sugerido."
        elif aluno.media_geral and float(aluno.media_geral) < 5:
            tipo = "Reforço Escolar"
            descricao = f"Média crítica ({aluno.media_geral}). Encaminhar para reforço."
        elif aluno.trabalha:
            tipo = "Orientação Profissional"
            descricao = f"Aluno trabalha + risco {risco:.0f}%. Avaliar conciliação estudo/trabalho."
        else:
            descricao = f"Aluno em risco {nivel} ({risco:.0f}%). Avaliação pedagógica necessária."
        
        # Criar rascunho
        rascunho = models.Intervencao(
            aluno_id=aluno.matricula,
            usuario_id=None,  # Sem responsável ainda
            data_intervencao=datetime.now().date(),
            tipo=tipo,
            descricao=descricao,
            status=models.StatusIntervencao.RASCUNHO,
            prioridade=prioridade,
            auto_gerada=True,
            motivo_risco=f'{{"nivel":"{nivel}","score":{risco:.0f},"fatores":"{aluno.frequencia}% freq, {aluno.media_geral} media"}}'
        )
        
        db.add(rascunho)
        sugestoes_geradas += 1
        matriculas_com_intervencao.add(aluno.matricula)
    
    db.commit()
    
    return {
        "message": f"{sugestoes_geradas} sugestões geradas",
        "sugestoes_geradas": sugestoes_geradas
    }


@app.get("/intervencoes", response_model=List[schemas.IntervencaoResponse])
def list_all_intervencoes(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Listar todas as intervenções do sistema (com filtros).
    
    Filtros disponíveis:
    - status: Filtrar por status (PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA)
    - curso_id: Filtrar por curso (apenas ADMIN ou COORDENADOR)
    
    Para COORDENADOR/PEDAGOGO, filtra automaticamente pelo curso do usuário.
    """
    from sqlalchemy.orm import joinedload
    
    # Query base com joins
    query = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno).joinedload(models.Aluno.curso),
        joinedload(models.Intervencao.usuario)
    )
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.Intervencao.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )
    
    # Filtro adicional por curso
    if curso_id and current_user.role.nome == "ADMIN":
        query = query.join(models.Intervencao.aluno).filter(
            models.Aluno.curso_id == curso_id
        )
    
    # Filtrar por status se fornecido
    if status:
        query = query.filter(models.Intervencao.status == status)
    
    # Ordenar por data (mais recente primeiro)
    intervencoes = query.order_by(models.Intervencao.data_intervencao.desc()).offset(skip).limit(limit).all()
    
    return intervencoes


@app.get("/intervencoes/{intervencao_id}", response_model=schemas.IntervencaoResponse)
def get_intervencao(
    intervencao_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Obter intervenção por ID"""
    from sqlalchemy.orm import joinedload
    
    intervencao = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno),
        joinedload(models.Intervencao.usuario)
    ).filter(models.Intervencao.id == intervencao_id).first()
    
    if not intervencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervenção não encontrada"
        )
    
    # Verificar permissão (apenas ADMIN ou mesmo curso)
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        if intervencao.aluno.curso_id != current_user.curso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para visualizar esta intervenção"
            )
    
    return intervencao


@app.post("/alunos/{matricula}/intervencoes", response_model=schemas.IntervencaoResponse)
def create_intervencao(
    matricula: str,
    intervencao: schemas.IntervencaoCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Criar nova intervenção para um aluno.
    
    A intervenção é registrada automaticamente com o usuário atual.
    """
    from sqlalchemy.orm import joinedload
    
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).options(
        joinedload(models.Aluno.curso)
    ).filter(models.Aluno.matricula == matricula).first()
    
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )
    
    # Verificar permissão (apenas ADMIN ou mesmo curso)
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        if aluno.curso_id != current_user.curso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para criar intervenção para este aluno"
            )
    
    # Calcular ciclo de 6 meses
    from dateutil.relativedelta import relativedelta
    hoje = datetime.now().date()
    data_limite = hoje + relativedelta(months=6)

    # Criar intervenção com ciclo automático
    db_intervencao = models.Intervencao(
        **intervencao.model_dump(),
        aluno_id=matricula,
        usuario_id=current_user.id,  # Usa o ID do usuário autenticado
        data_limite=data_limite       # Define o prazo de 6 meses
    )
    
    db.add(db_intervencao)
    db.commit()
    db.refresh(db_intervencao)
    
    # Recarregar com relacionamentos
    db_intervencao = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno),
        joinedload(models.Intervencao.usuario)
    ).filter(models.Intervencao.id == db_intervencao.id).first()
    
    # Log de auditoria
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao="CRIAR_INTERVENCAO",
        detalhes=f"Intervenção criada para aluno {matricula} ({aluno.nome})",
        ip_address=None
    )
    db.add(audit_log)
    db.commit()
    
    return db_intervencao


@app.put("/intervencoes/{intervencao_id}", response_model=schemas.IntervencaoResponse)
def update_intervencao(
    intervencao_id: int,
    intervencao_update: schemas.IntervencaoUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Atualizar intervenção existente.
    
    Permite atualizar status, descrição, observações e data de conclusão.
    """
    from sqlalchemy.orm import joinedload
    
    db_intervencao = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno),
        joinedload(models.Intervencao.usuario)
    ).filter(models.Intervencao.id == intervencao_id).first()
    
    if not db_intervencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervenção não encontrada"
        )
    
    # Verificar permissão
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        if db_intervencao.aluno.curso_id != current_user.curso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para atualizar esta intervenção"
            )
    
    # Atualizar campos
    update_data = intervencao_update.model_dump(exclude_unset=True)
    
    # Auto-set data_conclusao se status for CONCLUIDA
    if update_data.get('status') == 'CONCLUIDA' and not db_intervencao.data_conclusao:
        from datetime import date
        update_data['data_conclusao'] = date.today()
    
    for key, value in update_data.items():
        setattr(db_intervencao, key, value)
    
    db.commit()
    db.refresh(db_intervencao)
    
    # Recarregar com relacionamentos
    db_intervencao = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno),
        joinedload(models.Intervencao.usuario)
    ).filter(models.Intervencao.id == db_intervencao.id).first()
    
    # Log de auditoria
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao="ATUALIZAR_INTERVENCAO",
        detalhes=f"Intervenção {intervencao_id} atualizada para aluno {db_intervencao.aluno_id}",
        ip_address=None
    )
    db.add(audit_log)
    db.commit()
    
    return db_intervencao


@app.delete("/intervencoes/{intervencao_id}")
def delete_intervencao(
    intervencao_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """
    Excluir intervenção (APENAS ADMIN).
    """
    db_intervencao = db.query(models.Intervencao).filter(
        models.Intervencao.id == intervencao_id
    ).first()
    
    if not db_intervencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervenção não encontrada"
        )
    
    db.delete(db_intervencao)
    db.commit()
    
    # Log de auditoria
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao="EXCLUIR_INTERVENCAO",
        detalhes=f"Intervenção {intervencao_id} excluída",
        ip_address=None
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Intervenção excluída com sucesso"}


@app.get("/dashboard/intervencoes-stats")
def get_intervencoes_stats(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Obter estatísticas de intervenções para dashboard.
    """
    from sqlalchemy import func
    
    # Query base
    query = db.query(models.Intervencao)
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.Intervencao.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )
    
    # Contar por status
    pendentes = query.filter(models.Intervencao.status == models.StatusIntervencao.PENDENTE).count()
    em_andamento = query.filter(models.Intervencao.status == models.StatusIntervencao.EM_ANDAMENTO).count()
    concluidas = query.filter(models.Intervencao.status == models.StatusIntervencao.CONCLUIDA).count()
    canceladas = query.filter(models.Intervencao.status == models.StatusIntervencao.CANCELADA).count()
    
    # Contar por prioridade
    urgentes = query.filter(models.Intervencao.prioridade == 'URGENTE').count()
    altas = query.filter(models.Intervencao.prioridade == 'ALTA').count()
    
    # Total ativas
    ativas = pendentes + em_andamento
    
    # Taxa de conclusão
    total = pendentes + em_andamento + concluidas + canceladas
    taxa_conclusao = round((concluidas / total * 100), 1) if total > 0 else 0
    
    return {
        "total": total,
        "ativas": ativas,
        "pendentes": pendentes,
        "em_andamento": em_andamento,
        "concluidas": concluidas,
        "canceladas": canceladas,
        "urgentes": urgentes,
        "altas": altas,
        "taxa_conclusao": taxa_conclusao
    }


# ============================================
# ENDPOINTS - RELATÓRIOS DE EFICÁCIA
# ============================================

@app.get("/relatorios/eficacia")
def get_relatorio_eficacia(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Relatório de eficácia das intervenções.
    
    Mostra:
    - Total de intervenções por tipo
    - Taxa de conclusão por tipo
    - Tempo médio de resolução
    - Alunos recuperados vs evadidos
    - Impacto das intervenções no risco de evasão
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func, distinct
    
    # Definir período (últimos 6 meses se não especificado)
    if not start_date:
        end = datetime.now()
        start = end - timedelta(days=180)
        start_date = start.strftime('%Y-%m-%d')
        end_date = end.strftime('%Y-%m-%d')
    
    # Query base de intervenções
    query = db.query(models.Intervencao).join(models.Intervencao.aluno)
    
    # Filtrar por período
    query = query.filter(
        models.Intervencao.data_intervencao >= start_date,
        models.Intervencao.data_intervencao <= end_date
    )
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)
    
    # Filtrar por curso específico
    if curso_id and current_user.role.nome == "ADMIN":
        query = query.filter(models.Aluno.curso_id == curso_id)
    
    # Total de intervenções
    total_intervencoes = query.count()
    
    # Contar por status
    concluidas = query.filter(models.Intervencao.status == models.StatusIntervencao.CONCLUIDA).count()
    canceladas = query.filter(models.Intervencao.status == models.StatusIntervencao.CANCELADA).count()
    pendentes = query.filter(models.Intervencao.status == models.StatusIntervencao.PENDENTE).count()
    em_andamento = query.filter(models.Intervencao.status == models.StatusIntervencao.EM_ANDAMENTO).count()
    
    # Taxa de conclusão geral
    taxa_conclusao_geral = round((concluidas / total_intervencoes * 100), 1) if total_intervencoes > 0 else 0
    
    # Contar por tipo
    intervencoes_por_tipo = db.query(
        models.Intervencao.tipo,
        func.count(models.Intervencao.id).label('total'),
        func.sum(func.if_(models.Intervencao.status == 'CONCLUIDA', 1, 0)).label('concluidas')
    ).filter(
        models.Intervencao.data_intervencao >= start_date,
        models.Intervencao.data_intervencao <= end_date
    ).group_by(models.Intervencao.tipo).all()
    
    # Tempo médio de resolução (dias)
    tempo_medio_result = db.query(
        func.avg(
            func.datediff(models.Intervencao.data_conclusao, models.Intervencao.data_intervencao)
        )
    ).filter(
        models.Intervencao.status == models.StatusIntervencao.CONCLUIDA,
        models.Intervencao.data_conclusao != None
    ).scalar()
    
    tempo_medio_resolucao = round(float(tempo_medio_result), 1) if tempo_medio_result else None
    
    # Alunos atendidos (únicos)
    alunos_atendidos = query.distinct(models.Intervencao.aluno_id).count()
    
    # Intervenções por prioridade
    intervencoes_por_prioridade = db.query(
        models.Intervencao.prioridade,
        func.count(models.Intervencao.id).label('total')
    ).filter(
        models.Intervencao.data_intervencao >= start_date,
        models.Intervencao.data_intervencao <= end_date
    ).group_by(models.Intervencao.prioridade).all()
    
    # Top 5 tipos de intervenção mais comuns
    top_tipos = sorted(
        [{'tipo': t.tipo, 'total': t.total, 'concluidas': t.concluidas, 
          'taxa_conclusao': round((t.concluidas / t.total * 100), 1) if t.total > 0 else 0} 
         for t in intervencoes_por_tipo],
        key=lambda x: x['total'],
        reverse=True
    )[:5]
    
    # Distribuição por prioridade
    distribuicao_prioridade = {
        p.prioridade: p.total for p in intervencoes_por_prioridade
    }
    
    return {
        "periodo": {
            "inicio": start_date,
            "fim": end_date
        },
        "resumo": {
            "total_intervencoes": total_intervencoes,
            "alunos_atendidos": alunos_atendidos,
            "concluidas": concluidas,
            "canceladas": canceladas,
            "pendentes": pendentes,
            "em_andamento": em_andamento,
            "taxa_conclusao_geral": taxa_conclusao_geral,
            "tempo_medio_resolucao_dias": tempo_medio_resolucao
        },
        "top_tipos": top_tipos,
        "distribuicao_prioridade": distribuicao_prioridade
    }


@app.get("/relatorios/alunos-recuperados")
def get_relatorio_alunos_recuperados(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Relatório de alunos recuperados após intervenções.
    
    Considera-se "recuperado" o aluno que:
    - Tinha risco ALTO/MEDIO
    - Recebeu intervenção
    - Atualmente tem risco BAIXO ou reduziu significativamente o score
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Definir período (últimos 6 meses se não especificado)
    if not start_date:
        end = datetime.now()
        start = end - timedelta(days=180)
        start_date = start.strftime('%Y-%m-%d')
        end_date = end.strftime('%Y-%m-%d')
    
    # Subquery para pegar primeira predição antes da intervenção
    subq_primeira = db.query(
        models.Predicao.aluno_id,
        func.min(models.Predicao.data_predicao).label('primeira_data')
    ).filter(
        models.Predicao.data_predicao <= end_date
    ).group_by(models.Predicao.aluno_id).subquery()
    
    # Subquery para pegar última predição
    subq_ultima = db.query(
        models.Predicao.aluno_id,
        func.max(models.Predicao.data_predicao).label('ultima_data')
    ).group_by(models.Predicao.aluno_id).subquery()
    
    # Alunos com intervenções no período
    alunos_com_intervencao = db.query(
        models.Intervencao.aluno_id
    ).filter(
        models.Intervencao.data_intervencao >= start_date,
        models.Intervencao.data_intervencao <= end_date
    ).distinct().all()
    
    alunos_matriculas = [a.aluno_id for a in alunos_com_intervencao]
    
    # Para cada aluno, comparar evolução do risco
    alunos_recuperados = []
    alunos_com_piora = []
    
    for matricula in alunos_matriculas:
        # Predição mais antiga
        predicao_antiga = db.query(models.Predicao).join(
            subq_primeira,
            models.Predicao.aluno_id == subq_primeira.c.aluno_id
        ).filter(
            models.Predicao.aluno_id == matricula,
            models.Predicao.data_predicao == subq_primeira.c.primeira_data
        ).first()
        
        # Predição mais recente
        predicao_recente = db.query(models.Predicao).join(
            subq_ultima,
            models.Predicao.aluno_id == subq_ultima.c.aluno_id
        ).filter(
            models.Predicao.aluno_id == matricula,
            models.Predicao.data_predicao == subq_ultima.c.ultima_data
        ).first()
        
        if predicao_antiga and predicao_recente:
            evolucao = {
                "matricula": matricula,
                "nome": predicao_recente.aluno.nome if predicao_recente.aluno else matricula,
                "curso": predicao_recente.aluno.curso.nome if predicao_recente.aluno and predicao_recente.aluno.curso else "N/A",
                "risco_inicial": predicao_antiga.risco_evasao,
                "risco_final": predicao_recente.risco_evasao,
                "nivel_inicial": predicao_antiga.nivel_risco,
                "nivel_final": predicao_recente.nivel_risco,
                "variacao": float(predicao_recente.risco_evasao) - float(predicao_antiga.risco_evasao)
            }
            
            # Melhorou significativamente (redução > 20% ou mudou de nível)
            if evolucao["variacao"] < -20 or (
                evolucao["nivel_inicial"] == "ALTO" and evolucao["nivel_final"] == "BAIXO"
            ):
                alunos_recuperados.append(evolucao)
            # Piorou
            elif evolucao["variacao"] > 20:
                alunos_com_piora.append(evolucao)
    
    # Estatísticas
    total_alunos = len(alunos_matriculas)
    taxa_recuperacao = round((len(alunos_recuperados) / total_alunos * 100), 1) if total_alunos > 0 else 0
    taxa_piora = round((len(alunos_com_piora) / total_alunos * 100), 1) if total_alunos > 0 else 0
    
    return {
        "periodo": {
            "inicio": start_date,
            "fim": end_date
        },
        "estatisticas": {
            "total_alunos_atendidos": total_alunos,
            "alunos_recuperados": len(alunos_recuperados),
            "alunos_com_piora": len(alunos_com_piora),
            "taxa_recuperacao": taxa_recuperacao,
            "taxa_piora": taxa_piora
        },
        "alunos_recuperados": alunos_recuperados[:10],  # Top 10
        "alunos_com_piora": alunos_com_piora[:10]  # Top 10
    }


# ============================================
# ENDPOINTS - ANALYTICS DE CORRELAÇÃO
# ============================================

@app.get("/analytics/correlacao-intervencao")
def get_correlacao_intervencao(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Analytics de correlação entre tipo de intervenção e resultado.
    
    Mostra quais tipos de intervenção têm maior taxa de sucesso
    na redução do risco de evasão.
    """
    from sqlalchemy import func, avg
    
    # Buscar todas as intervenções concluídas com seus alunos
    intervencoes = db.query(models.Intervencao).join(
        models.Aluno, models.Intervencao.aluno_id == models.Aluno.matricula
    ).filter(
        models.Intervencao.status == models.StatusIntervencao.CONCLUIDA
    ).all()
    
    # Agrupar por tipo de intervenção
    resultados_por_tipo = {}
    
    for intervencao in intervencoes:
        tipo = intervencao.tipo
        
        # Buscar evolução do risco do aluno
        predicoes = db.query(models.Predicao).filter(
            models.Predicao.aluno_id == intervencao.aluno_id
        ).order_by(models.Predicao.data_predicao).all()
        
        if len(predicoes) >= 2:
            risco_inicial = float(predicoes[0].risco_evasao)
            risco_final = float(predicoes[-1].risco_evasao)
            variacao = risco_final - risco_inicial
            
            if tipo not in resultados_por_tipo:
                resultados_por_tipo[tipo] = {
                    'total': 0,
                    'variacao_total': 0,
                    'sucessos': 0,  # Redução > 10%
                    'falhas': 0,    # Aumento ou redução < 5%
                    'neutros': 0    # Redução 5-10%
                }
            
            resultados_por_tipo[tipo]['total'] += 1
            resultados_por_tipo[tipo]['variacao_total'] += variacao
            
            if variacao < -10:
                resultados_por_tipo[tipo]['sucessos'] += 1
            elif variacao > 5:
                resultados_por_tipo[tipo]['falhas'] += 1
            else:
                resultados_por_tipo[tipo]['neutros'] += 1
    
    # Calcular médias e taxas
    correlacao = []
    for tipo, dados in resultados_por_tipo.items():
        if dados['total'] > 0:
            correlacao.append({
                'tipo': tipo,
                'total_intervencoes': dados['total'],
                'variacao_media_risco': round(dados['variacao_total'] / dados['total'], 2),
                'taxa_sucesso': round((dados['sucessos'] / dados['total']) * 100, 1),
                'taxa_falha': round((dados['falhas'] / dados['total']) * 100, 1),
                'sucessos': dados['sucessos'],
                'falhas': dados['falhas'],
                'neutros': dados['neutros']
            })
    
    # Ordenar por taxa de sucesso
    correlacao.sort(key=lambda x: x['taxa_sucesso'], reverse=True)
    
    return {
        'correlacao': correlacao,
        'total_intervencoes_analisadas': sum(d['total'] for d in resultados_por_tipo.values()),
        'recomendacoes': [
            {
                'tipo': item['tipo'],
                'recomendacao': f"Alta eficácia ({item['taxa_sucesso']}% de sucesso). Recomenda-se priorizar este tipo de intervenção.",
                'prioridade': 'ALTA' if item['taxa_sucesso'] >= 70 else 'MEDIA' if item['taxa_sucesso'] >= 50 else 'BAIXA'
            }
            for item in correlacao[:3]  # Top 3
        ] if correlacao else []
    }


@app.get("/analytics/alertas-recuperacao")
def get_alertas_recuperacao(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Alertas de queda na taxa de recuperação.
    
    Compara a taxa de recuperação atual com períodos anteriores
    e gera alertas quando há queda significativa.
    """
    from datetime import datetime, timedelta
    
    now = datetime.now()
    
    # Período atual (últimos 30 dias)
    periodo_atual_inicio = (now - timedelta(days=30)).strftime('%Y-%m-%d')
    periodo_atual_fim = now.strftime('%Y-%m-%d')
    
    # Período anterior (30 dias antes do período atual)
    periodo_anterior_inicio = (now - timedelta(days=60)).strftime('%Y-%m-%d')
    periodo_anterior_fim = (now - timedelta(days=30)).strftime('%Y-%m-%d')
    
    # Calcular taxa de recuperação do período atual
    alunos_periodo_atual = db.query(models.Intervencao.aluno_id).filter(
        models.Intervencao.data_intervencao >= periodo_atual_inicio,
        models.Intervencao.data_intervencao <= periodo_atual_fim
    ).distinct().all()
    
    recuperados_atual = 0
    for aluno_data in alunos_periodo_atual:
        matricula = aluno_data.aluno_id
        predicoes = db.query(models.Predicao).filter(
            models.Predicao.aluno_id == matricula
        ).order_by(models.Predicao.data_predicao.desc()).limit(2).all()
        
        if len(predicoes) >= 2:
            variacao = float(predicoes[0].risco_evasao) - float(predicoes[1].risco_evasao)
            if variacao < -20:  # Melhorou > 20%
                recuperados_atual += 1
    
    taxa_atual = (recuperados_atual / len(alunos_periodo_atual) * 100) if alunos_periodo_atual else 0
    
    # Calcular taxa de recuperação do período anterior
    alunos_periodo_anterior = db.query(models.Intervencao.aluno_id).filter(
        models.Intervencao.data_intervencao >= periodo_anterior_inicio,
        models.Intervencao.data_intervencao <= periodo_anterior_fim
    ).distinct().all()
    
    recuperados_anterior = 0
    for aluno_data in alunos_periodo_anterior:
        matricula = aluno_data.aluno_id
        predicoes = db.query(models.Predicao).filter(
            models.Predicao.aluno_id == matricula
        ).order_by(models.Predicao.data_predicao.desc()).limit(2).all()
        
        if len(predicoes) >= 2:
            variacao = float(predicoes[0].risco_evasao) - float(predicoes[1].risco_evasao)
            if variacao < -20:  # Melhorou > 20%
                recuperados_anterior += 1
    
    taxa_anterior = (recuperados_anterior / len(alunos_periodo_anterior) * 100) if alunos_periodo_anterior else 0
    
    # Calcular variação
    variacao_taxa = taxa_atual - taxa_anterior
    
    # Gerar alertas
    alertas = []
    nivel_alerta = 'NORMAL'
    
    if variacao_taxa < -20:
        nivel_alerta = 'CRITICO'
        alertas.append({
            'tipo': 'QUEDA_CRITICA',
            'mensagem': f'Queda crítica de {abs(variacao_taxa):.1f}% na taxa de recuperação!',
            'recomendacao': 'Revisar urgentemente as estratégias de intervenção atuais.',
            'prioridade': 'URGENTE'
        })
    elif variacao_taxa < -10:
        nivel_alerta = 'ATENCAO'
        alertas.append({
            'tipo': 'QUEDA_MODERADA',
            'mensagem': f'Queda de {abs(variacao_taxa):.1f}% na taxa de recuperação.',
            'recomendacao': 'Avaliar eficácia das intervenções e considerar ajustes.',
            'prioridade': 'ALTA'
        })
    elif variacao_taxa < 0:
        nivel_alerta = 'OBSERVACAO'
        alertas.append({
            'tipo': 'QUEDA_LEVE',
            'mensagem': f'Leve queda de {abs(variacao_taxa):.1f}% na taxa de recuperação.',
            'recomendacao': 'Monitorar de perto nos próximos dias.',
            'prioridade': 'MEDIA'
        })
    elif variacao_taxa > 10:
        alertas.append({
            'tipo': 'MELHORIA_SIGNIFICATIVA',
            'mensagem': f'Melhoria de {variacao_taxa:.1f}% na taxa de recuperação!',
            'recomendacao': 'Documentar estratégias bem-sucedidas para replicação.',
            'prioridade': 'BAIXA'
        })
    
    return {
        'nivel_alerta': nivel_alerta,
        'periodo_atual': {
            'inicio': periodo_atual_inicio,
            'fim': periodo_atual_fim,
            'alunos_atendidos': len(alunos_periodo_atual),
            'recuperados': recuperados_atual,
            'taxa': round(taxa_atual, 1)
        },
        'periodo_anterior': {
            'inicio': periodo_anterior_inicio,
            'fim': periodo_anterior_fim,
            'alunos_atendidos': len(alunos_periodo_anterior),
            'recuperados': recuperados_anterior,
            'taxa': round(taxa_anterior, 1)
        },
        'variacao': round(variacao_taxa, 1),
        'alertas': alertas
    }


# ============================================
# ENDPOINTS - INDICADORES DE EFICÁCIA DO SISTEMA
# ============================================

@app.get("/indicadores/eficacia-sistema")
def get_indicadores_eficacia_sistema(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Indicadores completos de eficácia do sistema SAPEE.
    
    Métricas principais:
    1. Alunos em risco recuperados
    2. Taxa de evasão real vs. predita
    3. ROI do sistema (alunos salvos)
    4. Impacto das intervenções
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func, distinct
    
    # Definir período (últimos 6 meses se não especificado)
    if not start_date:
        end = datetime.now()
        start = end - timedelta(days=180)
        start_date = start.strftime('%Y-%m-%d')
        end_date = end.strftime('%Y-%m-%d')
    
    # ==========================================
    # 1. ALUNOS EM RISCO RECUPERADOS
    # ==========================================
    
    # Buscar todos os alunos que tiveram intervenção no período
    alunos_com_intervencao = db.query(
        models.Intervencao.aluno_id
    ).filter(
        models.Intervencao.data_intervencao >= start_date,
        models.Intervencao.data_intervencao <= end_date
    ).distinct().all()
    
    matriculas_intervencao = [a.aluno_id for a in alunos_com_intervencao]
    
    # Para cada aluno, verificar evolução do risco
    alunos_recuperados = []
    alunos_em_acompanhamento = []
    alunos_sem_melhoria = []
    
    for matricula in matriculas_intervencao:
        # Pegar predições do aluno
        predicoes = db.query(models.Predicao).filter(
            models.Predicao.aluno_id == matricula
        ).order_by(models.Predicao.data_predicao).all()
        
        if len(predicoes) >= 2:
            primeira_predicao = predicoes[0]
            ultima_predicao = predicoes[-1]
            
            risco_inicial = float(primeira_predicao.risco_evasao)
            risco_final = float(ultima_predicao.risco_evasao)
            variacao = risco_final - risco_inicial
            
            aluno = db.query(models.Aluno).filter(
                models.Aluno.matricula == matricula
            ).first()
            
            dados_aluno = {
                "matricula": matricula,
                "nome": aluno.nome if aluno else matricula,
                "curso": aluno.curso.nome if aluno and aluno.curso else "N/A",
                "risco_inicial": risco_inicial,
                "risco_final": risco_final,
                "variacao": variacao,
                "nivel_inicial": primeira_predicao.nivel_risco,
                "nivel_final": ultima_predicao.nivel_risco,
                "intervencoes_recebidas": db.query(models.Intervencao).filter(
                    models.Intervencao.aluno_id == matricula
                ).count()
            }
            
            # Classificar
            if variacao < -20 or (
                primeira_predicao.nivel_risco == "ALTO" and 
                ultima_predicao.nivel_risco == "BAIXO"
            ):
                alunos_recuperados.append(dados_aluno)
            elif variacao < 0:
                alunos_em_acompanhamento.append(dados_aluno)
            else:
                alunos_sem_melhoria.append(dados_aluno)
    
    # ==========================================
    # 2. TAXA DE EVASÃO REAL VS. PREDITA
    # ==========================================
    
    # Alunos com risco ALTO no início do período (grupo de risco)
    alunos_risco_alto_inicial = db.query(models.Predicao.aluno_id).join(
        models.Aluno, models.Predicao.aluno_id == models.Aluno.matricula
    ).filter(
        models.Predicao.nivel_risco == "ALTO",
        models.Predicao.data_predicao >= start_date,
        models.Predicao.data_predicao <= end_date
    ).distinct().all()
    
    matriculas_risco_alto = [a.aluno_id for a in alunos_risco_alto_inicial]
    
    # Verificar quantos ainda estão ativos (não evadiram)
    # Consideramos "ativo" se teve frequência registrada nos últimos 30 dias
    from datetime import timedelta
    
    data_limite_frequencia = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    alunos_ativos = db.query(models.FrequenciaMensal.aluno_id).filter(
        models.FrequenciaMensal.aluno_id.in_(matriculas_risco_alto),
        models.FrequenciaMensal.data_registro >= data_limite_frequencia
    ).distinct().all()
    
    matriculas_ativas = [a.aluno_id for a in alunos_ativos]
    
    # Alunos que provavelmente evadiram (não têm frequência recente)
    matriculas_evasao = [m for m in matriculas_risco_alto if m not in matriculas_ativas]
    
    # Calcular taxas
    total_risco_alto = len(matriculas_risco_alto)
    total_ativos = len(matriculas_ativas)
    total_evasao = len(matriculas_evasao)
    
    taxa_evasao_real = (total_evasao / total_risco_alto * 100) if total_risco_alto > 0 else 0
    taxa_retention = (total_ativos / total_risco_alto * 100) if total_risco_alto > 0 else 0
    
    # ==========================================
    # 3. ROI DO SISTEMA (ALUNOS SALVOS)
    # ==========================================
    
    # Estimativa de alunos "salvos" pela intervenção
    # Consideramos "salvos" os alunos recuperados + em acompanhamento
    alunos_salvos = len(alunos_recuperados) + len(alunos_em_acompanhamento)
    
    # Calcular ROI
    # Fórmula: (Alunos Salvos / Total Intervenção) * 100
    roi_sistema = (alunos_salvos / len(matriculas_intervencao) * 100) if matriculas_intervencao else 0
    
    # Estimativa de evasão evitada
    # Base: taxa de evasão histórica sem intervenção (estimada em 40% para risco ALTO)
    taxa_evasao_historica = 0.40  # 40% sem intervenção
    evasao_esperada_sem_intervencao = total_risco_alto * taxa_evasao_historica
    evasao_evitada = evasao_esperada_sem_intervencao - total_evasao
    
    # ==========================================
    # 4. IMPACTO DAS INTERVENÇÕES
    # ==========================================
    
    # Agrupar intervenções por tipo e calcular eficácia
    intervencoes_por_tipo = db.query(
        models.Intervencao.tipo,
        func.count(models.Intervencao.id).label('total')
    ).filter(
        models.Intervencao.data_intervencao >= start_date,
        models.Intervencao.data_intervencao <= end_date
    ).group_by(models.Intervencao.tipo).all()
    
    impacto_por_tipo = []
    for tipo_data in intervencoes_por_tipo:
        # Buscar alunos que receberam este tipo de intervenção
        intervencoes_tipo = db.query(models.Intervencao.aluno_id).filter(
            models.Intervencao.tipo == tipo_data.tipo,
            models.Intervencao.data_intervencao >= start_date,
            models.Intervencao.data_intervencao <= end_date
        ).distinct().all()
        
        matriculas_tipo = [a.aluno_id for a in intervencoes_tipo]
        
        # Calcular média de variação de risco para estes alunos
        variacoes = []
        for matricula in matriculas_tipo:
            predicoes = db.query(models.Predicao).filter(
                models.Predicao.aluno_id == matricula
            ).order_by(models.Predicao.data_predicao).limit(2).all()
            
            if len(predicoes) >= 2:
                variacao = float(predicoes[-1].risco_evasao) - float(predicoes[0].risco_evasao)
                variacoes.append(variacao)
        
        media_variacao = sum(variacoes) / len(variacoes) if variacoes else 0
        taxa_sucesso = len([v for v in variacoes if v < -10]) / len(variacoes) * 100 if variacoes else 0
        
        impacto_por_tipo.append({
            "tipo": tipo_data.tipo,
            "total_intervencoes": tipo_data.total,
            "media_variacao_risco": round(media_variacao, 2),
            "taxa_sucesso": round(taxa_sucesso, 1)
        })
    
    # Ordenar por taxa de sucesso
    impacto_por_tipo.sort(key=lambda x: x['taxa_sucesso'], reverse=True)
    
    # ==========================================
    # RETORNAR INDICADORES COMPLETOS
    # ==========================================
    
    return {
        "periodo": {
            "inicio": start_date,
            "fim": end_date,
            "dias": (datetime.strptime(end_date, '%Y-%m-%d') - datetime.strptime(start_date, '%Y-%m-%d')).days
        },
        "alunos_recuperados": {
            "total": len(alunos_recuperados),
            "percentual": round((len(alunos_recuperados) / len(matriculas_intervencao) * 100), 1) if matriculas_intervencao else 0,
            "lista": alunos_recuperados[:10]  # Top 10
        },
        "alunos_em_acompanhamento": {
            "total": len(alunos_em_acompanhamento),
            "percentual": round((len(alunos_em_acompanhamento) / len(matriculas_intervencao) * 100), 1) if matriculas_intervencao else 0
        },
        "alunos_sem_melhoria": {
            "total": len(alunos_sem_melhoria),
            "percentual": round((len(alunos_sem_melhoria) / len(matriculas_intervencao) * 100), 1) if matriculas_intervencao else 0
        },
        "evasao_real_vs_predita": {
            "total_risco_alto": total_risco_alto,
            "alunos_ativos": total_ativos,
            "alunos_evasao": total_evasao,
            "taxa_evasao_real": round(taxa_evasao_real, 1),
            "taxa_retention": round(taxa_retention, 1)
        },
        "roi_sistema": {
            "alunos_salvos": alunos_salvos,
            "total_intervencao": len(matriculas_intervencao),
            "roi_percentual": round(roi_sistema, 1),
            "evasao_evitada_estimada": round(evasao_evitada, 0),
            "impacto_percentual": round((evasao_evitada / evasao_esperada_sem_intervencao * 100), 1) if evasao_esperada_sem_intervencao > 0 else 0
        },
        "impacto_intervencoes": {
            "por_tipo": impacto_por_tipo[:5],  # Top 5 tipos
            "total_intervencoes": sum(t['total_intervencoes'] for t in impacto_por_tipo)
        },
        "resumo_geral": {
            "eficacia_geral": round(roi_sistema, 1),
            "alunos_impactados": len(matriculas_intervencao),
            "recomendacao": "Sistema eficaz" if roi_sistema >= 60 else "Sistema moderado" if roi_sistema >= 40 else "Necessita melhorias"
        }
    }


# ============================================
# ENDPOINTS - PLANOS DE AÇÃO E METAS
# ============================================

# --- PLANOS DE AÇÃO ---

@app.get("/planos-acao", response_model=List[schemas.PlanosAcaoResponse])
def list_planos_acao(
    curso_id: Optional[int] = None,
    nivel_risco: Optional[str] = None,
    ativo: bool = True,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Listar planos de ação (com filtros)"""
    query = db.query(models.PlanosAcao).options(
        joinedload(models.PlanosAcao.curso)
    ).filter(models.PlanosAcao.ativo == ativo)
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.PlanosAcao.curso_id == current_user.curso_id)
    
    # Filtros adicionais
    if curso_id:
        query = query.filter(models.PlanosAcao.curso_id == curso_id)
    if nivel_risco:
        query = query.filter(models.PlanosAcao.nivel_risco == nivel_risco)
    
    return query.all()


@app.get("/planos-acao/{plano_id}", response_model=schemas.PlanosAcaoResponse)
def get_plano_acao(
    plano_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Obter plano de ação por ID"""
    plano = db.query(models.PlanosAcao).options(
        joinedload(models.PlanosAcao.curso)
    ).filter(models.PlanosAcao.id == plano_id).first()
    
    if not plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    
    return plano


@app.post("/planos-acao", response_model=schemas.PlanosAcaoResponse)
def create_plano_acao(
    plano: schemas.PlanosAcaoCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Criar novo plano de ação"""
    # Verificar se já existe plano para este curso e nível
    existing = db.query(models.PlanosAcao).filter(
        models.PlanosAcao.curso_id == plano.curso_id,
        models.PlanosAcao.nivel_risco == plano.nivel_risco,
        models.PlanosAcao.ativo == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Já existe um plano ativo para este curso e nível de risco"
        )
    
    db_plano = models.PlanosAcao(**plano.model_dump())
    db.add(db_plano)
    db.commit()
    db.refresh(db_plano)
    
    return db_plano


@app.put("/planos-acao/{plano_id}", response_model=schemas.PlanosAcaoResponse)
def update_plano_acao(
    plano_id: int,
    plano_update: schemas.PlanosAcaoUpdate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Atualizar plano de ação"""
    db_plano = db.query(models.PlanosAcao).filter(
        models.PlanosAcao.id == plano_id
    ).first()
    
    if not db_plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    
    update_data = plano_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plano, key, value)
    
    db.commit()
    db.refresh(db_plano)
    
    return db_plano


@app.delete("/planos-acao/{plano_id}")
def delete_plano_acao(
    plano_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Excluir (desativar) plano de ação"""
    db_plano = db.query(models.PlanosAcao).filter(
        models.PlanosAcao.id == plano_id
    ).first()
    
    if not db_plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    
    db_plano.ativo = False  # Soft delete
    db.commit()
    
    return {"message": "Plano desativado com sucesso"}


@app.get("/planos-acao/sugestao/{aluno_matricula}")
def get_sugestao_intervencao(
    aluno_matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Obter sugestão de intervenção baseada no plano de ação do aluno.
    
    Analisa o aluno e retorna as ações recomendadas do plano correspondente.
    """
    # Buscar aluno
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == aluno_matricula
    ).first()
    
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Buscar última predição
    predicao = db.query(models.Predicao).filter(
        models.Predicao.aluno_id == aluno_matricula
    ).order_by(models.Predicao.data_predicao.desc()).first()
    
    if not predicao:
        raise HTTPException(status_code=404, detail="Predição não encontrada")
    
    # Buscar plano de ação para o curso e nível de risco
    plano = db.query(models.PlanosAcao).filter(
        models.PlanosAcao.curso_id == aluno.curso_id,
        models.PlanosAcao.nivel_risco == predicao.nivel_risco,
        models.PlanosAcao.ativo == True
    ).first()
    
    if not plano:
        # Buscar plano genérico (se houver)
        plano = db.query(models.PlanosAcao).filter(
            models.PlanosAcao.curso_id == None,  # Plano genérico
            models.PlanosAcao.nivel_risco == predicao.nivel_risco,
            models.PlanosAcao.ativo == True
        ).first()
    
    # Retornar sugestões
    acoes_sugeridas = []
    if plano:
        acoes_sugeridas = json.loads(plano.acoes_recomendadas) if plano.acoes_recomendadas else []
    
    return {
        "aluno": {
            "matricula": aluno_matricula,
            "nome": aluno.nome,
            "curso": aluno.curso.nome if aluno.curso else None,
            "nivel_risco": predicao.nivel_risco,
            "risco_evasao": float(predicao.risco_evasao)
        },
        "plano_acao": {
            "id": plano.id if plano else None,
            "meta_frequencia": float(plano.meta_frequencia_minima) if plano else 75.0,
            "meta_media": float(plano.meta_media_minima) if plano else 6.0,
            "prazo_dias": plano.prazo_dias if plano else 30
        } if plano else None,
        "acoes_sugeridas": acoes_sugeridas,
        "recomendacoes_gerais": [
            "Acompanhar frequência semanalmente",
            "Verificar necessidade de apoio psicossocial",
            "Oferecer monitoria nas disciplinas com dificuldade"
        ] if not acoes_sugeridas else []
    }


# --- METAS SEMESTRAIS ---

@app.get("/metas-semestrais", response_model=List[schemas.MetasSemestraisResponse])
def list_metas_semestrais(
    curso_id: Optional[int] = None,
    semestre: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Listar metas semestrais (com filtros)"""
    query = db.query(models.MetasSemestrais).options(
        joinedload(models.MetasSemestrais.curso)
    )
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.MetasSemestrais.curso_id == current_user.curso_id)
    
    # Filtros adicionais
    if curso_id:
        query = query.filter(models.MetasSemestrais.curso_id == curso_id)
    if semestre:
        query = query.filter(models.MetasSemestrais.semestre == semestre)
    if status:
        query = query.filter(models.MetasSemestrais.status == status)
    
    return query.order_by(models.MetasSemestrais.data_inicio.desc()).all()


@app.post("/metas-semestrais", response_model=schemas.MetasSemestraisResponse)
def create_meta_semestral(
    meta: schemas.MetasSemestraisCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Criar nova meta semestral"""
    # Verificar se já existe meta para este curso e semestre
    existing = db.query(models.MetasSemestrais).filter(
        models.MetasSemestrais.curso_id == meta.curso_id,
        models.MetasSemestrais.semestre == meta.semestre
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Já existe uma meta para este curso e semestre"
        )
    
    db_meta = models.MetasSemestrais(**meta.model_dump())
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    
    return db_meta


@app.put("/metas-semestrais/{meta_id}", response_model=schemas.MetasSemestraisResponse)
def update_meta_semestral(
    meta_id: int,
    meta_update: schemas.MetasSemestraisUpdate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    """Atualizar meta semestral"""
    db_meta = db.query(models.MetasSemestrais).filter(
        models.MetasSemestrais.id == meta_id
    ).first()
    
    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    update_data = meta_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meta, key, value)
    
    db.commit()
    db.refresh(db_meta)
    
    return db_meta


# --- METAS INDIVIDUAIS DE ALUNOS ---

@app.get("/alunos/{matricula}/metas", response_model=List[schemas.AlunoMetaResponse])
def list_metas_aluno(
    matricula: str,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Listar metas de um aluno"""
    query = db.query(models.AlunoMeta).options(
        joinedload(models.AlunoMeta.aluno),
        joinedload(models.AlunoMeta.plano_acao)
    ).filter(models.AlunoMeta.aluno_matricula == matricula)
    
    if status:
        query = query.filter(models.AlunoMeta.status == status)
    
    return query.order_by(models.AlunoMeta.data_limite.desc()).all()


@app.post("/alunos/{matricula}/metas", response_model=schemas.AlunoMetaResponse)
def create_meta_aluno(
    matricula: str,
    meta: schemas.AlunoMetaCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Criar meta individual para aluno"""
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == matricula
    ).first()
    
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    db_meta = models.AlunoMeta(**meta.model_dump(), aluno_matricula=matricula)
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    
    # Recarregar com relacionamentos
    db_meta = db.query(models.AlunoMeta).options(
        joinedload(models.AlunoMeta.aluno),
        joinedload(models.AlunoMeta.plano_acao)
    ).filter(models.AlunoMeta.id == db_meta.id).first()
    
    return db_meta


@app.put("/metas-aluno/{meta_id}", response_model=schemas.AlunoMetaResponse)
def update_meta_aluno(
    meta_id: int,
    meta_update: schemas.AlunoMetaUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Atualizar meta de aluno"""
    db_meta = db.query(models.AlunoMeta).filter(
        models.AlunoMeta.id == meta_id
    ).first()
    
    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    
    update_data = meta_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meta, key, value)
    
    db.commit()
    db.refresh(db_meta)
    
    return db_meta


@app.get("/dashboard/metas-cumprimento")
def get_metas_cumprimento(
    curso_id: Optional[int] = None,
    semestre: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Dashboard de cumprimento de metas.
    
    Mostra o percentual de alunos que atingiram as metas por curso.
    """
    from datetime import datetime
    
    # Se não especificar semestre, usa o atual
    if not semestre:
        now = datetime.now()
        semestre_atual = f"{now.year}-1" if now.month <= 6 else f"{now.year}-2"
        semestre = semestre_atual
    
    # Query base de metas semestrais
    query = db.query(models.MetasSemestrais)
    
    if curso_id:
        query = query.filter(models.MetasSemestrais.curso_id == curso_id)
    else:
        # Filtrar por curso se não for ADMIN
        if current_user.role.nome != "ADMIN" and current_user.curso_id:
            query = query.filter(models.MetasSemestrais.curso_id == current_user.curso_id)
    
    query = query.filter(models.MetasSemestrais.semestre == semestre)
    
    metas = query.all()
    
    resultados = []
    for meta in metas:
        # Contar alunos com meta atingida neste curso/semestre
        total_alunos = db.query(models.Aluno).filter(
            models.Aluno.curso_id == meta.curso_id
        ).count()
        
        alunos_meta_atingida = db.query(models.AlunoMeta).join(
            models.Aluno, models.AlunoMeta.aluno_matricula == models.Aluno.matricula
        ).filter(
            models.Aluno.curso_id == meta.curso_id,
            models.AlunoMeta.status == 'ATINGIDA'
        ).count()
        
        percentual = (alunos_meta_atingida / total_alunos * 100) if total_alunos > 0 else 0
        
        resultados.append({
            "curso": meta.curso.nome,
            "semestre": meta.semestre,
            "meta_frequencia": float(meta.meta_frequencia_geral),
            "meta_media": float(meta.meta_media_geral),
            "total_alunos": total_alunos,
            "alunos_meta_atingida": alunos_meta_atingida,
            "percentual_cumprimento": round(percentual, 1),
            "status_meta": meta.status
        })

    return {
        "semestre": semestre,
        "resultados": resultados,
        "total_cursos": len(resultados),
        "media_cumprimento": round(
            sum(r["percentual_cumprimento"] for r in resultados) / len(resultados), 1
        ) if resultados else 0
    }


# ============================================
# ENDPOINTS - FALTAS CONSECUTIVAS
# ============================================

# --- REGISTRO DE FALTAS DIÁRIAS ---

@app.post("/alunos/{matricula}/faltas", response_model=schemas.RegistroFaltasDiariasResponse)
def registrar_falta(
    matricula: str,
    falta: schemas.RegistroFaltasDiariasCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Registrar falta diária para um aluno"""
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Verificar se já existe registro para esta data/disciplina
    existing = db.query(models.RegistroFaltasDiarias).filter(
        models.RegistroFaltasDiarias.aluno_matricula == matricula,
        models.RegistroFaltasDiarias.data == falta.data,
        models.RegistroFaltasDiarias.disciplina == falta.disciplina
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Já existe registro de falta para esta data e disciplina"
        )
    
    # Criar registro
    db_falta = models.RegistroFaltasDiarias(
        **falta.model_dump(),
        aluno_matricula=matricula,
        criado_por=current_user.id
    )
    
    db.add(db_falta)
    db.commit()
    db.refresh(db_falta)
    
    return db_falta


@app.get("/alunos/{matricula}/faltas", response_model=List[schemas.RegistroFaltasDiariasResponse])
def listar_faltas_aluno(
    matricula: str,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Listar faltas de um aluno com filtros de data"""
    from datetime import datetime, timedelta
    
    query = db.query(models.RegistroFaltasDiarias).filter(
        models.RegistroFaltasDiarias.aluno_matricula == matricula
    )
    
    # Filtros de data
    if data_inicio:
        query = query.filter(models.RegistroFaltasDiarias.data >= data_inicio)
    else:
        # Padrão: últimos 30 dias
        data_inicio = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        query = query.filter(models.RegistroFaltasDiarias.data >= data_inicio)
    
    if data_fim:
        query = query.filter(models.RegistroFaltasDiarias.data <= data_fim)
    
    faltas = query.order_by(models.RegistroFaltasDiarias.data.desc()).all()
    return faltas


@app.get("/alunos/{matricula}/faltas-consecutivas")
def verificar_faltas_consecutivas(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Verificar faltas consecutivas de um aluno.
    
    Retorna:
    - Total de faltas consecutivas atuais
    - Período (data início e fim)
    - Disciplinas afetadas
    - Nível de alerta (3, 5, ou 10 faltas)
    """
    from datetime import timedelta
    
    # Buscar faltas dos últimos 15 dias
    from datetime import datetime, timedelta
    data_limite = datetime.now() - timedelta(days=15)
    
    faltas = db.query(models.RegistroFaltasDiarias).filter(
        models.RegistroFaltasDiarias.aluno_matricula == matricula,
        models.RegistroFaltasDiarias.data >= data_limite
    ).order_by(models.RegistroFaltasDiarias.data).all()
    
    if not faltas:
        return {
            "total_consecutivas": 0,
            "nivel_alerta": None,
            "disciplinas": [],
            "periodo": None
        }
    
    # Calcular sequências consecutivas
    sequencias = []
    sequencia_atual = [faltas[0]]
    
    for i in range(1, len(faltas)):
        dias_diff = (faltas[i].data - faltas[i-1].data).days
        if dias_diff <= 3:  # Considera consecutivas se diferença <= 3 dias
            sequencia_atual.append(faltas[i])
        else:
            if len(sequencia_atual) >= 3:
                sequencias.append(sequencia_atual)
            sequencia_atual = [faltas[i]]
    
    if len(sequencia_atual) >= 3:
        sequencias.append(sequencia_atual)
    
    if not sequencias:
        return {
            "total_consecutivas": 0,
            "nivel_alerta": None,
            "disciplinas": [],
            "periodo": None
        }
    
    # Pegar maior sequência
    maior_sequencia = max(sequencias, key=len)
    total = len(maior_sequencia)
    
    # Determinar nível de alerta
    if total >= 10:
        nivel_alerta = "10_FALTAS"
    elif total >= 5:
        nivel_alerta = "5_FALTAS"
    elif total >= 3:
        nivel_alerta = "3_FALTAS"
    else:
        nivel_alerta = None
    
    disciplinas = list(set(f.disciplina for f in maior_sequencia))
    
    return {
        "total_consecutivas": total,
        "nivel_alerta": nivel_alerta,
        "disciplinas": disciplinas,
        "periodo": {
            "inicio": maior_sequencia[0].data.isoformat(),
            "fim": maior_sequencia[-1].data.isoformat()
        },
        "todas_faltas": [
            {
                "data": f.data.isoformat(),
                "disciplina": f.disciplina,
                "justificada": f.justificada
            }
            for f in maior_sequencia
        ]
    }


# --- ALERTAS DE FALTAS CONSECUTIVAS ---

@app.get("/alertas-faltas", response_model=List[schemas.AlertaFaltasConsecutivasResponse])
def listar_alertas_faltas(
    status: Optional[str] = None,
    tipo_alerta: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Listar alertas de faltas consecutivas com filtros"""
    query = db.query(models.AlertaFaltasConsecutivas).options(
        joinedload(models.AlertaFaltasConsecutivas.aluno)
    )
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.AlertaFaltasConsecutivas.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )
    
    if status:
        query = query.filter(models.AlertaFaltasConsecutivas.status == status)
    if tipo_alerta:
        query = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == tipo_alerta)
    
    alertas = query.order_by(models.AlertaFaltasConsecutivas.criado_at.desc()).all()
    return alertas


@app.put("/alertas-faltas/{alerta_id}", response_model=schemas.AlertaFaltasConsecutivasResponse)
def atualizar_alerta_falta(
    alerta_id: int,
    alerta_update: schemas.AlertaFaltasConsecutivasUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Atualizar status de alerta de faltas"""
    db_alerta = db.query(models.AlertaFaltasConsecutivas).filter(
        models.AlertaFaltasConsecutivas.id == alerta_id
    ).first()
    
    if not db_alerta:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    
    update_data = alerta_update.model_dump(exclude_unset=True)
    
    # Auto-set data_resolucao se status for RESOLVIDO
    if update_data.get('status') == 'RESOLVIDO' and not db_alerta.data_resolucao:
        from datetime import date
        update_data['data_resolucao'] = date.today()
        update_data['resolvido_por'] = current_user.id
    
    for key, value in update_data.items():
        setattr(db_alerta, key, value)
    
    db.commit()
    db.refresh(db_alerta)
    
    return db_alerta


@app.get("/dashboard/faltas-stats")
def get_dashboard_faltas_stats(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Estatísticas de faltas consecutivas para dashboard"""
    query = db.query(models.AlertaFaltasConsecutivas)
    
    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.AlertaFaltasConsecutivas.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )
    
    # Contar por status
    pendentes = query.filter(models.AlertaFaltasConsecutivas.status == 'PENDENTE').count()
    
    # Contar por tipo
    alertas_3 = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == '3_FALTAS').count()
    alertas_5 = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == '5_FALTAS').count()
    alertas_10 = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == '10_FALTAS').count()
    
    # Alunos únicos com alertas
    alunos_com_alertas = query.distinct(models.AlertaFaltasConsecutivas.aluno_matricula).count()
    
    return {
        "total_alertas_pendentes": pendentes,
        "total_alertas_3_faltas": alertas_3,
        "total_alertas_5_faltas": alertas_5,
        "total_alertas_10_faltas": alertas_10,
        "alunos_com_faltas_consecutivas": alunos_com_alertas
    }


# ============================================
# ENDPOINTS - RELATÓRIOS GERENCIAIS
# ============================================

@app.get("/relatorios/geral")
def get_relatorio_geral(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Relatório geral do sistema com todos os indicadores.
    """
    from datetime import datetime, timedelta
    
    # Definir período (últimos 30 dias se não especificado)
    if not data_inicio:
        data_fim_dt = datetime.now()
        data_inicio_dt = data_fim_dt - timedelta(days=30)
        data_inicio = data_inicio_dt.strftime('%Y-%m-%d')
        data_fim = data_fim_dt.strftime('%Y-%m-%d')
    
    # Query base de alunos
    query_alunos = db.query(models.Aluno)
    
    if curso_id:
        query_alunos = query_alunos.filter(models.Aluno.curso_id == curso_id)
    
    total_alunos = query_alunos.count()
    
    # Contar por nível de risco
    subq = db.query(
        models.Predicao.aluno_id,
        func.max(models.Predicao.data_predicao).label('max_data')
    ).group_by(models.Predicao.aluno_id).subquery()
    
    ultimas_predicoes = db.query(models.Predicao).join(
        subq, models.Predicao.aluno_id == subq.c.aluno_id
    ).filter(
        models.Predicao.data_predicao >= data_inicio,
        models.Predicao.data_predicao <= data_fim
    )
    
    risco_alto = ultimas_predicoes.filter(models.Predicao.nivel_risco == 'ALTO').count()
    risco_medio = ultimas_predicoes.filter(models.Predicao.nivel_risco == 'MEDIO').count()
    risco_baixo = ultimas_predicoes.filter(models.Predicao.nivel_risco == 'BAIXO').count()
    
    # Intervenções no período
    intervencoes = db.query(models.Intervencao).filter(
        models.Intervencao.data_intervencao >= data_inicio,
        models.Intervencao.data_intervencao <= data_fim
    )
    
    total_intervencoes = intervencoes.count()
    intervencoes_pendentes = intervencoes.filter(models.Intervencao.status == 'PENDENTE').count()
    intervencoes_concluidas = intervencoes.filter(models.Intervencao.status == 'CONCLUIDA').count()
    
    # Alertas de faltas
    alertas_faltas = db.query(models.AlertaFaltasConsecutivas).filter(
        models.AlertaFaltasConsecutivas.criado_at >= data_inicio,
        models.AlertaFaltasConsecutivas.criado_at <= data_fim
    )
    
    total_alertas = alertas_faltas.count()
    alertas_pendentes = alertas_faltas.filter(models.AlertaFaltasConsecutivas.status == 'PENDENTE').count()
    
    return {
        "periodo": {
            "inicio": data_inicio,
            "fim": data_fim
        },
        "resumo": {
            "total_alunos": total_alunos,
            "risco_alto": risco_alto,
            "risco_medio": risco_medio,
            "risco_baixo": risco_baixo,
            "total_intervencoes": total_intervencoes,
            "intervencoes_pendentes": intervencoes_pendentes,
            "intervencoes_concluidas": intervencoes_concluidas,
            "total_alertas_faltas": total_alertas,
            "alertas_faltas_pendentes": alertas_pendentes
        },
        "indicadores": {
            "percentual_risco_alto": round((risco_alto / total_alunos * 100), 1) if total_alunos > 0 else 0,
            "taxa_conclusao_intervencao": round((intervencoes_concluidas / total_intervencoes * 100), 1) if total_intervencoes > 0 else 0,
            "taxa_alertas_resolvidos": round(((total_alertas - alertas_pendentes) / total_alertas * 100), 1) if total_alertas > 0 else 0
        }
    }


@app.get("/relatorios/alunos-risco")
def get_relatorio_alunos_risco(
    nivel_risco: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Relatório de alunos por nível de risco.
    """
    from sqlalchemy.orm import joinedload
    
    query = db.query(models.Aluno).options(
        joinedload(models.Aluno.curso),
        joinedload(models.Aluno.predicoes)
    )
    
    if curso_id:
        query = query.filter(models.Aluno.curso_id == curso_id)
    
    alunos = query.all()
    
    # Filtrar por nível de risco (última predição)
    alunos_com_risco = []
    for aluno in alunos:
        if aluno.predicoes:
            ultima_predicao = max(aluno.predicoes, key=lambda p: p.data_predicao)
            
            if not nivel_risco or ultima_predicao.nivel_risco == nivel_risco:
                alunos_com_risco.append({
                    "matricula": aluno.matricula,
                    "nome": aluno.nome,
                    "curso": aluno.curso.nome if aluno.curso else "N/A",
                    "nivel_risco": ultima_predicao.nivel_risco,
                    "risco_evasao": float(ultima_predicao.risco_evasao),
                    "fatores": ultima_predicao.fatores_principais
                })
    
    # Ordenar por risco (ALTO > MEDIO > BAIXO)
    ordem_risco = {"ALTO": 0, "MEDIO": 1, "BAIXO": 2}
    alunos_com_risco.sort(key=lambda x: (ordem_risco.get(x["nivel_risco"], 3), -x["risco_evasao"]))
    
    return {
        "total": len(alunos_com_risco),
        "alunos": alunos_com_risco[:100]  # Limita a 100
    }


@app.get("/relatorios/intervencoes")
def get_relatorio_intervencoes(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Relatório de intervenções realizadas.
    """
    from datetime import datetime, timedelta
    from sqlalchemy.orm import joinedload
    
    # Definir período
    if not data_inicio:
        data_fim_dt = datetime.now()
        data_inicio_dt = data_fim_dt - timedelta(days=30)
        data_inicio = data_inicio_dt.strftime('%Y-%m-%d')
        data_fim = data_fim_dt.strftime('%Y-%m-%d')
    
    query = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno),
        joinedload(models.Intervencao.usuario)
    ).filter(
        models.Intervencao.data_intervencao >= data_inicio,
        models.Intervencao.data_intervencao <= data_fim
    )
    
    if status:
        query = query.filter(models.Intervencao.status == status)
    
    intervencoes = query.order_by(models.Intervencao.data_intervencao.desc()).all()
    
    return {
        "periodo": {
            "inicio": data_inicio,
            "fim": data_fim
        },
        "total": len(intervencoes),
        "intervencoes": [
            {
                "id": i.id,
                "aluno": i.aluno.nome if i.aluno else "N/A",
                "matricula": i.aluno_matricula,
                "tipo": i.tipo,
                "status": i.status,
                "prioridade": i.prioridade,
                "data_intervencao": i.data_intervencao.isoformat(),
                "responsavel": i.usuario.nome if i.usuario else "N/A"
            }
            for i in intervencoes[:200]  # Limita a 200
        ]
    }


@app.get("/relatorios/faltas-alertas")
def get_relatorio_faltas_alertas(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Relatório de alertas de faltas consecutivas.
    """
    from datetime import datetime, timedelta
    from sqlalchemy.orm import joinedload
    
    # Definir período
    if not data_inicio:
        data_fim_dt = datetime.now()
        data_inicio_dt = data_fim_dt - timedelta(days=30)
        data_inicio = data_inicio_dt.strftime('%Y-%m-%d')
        data_fim = data_fim_dt.strftime('%Y-%m-%d')
    
    query = db.query(models.AlertaFaltasConsecutivas).options(
        joinedload(models.AlertaFaltasConsecutivas.aluno)
    ).filter(
        models.AlertaFaltasConsecutivas.criado_at >= data_inicio,
        models.AlertaFaltasConsecutivas.criado_at <= data_fim
    )
    
    if status:
        query = query.filter(models.AlertaFaltasConsecutivas.status == status)
    
    alertas = query.order_by(models.AlertaFaltasConsecutivas.criado_at.desc()).all()
    
    return {
        "periodo": {
            "inicio": data_inicio,
            "fim": data_fim
        },
        "total": len(alertas),
        "alertas": [
            {
                "id": a.id,
                "aluno": a.aluno.nome if a.aluno else "N/A",
                "matricula": a.aluno_matricula,
                "tipo_alerta": a.tipo_alerta,
                "quantidade_faltas": a.quantidade_faltas,
                "status": a.status,
                "data_criacao": a.criado_at.isoformat()
            }
            for a in alertas[:200]  # Limita a 200
        ]
    }


# ============================================
# QUESTIONÁRIO PSICOSSOCIAL
# ============================================

@app.get("/questionario/perguntas")
def get_perguntas_questionario_route():
    """
    Retorna a lista completa de perguntas do questionário psicossocial.
    """
    return {
        "perguntas": get_perguntas_questionario(),
        "escalas": {
            "1": "Discordo Totalmente",
            "2": "Discordo Parcialmente",
            "3": "Neutro",
            "4": "Concordo Parcialmente",
            "5": "Concordo Totalmente"
        },
        "instrucoes": "Responda cada questão de 1 a 5, onde 1 significa 'Discordo Totalmente' e 5 significa 'Concordo Totalmente'."
    }


@app.post("/questionario/responder", response_model=schemas.QuestionarioPsicossocialResponse)
def responder_questionario(
    questionario: schemas.QuestionarioPsicossocialCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Registra as respostas do questionário psicossocial de um aluno.
    Calcula automaticamente os scores e identifica fatores críticos.
    """
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == questionario.aluno_matricula
    ).first()
    
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Calcular risco psicossocial
    respostas_dict = questionario.model_dump()
    resultado = ml_logic.calcular_risco_psicossocial(respostas_dict)
    
    # Verificar se já existe questionário para este aluno
    existente = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.aluno_matricula == questionario.aluno_matricula
    ).first()
    
    import json
    
    if existente:
        # Atualizar questionário existente
        for key, value in questionario.model_dump().items():
            if value is not None and hasattr(existente, key):
                setattr(existente, key, value)
        
        # Atualizar campos calculados
        existente.score_saude_mental = resultado["score_saude_mental"]
        existente.score_integracao_social = resultado["score_integracao_social"]
        existente.score_satisfacao_curso = resultado["score_satisfacao_curso"]
        existente.score_conflitos = resultado["score_conflitos"]
        existente.score_intencao_evasao = resultado["score_intencao_evasao"]
        existente.score_psicossocial_total = resultado["score_psicossocial_total"]
        existente.nivel_risco_psicossocial = resultado["nivel_risco_psicossocial"]
        existente.fatores_criticos = json.dumps(resultado["fatores_criticos"])
        
        db.commit()
        db.refresh(existente)
        
        # Atualizar aluno
        aluno.questionario_respondido = True
        aluno.data_ultimo_questionario = datetime.now()
        db.commit()
        
        return existente
    else:
        # Criar novo questionário
        novo_questionario = models.QuestionarioPsicossocial(
            aluno_matricula=questionario.aluno_matricula,
            score_saude_mental=resultado["score_saude_mental"],
            score_integracao_social=resultado["score_integracao_social"],
            score_satisfacao_curso=resultado["score_satisfacao_curso"],
            score_conflitos=resultado["score_conflitos"],
            score_intencao_evasao=resultado["score_intencao_evasao"],
            score_psicossocial_total=resultado["score_psicossocial_total"],
            nivel_risco_psicossocial=resultado["nivel_risco_psicossocial"],
            fatores_criticos=json.dumps(resultado["fatores_criticos"]),
            termo_consentimento=questionario.termo_consentimento,
            ip_address=questionario.ip_address,
            dispositivo=questionario.dispositivo,
            tempo_resposta_segundos=questionario.tempo_resposta_segundos
        )
        
        # Copiar respostas
        for key, value in questionario.model_dump().items():
            if key not in ['aluno_matricula', 'ip_address', 'dispositivo', 'tempo_resposta_segundos', 'termo_consentimento']:
                setattr(novo_questionario, key, value)
        
        db.add(novo_questionario)
        db.commit()
        db.refresh(novo_questionario)
        
        # Atualizar aluno
        aluno.questionario_respondido = True
        aluno.data_ultimo_questionario = datetime.now()
        db.commit()
        
        return novo_questionario


@app.get("/questionario/{matricula}", response_model=schemas.QuestionarioPsicossocialResponse)
def get_questionario_aluno(
    matricula: str,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Obtém as respostas do questionário psicossocial de um aluno.
    """
    questionario = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.aluno_matricula == matricula
    ).first()
    
    if not questionario:
        raise HTTPException(status_code=404, detail="Questionário não encontrado para este aluno")
    
    return questionario


@app.get("/questionario/{matricula}/historico")
def get_historico_questionario(
    matricula: str,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Obtém histórico de questionários respondidos pelo aluno.
    """
    questionarios = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.aluno_matricula == matricula
    ).order_by(models.QuestionarioPsicossocial.data_resposta.desc()).all()
    
    return {
        "matricula": matricula,
        "total_respostas": len(questionarios),
        "historico": [
            {
                "id": q.id,
                "data_resposta": q.data_resposta.isoformat(),
                "score_total": q.score_psicossocial_total,
                "nivel_risco": q.nivel_risco_psicossocial
            }
            for q in questionarios
        ]
    }


@app.get("/questionario/dashboard/stats")
def get_questionario_dashboard(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Estatísticas do questionário psicossocial para dashboard.
    """
    from sqlalchemy import func
    
    # Total de respostas
    total_respostas = db.query(models.QuestionarioPsicossocial).count()
    
    # Alunos com questionário
    alunos_com_questionario = db.query(
        models.QuestionarioPsicossocial.aluno_matricula
    ).distinct().count()
    
    # Total de alunos
    total_alunos = db.query(models.Aluno).count()
    
    # Distribuição por nível de risco
    risco_baixo = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.nivel_risco_psicossocial == 'BAIXO'
    ).count()
    
    risco_medio = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.nivel_risco_psicossocial == 'MEDIO'
    ).count()
    
    risco_alto = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.nivel_risco_psicossocial == 'ALTO'
    ).count()
    
    risco_muito_alto = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.nivel_risco_psicossocial == 'MUITO_ALTO'
    ).count()
    
    # Médias por dimensão
    medias = db.query(
        func.avg(models.QuestionarioPsicossocial.score_saude_mental).label('saude_mental'),
        func.avg(models.QuestionarioPsicossocial.score_integracao_social).label('integracao'),
        func.avg(models.QuestionarioPsicossocial.score_satisfacao_curso).label('satisfacao'),
        func.avg(models.QuestionarioPsicossocial.score_conflitos).label('conflitos'),
        func.avg(models.QuestionarioPsicossocial.score_intencao_evasao).label('intencao'),
        func.avg(models.QuestionarioPsicossocial.score_psicossocial_total).label('total')
    ).first()
    
    # Fatores críticos mais frequentes
    todos_questionarios = db.query(models.QuestionarioPsicossocial).all()
    fatores_contagem = {}
    
    for q in todos_questionarios:
        if q.fatores_criticos:
            import json
            try:
                fatores = json.loads(q.fatores_criticos)
                for fator in fatores:
                    fatores_contagem[fator] = fatores_contagem.get(fator, 0) + 1
            except:
                pass
    
    # Ordenar por frequência
    fatores_frequentes = sorted(
        fatores_contagem.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    return {
        "total_respostas": total_respostas,
        "alunos_com_questionario": alunos_com_questionario,
        "alunos_sem_questionario": total_alunos - alunos_com_questionario,
        "percentual_respostas": round((alunos_com_questionario / total_alunos * 100) if total_alunos > 0 else 0, 2),
        "distribuicao_risco": {
            "risco_baixo": risco_baixo,
            "risco_medio": risco_medio,
            "risco_alto": risco_alto,
            "risco_muito_alto": risco_muito_alto
        },
        "medias_dimensoes": {
            "media_saude_mental": float(medias.saude_mental) if medias.saude_mental else None,
            "media_integracao_social": float(medias.integracao) if medias.integracao else None,
            "media_satisfacao_curso": float(medias.satisfacao) if medias.satisfacao else None,
            "media_conflitos": float(medias.conflitos) if medias.conflitos else None,
            "media_intencao_evasao": float(medias.intencao) if medias.intencao else None,
            "media_score_total": float(medias.total) if medias.total else None
        },
        "fatores_criticos_frequentes": [
            {"fator": fator, "quantidade": qtd}
            for fator, qtd in fatores_frequentes
        ]
    }


@app.get("/questionario/alunos/sem-responder")
def get_alunos_sem_questionario(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Lista alunos que ainda não responderam o questionário psicossocial.
    """
    # Subquery para alunos com questionário
    subquery = db.query(
        models.QuestionarioPsicossocial.aluno_matricula
    ).distinct().subquery()
    
    # Alunos sem questionário
    alunos_sem = db.query(models.Aluno).filter(
        ~models.Aluno.matricula.in_(subquery)
    ).order_by(models.Aluno.nome).limit(100).all()
    
    return {
        "total": len(alunos_sem),
        "alunos": [
            {
                "matricula": a.matricula,
                "nome": a.nome,
                "curso": a.curso.nome if a.curso else None,
                "email": a.email
            }
            for a in alunos_sem
        ]
    }


# ============================================
# TOKENS DE ACESSO - QUESTIONÁRIO PÚBLICO (SEM LOGIN)
# ============================================

@app.post("/tokens/questionario/gerar", response_model=schemas.TokenQuestionarioResponse)
def gerar_token_questionario(
    token_data: schemas.TokenQuestionarioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Gera um token de acesso temporário para aluno responder questionário sem login.
    Coordenador pode gerar tokens para distribuir aos alunos.
    """
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == token_data.aluno_matricula
    ).first()
    
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Gerar token único
    token = str(uuid.uuid4())
    valido_ate = datetime.now() + timedelta(hours=token_data.horas_validade)
    
    # Criar token no banco
    novo_token = models.TokenQuestionario(
        aluno_matricula=token_data.aluno_matricula,
        token=token,
        valido_ate=valido_ate,
        ip_criacao=None,  # Pego do request se precisar
        usado=False,
        ativo=True
    )
    
    db.add(novo_token)
    db.commit()
    db.refresh(novo_token)
    
    # Gerar link de acesso
    link_acesso = f"http://localhost:3000/questionario-publico?token={token}"
    
    return {
        "token": token,
        "valido_ate": valido_ate,
        "link_acesso": link_acesso,
        "aluno_nome": aluno.nome,
        "aluno_matricula": token_data.aluno_matricula
    }


@app.post("/tokens/questionario/validar")
def validar_token_questionario(
    validate_data: schemas.TokenQuestionarioValidateRequest,
    db: Session = Depends(database.get_db)
):
    """
    Valida um token de acesso ao questionário.
    Usado pelo frontend antes de carregar o questionário.
    """
    # Buscar token
    token_obj = db.query(models.TokenQuestionario).filter(
        models.TokenQuestionario.token == validate_data.token,
        models.TokenQuestionario.ativo == True
    ).first()
    
    if not token_obj:
        return {
            "valido": False,
            "mensagem": "Token não encontrado ou inativo"
        }
    
    # Verificar validade
    if token_obj.valido_ate < datetime.now():
        return {
            "valido": False,
            "mensagem": "Token expirado"
        }
    
    # Verificar se já foi usado
    if token_obj.usado:
        return {
            "valido": False,
            "mensagem": "Token já foi utilizado"
        }
    
    # Buscar dados do aluno
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == token_obj.aluno_matricula
    ).first()
    
    # Marcar como usado
    token_obj.usado = True
    token_obj.data_uso = datetime.now()
    db.commit()
    
    return {
        "valido": True,
        "mensagem": "Token válido",
        "aluno_matricula": token_obj.aluno_matricula,
        "aluno_nome": aluno.nome if aluno else None
    }


@app.post("/questionario-publico/responder")
def responder_questionario_publico(
    request: Request,
    token: str,
    respostas: schemas.QuestionarioPsicossocialCreate,
    db: Session = Depends(database.get_db)
):
    """
    Endpoint público para aluno responder questionário sem login.
    Usa token de acesso para validar.
    """
    # Validar token
    token_obj = db.query(models.TokenQuestionario).filter(
        models.TokenQuestionario.token == token,
        models.TokenQuestionario.ativo == True
    ).first()
    
    if not token_obj:
        raise HTTPException(status_code=400, detail="Token inválido")
    
    if token_obj.valido_ate < datetime.now():
        raise HTTPException(status_code=400, detail="Token expirado")
    
    if token_obj.usado:
        raise HTTPException(status_code=400, detail="Token já utilizado")
    
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == token_obj.aluno_matricula
    ).first()
    
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Calcular risco psicossocial
    respostas_dict = respostas.model_dump()
    resultado = ml_logic.calcular_risco_psicossocial(respostas_dict)
    
    import json
    
    # Criar registro do questionário
    questionario = models.QuestionarioPsicossocial(
        aluno_matricula=token_obj.aluno_matricula,
        score_saude_mental=resultado["score_saude_mental"],
        score_integracao_social=resultado["score_integracao_social"],
        score_satisfacao_curso=resultado["score_satisfacao_curso"],
        score_conflitos=resultado["score_conflitos"],
        score_intencao_evasao=resultado["score_intencao_evasao"],
        score_psicossocial_total=resultado["score_psicossocial_total"],
        nivel_risco_psicossocial=resultado["nivel_risco_psicossocial"],
        fatores_criticos=json.dumps(resultado["fatores_criticos"]),
        termo_consentimento=respostas.termo_consentimento,
        ip_address=request.client.host if request.client else None,
        tempo_resposta_segundos=respostas.tempo_resposta_segundos
    )
    
    # Copiar respostas
    for key, value in respostas.model_dump().items():
        if key not in ['aluno_matricula', 'ip_address', 'dispositivo', 'tempo_resposta_segundos', 'termo_consentimento']:
            setattr(questionario, key, value)
    
    db.add(questionario)
    
    # Atualizar token e aluno
    token_obj.usado = True
    token_obj.data_uso = datetime.now()
    token_obj.ip_uso = request.client.host if request.client else None
    
    aluno.questionario_respondido = True
    aluno.data_ultimo_questionario = datetime.now()
    
    db.commit()
    
    return {
        "message": "Questionário respondido com sucesso!",
        "score_total": resultado["score_psicossocial_total"],
        "nivel_risco": resultado["nivel_risco_psicossocial"]
    }


@app.get("/tokens/questionario/listar")
def listar_tokens_questionario(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Lista todos os tokens de acesso ao questionário.
    Apenas para coordenadores/administradores.
    """
    tokens = db.query(models.TokenQuestionario).order_by(
        models.TokenQuestionario.criado_at.desc()
    ).limit(100).all()
    
    return {
        "total": len(tokens),
        "tokens": [
            {
                "id": t.id,
                "token": t.token[:8] + "..." + t.token[-4:],  # Mostrar parcial
                "aluno_matricula": t.aluno_matricula,
                "aluno_nome": t.aluno.nome if t.aluno else "N/A",
                "valido_ate": t.valido_ate.isoformat() if t.valido_ate else None,
                "usado": t.usado,
                "data_uso": t.data_uso.isoformat() if t.data_uso else None,
                "ativo": t.ativo,
                "criado_at": t.criado_at.isoformat() if t.criado_at else None
            }
            for t in tokens
        ]
    }


# ============================================
# INTERVENÇÃO AUTOMÁTICA (SUGESTÕES BASEADAS EM RISCO)
# ============================================

@app.get("/intervencoes/sugerir/{matricula}")
def sugerir_intervencao_automatica(
    matricula: str,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Sugere intervenções automáticas baseadas no risco do aluno.
    """
    # Buscar aluno
    aluno = db.query(models.Aluno).filter(
        models.Aluno.matricula == matricula
    ).first()
    
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Buscar última predição
    predicao = db.query(models.Predicao).filter(
        models.Predicao.aluno_id == matricula
    ).order_by(models.Predicao.data_predicao.desc()).first()
    
    # Buscar último questionário
    questionario = db.query(models.QuestionarioPsicossocial).filter(
        models.QuestionarioPsicossocial.aluno_matricula == matricula
    ).first()
    
    intervencoes_sugeridas = []
    fatores_risco = []
    
    # Regras baseadas em frequência
    if aluno.frequencia and aluno.frequencia < 60:
        intervencoes_sugeridas.append({
            "tipo": "Reunião com Responsáveis",
            "prioridade": "URGENTE",
            "descricao": "Convocar responsáveis para reunião urgente",
            "motivo": f"Frequência crítica ({aluno.frequencia}%)"
        })
        fatores_risco.append("Frequência abaixo de 60%")
    elif aluno.frequencia and aluno.frequencia < 75:
        intervencoes_sugeridas.append({
            "tipo": "Alerta WhatsApp",
            "prioridade": "ALTA",
            "descricao": "Enviar alerta por WhatsApp para aluno e responsáveis",
            "motivo": f"Frequência abaixo de 75% ({aluno.frequencia}%)"
        })
        fatores_risco.append("Frequência abaixo de 75%")
    
    # Regras baseadas em média
    if aluno.media_geral and float(aluno.media_geral) < 4.0:
        intervencoes_sugeridas.append({
            "tipo": "Monitoria",
            "prioridade": "ALTA",
            "descricao": "Encaminhar para monitoria nas disciplinas críticas",
            "motivo": f"Média muito baixa ({aluno.media_geral})"
        })
        fatores_risco.append("Desempenho acadêmico crítico")
    elif aluno.media_geral and float(aluno.media_geral) < 5.0:
        intervencoes_sugeridas.append({
            "tipo": "Reforço Escolar",
            "prioridade": "MEDIA",
            "descricao": "Agendar reforço escolar",
            "motivo": f"Média baixa ({aluno.media_geral})"
        })
        fatores_risco.append("Desempenho acadêmico instável")
    
    # Regras baseadas em reprovas
    if aluno.historico_reprovas and aluno.historico_reprovas > 3:
        intervencoes_sugeridas.append({
            "tipo": "Revisão Pedagógica",
            "prioridade": "ALTA",
            "descricao": "Revisar carga horária e dificuldades do aluno",
            "motivo": f"{aluno.historico_reprovas} reprovações"
        })
        fatores_risco.append(f"Múltiplas reprovações ({aluno.historico_reprovas})")
    
    # Regras baseadas em questionário psicossocial
    if questionario:
        if questionario.nivel_risco_psicossocial in ['ALTO', 'MUITO_ALTO']:
            fatores = json.loads(questionario.fatores_criticos) if questionario.fatores_criticos else []
            
            if 'ansiedade_severa' in fatores or 'sintomas_depressivos' in fatores:
                intervencoes_sugeridas.append({
                    "tipo": "Apoio Psicológico",
                    "prioridade": "URGENTE",
                    "descricao": "Encaminhar para atendimento psicológico",
                    "motivo": "Indicadores de saúde mental"
                })
                fatores_risco.append("Saúde mental")
            
            if 'isolamento_social' in fatores or 'falta_pertencimento' in fatores:
                intervencoes_sugeridas.append({
                    "tipo": "Integração Social",
                    "prioridade": "MEDIA",
                    "descricao": "Incluir em grupo de estudos ou atividades extracurriculares",
                    "motivo": "Isolamento social detectado"
                })
                fatores_risco.append("Isolamento social")
            
            if 'conflito_trabalho_estudo' in fatores:
                intervencoes_sugeridas.append({
                    "tipo": "Apoio Social",
                    "prioridade": "ALTA",
                    "descricao": "Agendar atendimento com assistente social",
                    "motivo": "Conflito trabalho-estudo"
                })
                fatores_risco.append("Conflito trabalho-estudo")
    
    # Adicionar fator da predição
    if predicao:
        if predicao.nivel_risco == 'ALTO':
            fatores_risco.append(f"Risco de evasão ALTO ({predicao.risco_evasao}%)")
        elif predicao.nivel_risco == 'MEDIO':
            fatores_risco.append(f"Risco de evasão MÉDIO ({predicao.risco_evasao}%)")
    
    return {
        "aluno_matricula": matricula,
        "aluno_nome": aluno.nome,
        "intervencoes_sugeridas": intervencoes_sugeridas,
        "fatores_risco": fatores_risco,
        "total_sugestoes": len(intervencoes_sugeridas)
    }


# ============================================
# MÉTRICAS DO FEEDBACK LOOP (EFICÁCIA DO FALLBACK)
# ============================================

@app.get("/metricas/fallback-eficacia")
def metricas_fallback_eficacia(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Métricas de eficácia do Fallback/ML baseadas em histórico de predições vs resultados reais.

    Retorna:
    - Total de predições avaliadas
    - Taxa de acerto (precisão)
    - Falsos positivos/negativos
    - Acurácia, precisão, recall, F1-score
    - Detalhes por tipo de erro
    """
    # Buscar todos os registros do histórico
    historico = db.query(models.PredicaoHistorico).all()

    if not historico:
        return {
            "mensagem": "Nenhum dado de feedback disponível ainda.",
            "total_avaliado": 0,
            "explicacao": "As métricas serão calculadas automaticamente quando alunos se tornarem egressos.",
            "acuracia": None,
            "precisao": None,
            "recall": None,
            "f1_score": None,
            "verdadeiros_positivos": 0,
            "verdadeiros_negativos": 0,
            "falsos_positivos": 0,
            "falsos_negativos": 0,
            "detalhes_por_nivel": {}
        }

    # Classificar por tipo de erro
    vp = 0  # Verdadeiros positivos: predição ALTA + evadiu
    vn = 0  # Verdadeiros negativos: predição BAIXA + não evadiu
    fp = 0  # Falsos positivos: predição ALTA + não evadiu
    fn = 0  # Falsos negativos: predição BAIXA + evadiu

    detalhes_por_nivel = {}
    acertos_por_nivel = {}
    total_por_nivel = {}

    for reg in historico:
        nivel = reg.nivel_risco
        tipo = reg.tipo_erro or "NAO_AVALIADO"

        # Contar por tipo
        if tipo == "VERDADEIRO_POSITIVO" or tipo == "VERDADEIRO_POSITIVO_PARCIAL":
            vp += 1
        elif tipo == "VERDADEIRO_NEGATIVO":
            vn += 1
        elif tipo == "FALSO_POSITIVO":
            fp += 1
        elif tipo == "FALSO_NEGATIVO":
            fn += 1

        # Contar por nível de risco
        total_por_nivel[nivel] = total_por_nivel.get(nivel, 0) + 1
        if reg.predicao_correta:
            acertos_por_nivel[nivel] = acertos_por_nivel.get(nivel, 0) + 1

    total = len(historico)
    acertos = vp + vn
    erros = fp + fn

    # Calcular métricas
    # Acurácia: (VP + VN) / total
    acuracia = (vp + vn) / total if total > 0 else None

    # Precisão: VP / (VP + FP) - das predições positivas, quantas eram reais?
    precisao = vp / (vp + fp) if (vp + fp) > 0 else None

    # Recall/Sensibilidade: VP / (VP + FN) - dos casos reais, quantos detectamos?
    recall = vp / (vp + fn) if (vp + fn) > 0 else None

    # F1-Score: média harmônica entre precisão e recall
    if precisao and recall and (precisao + recall) > 0:
        f1_score = 2 * (precisao * recall) / (precisao + recall)
    else:
        f1_score = None

    # Taxa de acerto por nível
    for nivel in total_por_nivel:
        detalhes_por_nivel[nivel] = {
            "total": total_por_nivel[nivel],
            "acertos": acertos_por_nivel.get(nivel, 0),
            "taxa_acerto": round(acertos_por_nivel.get(nivel, 0) / total_por_nivel[nivel] * 100, 1) if total_por_nivel[nivel] > 0 else None
        }

    return {
        "total_avaliado": total,
        "acertos": acertos,
        "erros": erros,
        "taxa_acerto_geral": round(acertos / total * 100, 1) if total > 0 else None,
        "acuracia": round(acuracia * 100, 1) if acuracia else None,
        "precisao": round(precisao * 100, 1) if precisao else None,
        "recall": round(recall * 100, 1) if recall else None,
        "f1_score": round(f1_score, 3) if f1_score else None,
        "verdadeiros_positivos": vp,
        "verdadeiros_negativos": vn,
        "falsos_positivos": fp,
        "falsos_negativos": fn,
        "detalhes_por_nivel": detalhes_por_nivel,
        "interpretacao": {
            "acuracia": f"Das predições, {acuracia*100:.1f}% estavam corretas" if acuracia else "Dados insuficientes",
            "precisao": f"Quando alertou, acertou {precisao*100:.1f}% das vezes" if precisao else "Dados insuficientes",
            "recall": f"Detectou {recall*100:.1f}% dos casos reais de evasão" if recall else "Dados insuficientes"
        }
    }


# ============================================
# EGRESSOS - CRUD COMPLETO
# ============================================

@app.post("/egressos", response_model=schemas.EgressoResponse, status_code=status.HTTP_201_CREATED)
def criar_egresso(
    egresso_data: schemas.EgressoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Cadastra um novo egresso (aluno que saiu do curso).
    """
    try:
        # Verificar se aluno existe
        aluno = db.query(models.Aluno).filter(
            models.Aluno.matricula == egresso_data.aluno_matricula
        ).first()
        
        if not aluno:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Aluno não encontrado"
            )
        
        # Buscar última predição de risco do aluno
        ultima_predicao = db.query(models.Predicao).filter(
            models.Predicao.aluno_id == egresso_data.aluno_matricula
        ).order_by(models.Predicao.data_predicao.desc()).first()
        
        # Buscar intervenções recebidas
        intervencoes = db.query(models.Intervencao).filter(
            models.Intervencao.aluno_id == egresso_data.aluno_matricula
        ).all()
        
        # Criar egresso
        novo_egresso = models.Egresso(
            aluno_matricula=egresso_data.aluno_matricula,
            data_saida=egresso_data.data_saida,
            motivo_saida=egresso_data.motivo_saida,
            motivo_detalhes=egresso_data.motivo_detalhes,
            motivo_abandono_principal=egresso_data.motivo_abandono_principal,
            instituicao_destino=egresso_data.instituicao_destino,
            curso_destino=egresso_data.curso_destino,
            situacao_atual=egresso_data.situacao_atual,
            esta_estudando=egresso_data.esta_estudando,
            esta_trabalhando=egresso_data.esta_trabalhando,
            observacoes=egresso_data.observacoes,
            # Dados do SAPEE
            tinha_predicao_risco=ultima_predicao is not None,
            nivel_risco_predito=ultima_predicao.nivel_risco.value if ultima_predicao else None,
            recebeu_intervencao=len(intervencoes) > 0,
            tipo_intervencao=json.dumps([i.tipo for i in intervencoes]) if intervencoes else None,
            cadastrado_por=current_user.id
        )
        
        db.add(novo_egresso)
        
        # Atualizar status do aluno para "egresso" (se houver campo)
        # Ou remover da lista de alunos ativos
        
        db.commit()
        db.refresh(novo_egresso)

        # ============================================
        # FEEDBACK LOOP: Registrar no histórico de predições
        # ============================================
        try:
            if ultima_predicao:
                # Determinar se é evasão (abandono)
                is_evasao = egresso_data.motivo_saida == "ABANDONO"

                # Determinar se a predição foi "correta"
                # Regra: Se predição era ALTO/MUITO_ALTO e evadiu = acertou
                #        Se predição era BAIXO e evadiu = errou (falso negativo)
                predicao_correta = None
                tipo_erro = None

                if is_evasao:
                    if ultima_predicao.nivel_risco in [models.NivelRisco.ALTO, models.NivelRisco.MUITO_ALTO]:
                        predicao_correta = True
                        tipo_erro = "VERDADEIRO_POSITIVO"
                    elif ultima_predicao.nivel_risco == models.NivelRisco.MEDIO:
                        predicao_correta = True  # Parcialmente correto
                        tipo_erro = "VERDADEIRO_POSITIVO_PARCIAL"
                    else:
                        predicao_correta = False
                        tipo_erro = "FALSO_NEGATIVO"  # Predição baixa mas evadiu
                else:
                    # Transferência, conclusão, etc - não é evasão
                    if ultima_predicao.nivel_risco in [models.NivelRisco.BAIXO, models.NivelRisco.MEDIO]:
                        predicao_correta = True
                        tipo_erro = "VERDADEIRO_NEGATIVO"
                    else:
                        predicao_correta = False
                        tipo_erro = "FALSO_POSITIVO"  # Predição alta mas não evadiu

                # Registrar no histórico
                hist_registro = models.PredicaoHistorico(
                    aluno_matricula=egresso_data.aluno_matricula,
                    predicao_id=ultima_predicao.id,
                    risco_evasao=ultima_predicao.risco_evasao,
                    nivel_risco=ultima_predicao.nivel_risco.value if hasattr(ultima_predicao.nivel_risco, 'value') else str(ultima_predicao.nivel_risco),
                    fatores_principais=ultima_predicao.fatores_principais,
                    modelo_ml_versao=ultima_predicao.modelo_ml_versao,
                    data_predicao=ultima_predicao.data_predicao,
                    aluno_evasao=is_evasao,
                    data_evasao=datetime.now(),
                    motivo_saida=egresso_data.motivo_saida,
                    predicao_correta=predicao_correta,
                    tipo_erro=tipo_erro
                )
                db.add(hist_registro)
                db.commit()

                print(f"📊 Feedback Loop registrado: {aluno.nome}")
                print(f"   Predição: {ultima_predicao.risco_evasao}% - {ultima_predicao.nivel_risco}")
                print(f"   Resultado: {'Evasão' if is_evasao else 'Não evasão'} ({egresso_data.motivo_saida})")
                print(f"   Avaliação: {tipo_erro}")

        except Exception as e:
            print(f"⚠️ Erro ao registrar feedback loop: {e}")
            # Não falhar o cadastro do egresso por causa disso
            db.rollback()
        
        # Preparar resposta
        resposta = {
            **novo_egresso.__dict__,
            "aluno_nome": aluno.nome,
            "curso": aluno.curso.nome if aluno.curso else "N/A"
        }
        
        # Log de auditoria
        audit_log = models.AuditLog(
            usuario_id=current_user.id,
            acao="CRIAR_EGRESSO",
            detalhes=f"Egresso cadastrado: {aluno.nome} - {egresso_data.motivo_saida}",
            ip_address=request.client.host if request.client else None
        )
        db.add(audit_log)
        db.commit()
        
        return resposta
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cadastrar egresso: {str(e)}"
        )


@app.get("/egressos")
def listar_egressos(
    motivo_saida: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Lista todos os egressos com filtros opcionais.
    """
    try:
        query = db.query(models.Egresso).join(
            models.Aluno, models.Egresso.aluno_matricula == models.Aluno.matricula
        ).outerjoin(
            models.Curso, models.Aluno.curso_id == models.Curso.id
        )
        
        # Aplicar filtro de motivo
        if motivo_saida and motivo_saida != "todos":
            query = query.filter(models.Egresso.motivo_saida == motivo_saida)
        
        # Ordenar por data de saída mais recente
        query = query.order_by(models.Egresso.data_saida.desc())
        
        total = query.count()
        egressos = query.offset(skip).limit(limit).all()
        
        # Formatar resposta
        egressos_list = []
        for egresso in egressos:
            egressos_list.append({
                "id": egresso.id,
                "aluno_matricula": egresso.aluno_matricula,
                "aluno_nome": egresso.aluno.nome if egresso.aluno else "N/A",
                "curso": egresso.aluno.curso.nome if egresso.aluno and egresso.aluno.curso else "N/A",
                "data_saida": egresso.data_saida.isoformat() if egresso.data_saida else None,
                "motivo_saida": egresso.motivo_saida,
                "motivo_abandono_principal": egresso.motivo_abandono_principal,
                "motivo_detalhes": egresso.motivo_detalhes,
                "tinham_predicao_risco": egresso.tinha_predicao_risco,
                "nivel_risco_predito": egresso.nivel_risco_predito,
                "recebeu_intervencao": egresso.recebeu_intervencao,
                "data_cadastro": egresso.data_cadastro.isoformat() if egresso.data_cadastro else None
            })
        
        # Estatísticas
        total_egressos = db.query(models.Egresso).count()
        total_abandonos = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "ABANDONO"
        ).count()
        total_transferencias = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "TRANSFERENCIA"
        ).count()
        total_conclusoes = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "CONCLUSAO"
        ).count()
        abandonos_preditos = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "ABANDONO",
            models.Egresso.tinha_predicao_risco == True
        ).count()
        
        percentual_predicao_correta = (
            round((abandonos_preditos / total_abandonos * 100), 2)
            if total_abandonos > 0 else 0
        )
        
        return {
            "egressos": egressos_list,
            "total": total_egressos,
            "estatisticas": {
                "total_egressos": total_egressos,
                "total_abandonos": total_abandonos,
                "total_transferencias": total_transferencias,
                "total_conclusoes": total_conclusoes,
                "abandonos_preditos": abandonos_preditos,
                "percentual_predicao_correta": percentual_predicao_correta
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar egressos: {str(e)}"
        )


@app.get("/egressos/{egresso_id}", response_model=schemas.EgressoResponse)
def obter_egresso(
    egresso_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Obtém detalhes de um egresso específico.
    """
    try:
        egresso = db.query(models.Egresso).filter(
            models.Egresso.id == egresso_id
        ).first()
        
        if not egresso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Egresso não encontrado"
            )
        
        # Buscar dados do aluno
        aluno = db.query(models.Aluno).filter(
            models.Aluno.matricula == egresso.aluno_matricula
        ).first()
        
        resposta = {
            **egresso.__dict__,
            "aluno_nome": aluno.nome if aluno else "N/A",
            "curso": aluno.curso.nome if aluno and aluno.curso else "N/A"
        }
        
        return resposta
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter egresso: {str(e)}"
        )


@app.put("/egressos/{egresso_id}", response_model=schemas.EgressoResponse)
def atualizar_egresso(
    egresso_id: int,
    egresso_data: schemas.EgressoUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Atualiza dados de um egresso existente.
    """
    try:
        egresso = db.query(models.Egresso).filter(
            models.Egresso.id == egresso_id
        ).first()
        
        if not egresso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Egresso não encontrado"
            )
        
        # Atualizar campos
        update_data = egresso_data.dict(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(egresso, key, value)
        
        egresso.data_atualizacao = datetime.now()
        egresso.atualizado_por = current_user.id
        
        db.commit()
        db.refresh(egresso)
        
        # Buscar dados do aluno para resposta
        aluno = db.query(models.Aluno).filter(
            models.Aluno.matricula == egresso.aluno_matricula
        ).first()
        
        resposta = {
            **egresso.__dict__,
            "aluno_nome": aluno.nome if aluno else "N/A",
            "curso": aluno.curso.nome if aluno and aluno.curso else "N/A"
        }
        
        # Log de auditoria
        audit_log = models.AuditLog(
            usuario_id=current_user.id,
            acao="ATUALIZAR_EGRESSO",
            detalhes=f"Egresso atualizado: {egresso.id}",
            ip_address=request.client.host if request.client else None
        )
        db.add(audit_log)
        db.commit()
        
        return resposta
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar egresso: {str(e)}"
        )


@app.delete("/egressos/{egresso_id}", status_code=status.HTTP_200_OK)
def excluir_egresso(
    egresso_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Exclui um egresso (APENAS ADMIN).
    """
    # Verificar se é admin
    if current_user.role.nome != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem excluir egressos"
        )
    
    try:
        egresso = db.query(models.Egresso).filter(
            models.Egresso.id == egresso_id
        ).first()
        
        if not egresso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Egresso não encontrado"
            )
        
        aluno_nome = egresso.aluno.nome if egresso.aluno else "Desconhecido"
        
        db.delete(egresso)
        db.commit()
        
        # Log de auditoria
        audit_log = models.AuditLog(
            usuario_id=current_user.id,
            acao="EXCLUIR_EGRESSO",
            detalhes=f"Egresso excluído: {aluno_nome} (ID: {egresso_id})",
            ip_address=request.client.host if request.client else None
        )
        db.add(audit_log)
        db.commit()
        
        return {
            "message": "Egresso excluído com sucesso",
            "egresso_id": egresso_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir egresso: {str(e)}"
        )


@app.get("/egressos/estatisticas", response_model=schemas.EgressoStatsResponse)
def estatisticas_egressos(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user)
):
    """
    Obtém estatísticas gerais de egressos.
    """
    try:
        total_egressos = db.query(models.Egresso).count()
        total_abandonos = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "ABANDONO"
        ).count()
        total_transferencias = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "TRANSFERENCIA"
        ).count()
        total_conclusoes = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "CONCLUSAO"
        ).count()
        abandonos_preditos = db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == "ABANDONO",
            models.Egresso.tinha_predicao_risco == True
        ).count()
        
        percentual_predicao_correta = (
            round((abandonos_preditos / total_abandonos * 100), 2)
            if total_abandonos > 0 else 0
        )
        
        return {
            "total_egressos": total_egressos,
            "total_abandonos": total_abandonos,
            "total_transferencias": total_transferencias,
            "total_conclusoes": total_conclusoes,
            "abandonos_preditos": abandonos_preditos,
            "percentual_predicao_correta": percentual_predicao_correta
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )


# ============================================
# REGISTRAR ROTAS DE NOTIFICAÇÕES
# ============================================

app.include_router(notificacoes_router, prefix="/api/v1")

# ============================================
# IMPORTS NECESSÁRIOS (no final para evitar circular)
# ============================================
import models
