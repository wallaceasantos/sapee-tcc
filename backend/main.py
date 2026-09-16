import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Rate Limiting
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from limiter import limiter
from logging_config import setup_logging
from routes.acoes_massa import router as acoes_massa_router
from routes.alertas_faltas import router as alertas_faltas_router
from routes.alunos import router as alunos_router
from routes.analytics import router as analytics_router
from routes.atendimentos import router as atendimentos_router
from routes.audit_logs import router as audit_logs_router
from routes.auth import router as auth_router
from routes.comunicacoes import router as comunicacoes_router
from routes.configuracoes import router as configuracoes_router
from routes.cursos import router as cursos_router
from routes.dashboard import router as dashboard_router
from routes.disciplinas import router as disciplinas_router
from routes.egressos import router as egressos_router
from routes.frequencia import router as frequencia_router
from routes.health import router as health_router
from routes.intervencoes import router as intervencoes_router
from routes.metricas import router as metricas_router
from routes.notas import router as notas_router
from routes.notificacoes import router as notificacoes_router
from routes.notificacoes_faltas import router as notificacoes_faltas_router
from routes.planos_acao import router as planos_acao_router
from routes.predicoes import router as predicoes_router
from routes.questionario import router as questionario_router
from routes.relatorios import router as relatorios_router
from routes.usuarios import router as usuarios_router

# ============================================
# CONFIGURAÇÃO DE LOGGING
# ============================================
setup_logging()

# ============================================
# CONFIGURAÇÃO INICIAL
# ============================================

# Criar app FastAPI
app = FastAPI(
    title="SAPEE DEWAS API",
    description="Sistema de Alerta de Predição de Evasão Escolar",
    version="1.0.0",
)

# Adicionar rate limiter ao app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================
# CONFIGURAÇÃO DE CORS (Permitir Frontend)
# ============================================

# Define as origens permitidas (Locais + Railway + Ngrok)
origens_permitidas = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3001",
    "https://sapee-dewas.up.railway.app",
    os.getenv("FRONTEND_URL", ""),
    os.getenv("PUBLIC_URL", ""),
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


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if os.getenv("ENVIRONMENT") == "production" and request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ============================================
# HANDLERS GLOBAIS DE EXCEÇÃO
# ============================================

logger = logging.getLogger(__name__)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(
        "HTTP %s em %s %s: %s",
        exc.status_code,
        request.method,
        request.url.path,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append(f"{field}: {error['msg']}")
    logger.warning(
        "Erro de validação em %s %s: %s",
        request.method,
        request.url.path,
        errors,
    )
    return JSONResponse(
        status_code=422,
        content={"detail": "Erro de validação", "errors": errors},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Erro não tratado em %s %s: %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor. O erro foi registrado para análise."},
    )


# ============================================
# ENDPOINTS - SAÚDE & INFO
# ============================================


@app.get("/")
def read_root():
    """Endpoint de teste"""
    return {"message": "SAPEE DEWAS API", "version": "1.0.0", "status": "running"}


# ============================================
# REGISTRAR ROTAS
# ============================================

app.include_router(health_router, prefix="")
app.include_router(auth_router, prefix="")
app.include_router(usuarios_router, prefix="")
app.include_router(cursos_router, prefix="")
app.include_router(audit_logs_router, prefix="")
app.include_router(alunos_router, prefix="")
app.include_router(acoes_massa_router, prefix="")
app.include_router(frequencia_router, prefix="")
app.include_router(predicoes_router, prefix="")
app.include_router(dashboard_router, prefix="")
app.include_router(intervencoes_router, prefix="")
app.include_router(relatorios_router, prefix="")
app.include_router(analytics_router, prefix="")
app.include_router(planos_acao_router, prefix="")
app.include_router(alertas_faltas_router, prefix="")
app.include_router(questionario_router, prefix="")
app.include_router(egressos_router, prefix="")
app.include_router(disciplinas_router, prefix="")
app.include_router(notas_router, prefix="")
app.include_router(atendimentos_router, prefix="")
app.include_router(comunicacoes_router, prefix="")
app.include_router(configuracoes_router, prefix="")
app.include_router(metricas_router, prefix="")

# ============================================
# REGISTRAR ROTAS DE NOTIFICAÇÕES
# ============================================

app.include_router(notificacoes_router, prefix="/api/v1")
app.include_router(notificacoes_faltas_router, prefix="")

# ============================================
# MIDDLEWARE - LOGGING DE REQUESTS
# ============================================


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware para logar tempo de resposta e status de cada request."""
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "client_ip": request.client.host if request.client else None,
        },
    )
    return response


# ============================================
# IMPORTS NECESSÁRIOS (no final para evitar circular)
# ============================================
