import csv
import io
import threading
import time as time_module
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

import auth
import database
import models
from limiter import limiter
from ml_logic_v2 import calcular_risco_evasao

router = APIRouter()

_progress_store: dict = {}
_progress_lock = threading.Lock()
_MAX_STORE_SIZE = 100
_STORE_TTL_SECONDS = 3600

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"text/csv", "application/vnd.ms-excel", "application/octet-stream"}


def _cleanup_progress_store():
    now = time_module.time()
    with _progress_lock:
        expired = [
            k for k, v in _progress_store.items()
            if v.get("status") in ("concluido", "erro")
            and (now - v.get("_updated", 0)) > _STORE_TTL_SECONDS
        ]
        for k in expired:
            del _progress_store[k]
        if len(_progress_store) > _MAX_STORE_SIZE:
            oldest = sorted(_progress_store.keys())[:len(_progress_store) - _MAX_STORE_SIZE]
            for k in oldest:
                del _progress_store[k]


def _processar_em_background(job_id: str, contents_str: str, delimiter: str):
    from database import SessionLocal

    db = SessionLocal()
    try:
        reader = csv.DictReader(io.StringIO(contents_str), delimiter=delimiter)
        rows = list(reader)
        total = len(rows)
        hoje = datetime.now()

        _progress_store[job_id] = {"status": "processando", "processados": 0, "total": total,
                                    "importados": 0, "erros": 0, "predicoes": 0,
                                    "_updated": time_module.time()}

        imp = err = pred = freq = 0
        erros_detalhes = []

        for idx, row in enumerate(rows, start=2):
            try:
                curso = db.query(models.Curso).filter(
                    models.Curso.nome.ilike(f"%{row.get('curso', '').strip()}%")
                ).first()
                if not curso:
                    erros_detalhes.append(f"Curso '{row.get('curso', '').strip()}' não encontrado")
                    err += 1; continue

                data = {
                    "matricula": row.get("matricula", "").strip(),
                    "nome": row.get("nome", "").strip(),
                    "email": row.get("email", "").strip() or None,
                    "telefone": row.get("telefone", "").strip() or None,
                    "curso_id": curso.id,
                    "periodo": int(row.get("periodo", 1)),
                    "turno": row.get("turno", "MATUTINO").upper(),
                    "media_geral": float(row.get("media_geral", 0)) or None,
                    "frequencia": float(row.get("frequencia", 0)) or None,
                    "historico_reprovas": int(row.get("historico_reprovas", 0)) or 0,
                    "ano_ingresso": int(row.get("ano_ingresso", datetime.now().year)) or None,
                    "cidade": row.get("cidade", "").strip() or None,
                    "renda_familiar": float(row.get("renda_familiar", 0)) or None,
                    "trabalha": row.get("trabalha", "false").lower() == "true",
                    "possui_auxilio": row.get("possui_auxilio", "false").lower() == "true",
                    "possui_computador": row.get("possui_computador", "false").lower() == "true",
                    "possui_internet": row.get("possui_internet", "false").lower() == "true",
                }

                if row.get("data_nascimento"):
                    try: data["data_nascimento"] = datetime.strptime(row["data_nascimento"], "%Y-%m-%d").date()
                    except Exception: pass

                for c in ["idade", "carga_horaria_trabalho", "tempo_deslocamento"]:
                    if row.get(c):
                        try: data[c] = int(row[c])
                        except Exception: pass
                for c in ["coeficiente_rendimento", "renda_per_capita", "custo_transporte_diario"]:
                    if row.get(c):
                        try: data[c] = float(row[c])
                        except Exception: pass
                for c in ["beneficiario_bolsa_familia", "primeiro_geracao_universidade", "usa_transporte_alternativo"]:
                    if row.get(c): data[c] = row[c].lower() == "true"

                if row.get("sexo"): data["sexo"] = row["sexo"].upper()
                if row.get("zona_residencial"): data["zona_residencial"] = row["zona_residencial"].upper()
                if row.get("dificuldade_acesso"): data["dificuldade_acesso"] = row["dificuldade_acesso"].upper()

                if db.query(models.Aluno).filter(models.Aluno.matricula == data["matricula"]).first():
                    erros_detalhes.append(f"Matrícula {data['matricula']} já existe")
                    err += 1; continue

                aluno = models.Aluno(**data)
                db.add(aluno); db.flush(); db.commit()
                imp += 1

                if data.get("frequencia") and data["frequencia"] > 0:
                    try:
                        fe = db.query(models.FrequenciaMensal).filter(
                            models.FrequenciaMensal.aluno_id == aluno.matricula,
                            models.FrequenciaMensal.mes == hoje.month,
                            models.FrequenciaMensal.ano == hoje.year).first()
                        if not fe:
                            db.add(models.FrequenciaMensal(
                                aluno_id=aluno.matricula, mes=hoje.month, ano=hoje.year,
                                frequencia=data["frequencia"], total_aulas_mes=20,
                                faltas_justificadas=0, faltas_nao_justificadas=0,
                                observacoes="Importado via CSV"))
                            freq += 1; db.commit()
                    except Exception: db.rollback()

                try:
                    r = calcular_risco_evasao(aluno, db)
                    db.add(models.Predicao(aluno_id=aluno.matricula, risco_evasao=r["risco_evasao"],
                            nivel_risco=r["nivel_risco"], fatores_principais=r["fatores_principais"],
                            modelo_ml_versao="1.0.0"))
                    pred += 1; db.commit()
                except: db.rollback()

            except Exception as e: db.rollback(); err += 1; erros_detalhes.append(str(e))

            _progress_store[job_id] = {"status": "processando", "processados": idx - 1,
                                        "total": total, "importados": imp, "erros": err, "predicoes": pred,
                                        "erros_detalhes": erros_detalhes[-50:],
                                        "_updated": time_module.time()}

        _progress_store[job_id] = {"status": "concluido", "processados": total,
                                    "total": total, "importados": imp, "erros": err, "predicoes": pred,
                                    "erros_detalhes": erros_detalhes[-50:],
                                    "_updated": time_module.time()}
    except Exception as e:
        _progress_store[job_id] = {"status": "erro", "mensagem": str(e),
                                    "_updated": time_module.time()}
    finally:
        db.close()


