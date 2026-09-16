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

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Análise completa do TCC2: verifica correspondência entre Lista de Figuras/Tabelas e corpo.
Gera relatório de problemas e salva correções como V5.
"""
import sys
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')
from docx import Document

INPUT = '../docs/TCC2/TCC2_SAPEE_COMPLETO_V4.docx'
OUTPUT = '../docs/TCC2/TCC2_SAPEE_COMPLETO_V5.docx'

doc = Document(INPUT)

# Heurística: fator de parágrafos por página (estimado ~18.5)
PARAGRAFOS_POR_PAGINA = 18.5

def estimar_pagina(idx):
    return max(1, int(idx / PARAGRAFOS_POR_PAGINA) + 1)

# ---------------------------------------------------------------------------
# Coletar figuras no corpo
# ---------------------------------------------------------------------------
figuras_no_corpo = []
for i, p in enumerate(doc.paragraphs):
    has_img = bool(p._element.xpath('.//w:drawing'))
    if has_img:
        figuras_no_corpo.append(i)

# Captions de figuras
fig_captions = {}
for i, p in enumerate(doc.paragraphs):
    txt = p.text.strip()
    if txt.startswith('Figura ') and (' - ' in txt or ':' in txt):
        # extrair número
        try:
            num = int(txt.split('Figura')[1].split()[0].split('-')[0].split(':')[0].strip())
            fig_captions[num] = (i, txt)
        except:
            pass
    elif '[INSERIR PRINTSCREEN: Figura ' in txt:
        try:
            num = int(txt.split('Figura')[1].split()[0].split('-')[0].strip())
            if num not in fig_captions:
                fig_captions[num] = (i, txt)
        except:
            pass

# Captions de tabelas principais (Lista de Tabelas)
tab_captions = {}
for i, p in enumerate(doc.paragraphs):
    txt = p.text.strip()
    if txt.startswith('Tabela ') and (' - ' in txt or ':' in txt):
        try:
            num = int(txt.split('Tabela')[1].split()[0].split('-')[0].split(':')[0].strip())
            tab_captions[num] = (i, txt)
        except:
            pass

# ---------------------------------------------------------------------------
# Relatório
# ---------------------------------------------------------------------------
print('=== RELATÓRIO DE ANÁLISE DO TCC2 V4 ===\n')

print('--- LISTA DE FIGURAS x CORPO ---')
for row in doc.tables[0].rows[1:]:
    num_str, desc, pag = [c.text for c in row.cells]
    try:
        num = int(num_str.replace('Figura ', '').strip())
    except:
        continue
    if num in fig_captions:
        idx, caption = fig_captions[num]
        has_img = idx in figuras_no_corpo
        placeholder = 'INSERIR PRINTSCREEN' in caption
        pag_est = estimar_pagina(idx)
        status = 'OK' if (has_img or placeholder) else 'IMAGEM AUSENTE'
        print(f'Figura {num}: caption no parágrafo {idx}, página estimada {pag_est}, status: {status}')
    else:
        print(f'Figura {num}: CAPTION NÃO ENCONTRADO NO CORPO')

print('\n--- FIGURAS NO CORPO SEM LISTA ---')
for num in sorted(fig_captions.keys()):
    if not any(row.cells[0].text == f'Figura {num}' for row in doc.tables[0].rows[1:]):
        idx, caption = fig_captions[num]
        print(f'Figura {num} no parágrafo {idx} não está na Lista de Figuras: {caption[:80]}')

print('\n--- LISTA DE TABELAS x CORPO ---')
for row in doc.tables[1].rows[1:]:
    num_str, desc, pag = [c.text for c in row.cells]
    try:
        num = int(num_str.replace('Tabela ', '').strip())
    except:
        continue
    if num in tab_captions:
        idx, caption = tab_captions[num]
        pag_est = estimar_pagina(idx)
        print(f'Tabela {num}: caption no parágrafo {idx}, página estimada {pag_est}')
    else:
        print(f'Tabela {num}: CAPTION NÃO ENCONTRADO NO CORPO')

print('\n--- REFERÊNCIAS CRUZADAS SUSPEITAS ---')
for i, p in enumerate(doc.paragraphs):
    txt = p.text
    if 'Figura ' in txt and 'dashboard' in txt.lower() and 'Figura 2' in txt:
        print(f'Parágrafo {i}: referência suspeita a Figura 2 no contexto de dashboard -> deveria ser Figura 1?')
        print(f'  Texto: {txt[:200]}')

print('\n--- PÁGINAS ESTIMADAS PARA ATUALIZAR ---')
# Figuras
for row in doc.tables[0].rows[1:]:
    num_str, desc, pag = [c.text for c in row.cells]
    try:
        num = int(num_str.replace('Figura ', '').strip())
    except:
        continue
    if num in fig_captions:
        idx, caption = fig_captions[num]
        pag_est = estimar_pagina(idx)
        if pag != str(pag_est):
            print(f'Figura {num}: lista={pag} -> estimada={pag_est}')

# Tabelas
for row in doc.tables[1].rows[1:]:
    num_str, desc, pag = [c.text for c in row.cells]
    try:
        num = int(num_str.replace('Tabela ', '').strip())
    except:
        continue
    if num in tab_captions:
        idx, caption = tab_captions[num]
        pag_est = estimar_pagina(idx)
        if pag != str(pag_est):
            print(f'Tabela {num}: lista={pag} -> estimada={pag_est}')
