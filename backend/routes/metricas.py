"""
Rotas de Metricas e Validacao do Modelo
SAPEE DEWAS Backend
"""

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import auth
import database
import models

router = APIRouter()

EVASAO_MOTIVOS = {"ABANDONO", "JUBILAMENTO"}
RISCO_ALTO = {"ALTO", "MUITO_ALTO"}


def _calcular_metricas(vp: int, vn: int, fp: int, fn: int) -> dict:
    total = vp + vn + fp + fn
    if total == 0:
        return {
            "total": 0,
            "vp": 0, "vn": 0, "fp": 0, "fn": 0,
            "acuracia": None, "precisao": None, "recall": None, "f1_score": None,
        }

    acuracia = round((vp + vn) / total * 100, 1) if total > 0 else None
    precisao = round(vp / (vp + fp) * 100, 1) if (vp + fp) > 0 else None
    recall = round(vp / (vp + fn) * 100, 1) if (vp + fn) > 0 else None
    f1 = round(2 * (precisao * recall) / (precisao + recall), 1) if (precisao and recall and (precisao + recall) > 0) else None

    return {
        "total": total,
        "vp": vp, "vn": vn, "fp": fp, "fn": fn,
        "acuracia": acuracia,
        "precisao": precisao,
        "recall": recall,
        "f1_score": f1,
    }


@router.get("/metricas/validacao-modelo")
def validacao_modelo(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Valida o modelo de predicao comparando predicoes com desfechos reais (egressos).

    Retorna:
    - Matriz de confusao global (VP, VN, FP, FN)
    - Metricas: Acuracia, Precisao, Recall, F1-Score
    - Detalhamento por nivel de risco
    - Detalhamento por coorte (ano de ingresso)
    - Lista de falsos negativos (alunos que evadiram sem alerta)
    """
    egressos = (
        db.query(
            models.Egresso.aluno_matricula,
            models.Egresso.motivo_saida,
            models.Egresso.nivel_risco_predito,
            models.Egresso.data_saida,
            models.Egresso.recebeu_intervencao,
            models.Aluno.ano_ingresso,
            models.Aluno.nome,
            models.Curso.nome.label("curso_nome"),
        )
        .join(models.Aluno, models.Egresso.aluno_matricula == models.Aluno.matricula)
        .join(models.Curso, models.Aluno.curso_id == models.Curso.id)
        .all()
    )

    if not egressos:
        raise HTTPException(
            status_code=404,
            detail="Nenhum egresso encontrado. Cadastre egressos para validar o modelo.",
        )

    matriz_global = {"vp": 0, "vn": 0, "fp": 0, "fn": 0}
    detalhes_nivel = defaultdict(lambda: {"total": 0, "vp": 0, "vn": 0, "fp": 0, "fn": 0})
    detalhes_coorte = defaultdict(lambda: {"total": 0, "vp": 0, "vn": 0, "fp": 0, "fn": 0})
    falsos_negativos = []

    for e in egressos:
        matricula = e.aluno_matricula
        motivo = e.motivo_saida
        nivel_predito_egresso = e.nivel_risco_predito
        evadiu = motivo in EVASAO_MOTIVOS
        ano = e.ano_ingresso or 0
        coorte = str(ano) if ano else "DESCONHECIDO"

        nivel_risco = nivel_predito_egresso
        if not nivel_risco:
            ultima_pred = (
                db.query(models.Predicao)
                .filter(
                    models.Predicao.aluno_id == matricula,
                    models.Predicao.data_predicao <= e.data_saida,
                )
                .order_by(models.Predicao.data_predicao.desc())
                .first()
            )
            nivel_risco = ultima_pred.nivel_risco.value if ultima_pred else None

        if not nivel_risco:
            nivel_risco = "BAIXO"

        pred_risco = nivel_risco in RISCO_ALTO

        if pred_risco and evadiu:
            matriz_global["vp"] += 1
            detalhes_nivel[nivel_risco]["vp"] += 1
            detalhes_coorte[coorte]["vp"] += 1
        elif pred_risco and not evadiu:
            matriz_global["fp"] += 1
            detalhes_nivel[nivel_risco]["fp"] += 1
            detalhes_coorte[coorte]["fp"] += 1
        elif not pred_risco and not evadiu:
            matriz_global["vn"] += 1
            detalhes_nivel[nivel_risco]["vn"] += 1
            detalhes_coorte[coorte]["vn"] += 1
        else:
            matriz_global["fn"] += 1
            detalhes_nivel[nivel_risco]["fn"] += 1
            detalhes_coorte[coorte]["fn"] += 1
            falsos_negativos.append({
                "matricula": matricula,
                "nome": e.nome,
                "curso": e.curso_nome,
                "motivo_saida": motivo,
                "nivel_predito": nivel_risco,
                "data_saida": e.data_saida.isoformat() if e.data_saida else None,
                "recebeu_intervencao": e.recebeu_intervencao or False,
                "ano_ingresso": ano,
            })

        for n in detalhes_nivel:
            detalhes_nivel[n]["total"] += 0
        detalhes_nivel[nivel_risco]["total"] = detalhes_nivel[nivel_risco].get("total", 0) + 1
        detalhes_coorte[coorte]["total"] = detalhes_coorte[coorte].get("total", 0) + 1

    metricas_global = _calcular_metricas(
        matriz_global["vp"], matriz_global["vn"],
        matriz_global["fp"], matriz_global["fn"],
    )

    niveis_formatados = {}
    for nivel, m in sorted(detalhes_nivel.items()):
        niveis_formatados[nivel] = {
            "total": m["vp"] + m["vn"] + m["fp"] + m["fn"],
            **_calcular_metricas(m["vp"], m["vn"], m["fp"], m["fn"]),
        }

    coortes_formatados = {}
    for coorte, m in sorted(detalhes_coorte.items()):
        coortes_formatados[coorte] = {
            "total": m["vp"] + m["vn"] + m["fp"] + m["fn"],
            **_calcular_metricas(m["vp"], m["vn"], m["fp"], m["fn"]),
        }

    falsos_negativos.sort(key=lambda x: x["data_saida"] or "", reverse=True)

    return {
        "metricas_globais": metricas_global,
        "matriz_confusao": matriz_global,
        "detalhes_por_nivel": niveis_formatados,
        "detalhes_por_coorte": coortes_formatados,
        "falsos_negativos": falsos_negativos[:20],
        "total_egressos": len(egressos),
        "total_evadidos": sum(1 for e in egressos if e.motivo_saida in EVASAO_MOTIVOS),
        "total_concluintes": sum(1 for e in egressos if e.motivo_saida == "CONCLUSAO"),
    }


@router.get("/metricas/fallback-eficacia")
def fallback_eficacia(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Compatibilidade com frontend antigo - redireciona para validacao-modelo."""
    result = validacao_modelo(current_user, db)
    mg = result["metricas_globais"]
    mc = result["matriz_confusao"]

    return {
        "total_avaliado": mg["total"],
        "acertos": mc["vp"] + mc["vn"],
        "erros": mc["fp"] + mc["fn"],
        "taxa_acerto_geral": mg["acuracia"],
        "acuracia": mg["acuracia"],
        "precisao": mg["precisao"],
        "recall": mg["recall"],
        "f1_score": mg["f1_score"],
        "verdadeiros_positivos": mc["vp"],
        "verdadeiros_negativos": mc["vn"],
        "falsos_positivos": mc["fp"],
        "falsos_negativos": mc["fn"],
        "detalhes_por_nivel": result["detalhes_por_nivel"],
    }