@router.post("/alunos/delete-multiple")
def delete_multiple_alunos(
    matriculas: list[str],
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    if not matriculas:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lista vazia")
    alunos = db.query(models.Aluno).filter(models.Aluno.matricula.in_(matriculas)).all()
    if not alunos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum aluno encontrado")
    for a in alunos: db.delete(a)
    db.commit()
    return {"message": f"{len(alunos)} excluidos", "excluidos": len(alunos), "matriculas": matriculas}


@router.get("/alunos/importar-csv/progress/{job_id}")
def importar_csv_progress(job_id: str):
    _cleanup_progress_store()
    p = _progress_store.get(job_id)
    if not p:
        raise HTTPException(status_code=404, detail="Job nao encontrado")
    return {k: v for k, v in p.items() if not k.startswith("_")}


@router.post("/alunos/importar-csv")
@limiter.limit("5/minute")
def importar_alunos_csv(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissao negada")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de arquivo invalido")
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Extensao deve ser .csv")

    contents_bytes = file.file.read()
    if len(contents_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo > 10MB")

    preview = contents_bytes[:1024].decode("utf-8-sig", errors="ignore").lower()
    if "<html" in preview or "<!doctype" in preview or "<script" in preview:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Conteudo invalido")

    contents = contents_bytes.decode("utf-8-sig")
    first_line = contents.split("\n")[0].lower()
    if "matricula" not in first_line and "nome" not in first_line:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cabecalho invalido")

    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","
    job_id = str(uuid.uuid4())[:8]

    thread = threading.Thread(target=_processar_em_background, args=(job_id, contents, delimiter), daemon=True)
    thread.start()

    return {"job_id": job_id, "message": "Importacao iniciada", "status": "iniciado"}
