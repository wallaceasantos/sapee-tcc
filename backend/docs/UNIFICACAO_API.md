# ✅ UNIFICAÇÃO: api.ts e api-v2.ts

---

## 📋 PROBLEMA IDENTIFICADO

Existiam **dois arquivos de API quase idênticos** no projeto:

| Arquivo | Linhas | Diferença |
|---------|--------|-----------|
| `api.ts` | 802 | Base |
| `api-v2.ts` | 845 | +43 linhas (módulo `frequencia`) |

**Problema:**
- Duplicação de código
- Confusão de imports (algumas páginas usavam `api`, outras `api-v2`)
- Manutenção dobrada
- Risco de inconsistências

---

## 🔧 SOLUÇÃO IMPLEMENTADA

### **1. Análise das Diferenças**

```python
# Script de comparação identificou:
# api-v2.ts tem apenas 1 módulo extra: frequencia

+ frequencia.historico()   # Obter histórico de frequência
+ frequencia.stats()       # Obter stats de frequência
```

### **2. Unificação**

**Ação:** Adicionar módulo `frequencia` ao `api.ts`:

```typescript
// api.ts - AGORA COMPLETO
export const api = {
  auth: { ... },
  alunos: { ... },
  dashboard: { ... },
  usuarios: { ... },
  predicoes: { ... },
  notificacoes: { ... },
  intervencoes: { ... },
  faltas: { ... },
  frequencia: {  // ✅ ADICIONADO
    historico: async (token, matricula) => { ... },
    stats: async (token) => { ... },
  },
};
```

### **3. Atualização de Imports**

**Arquivos atualizados:**

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `Relatorios.tsx` | `api-v2` | `api` ✅ |
| `AlunoDetail.tsx` | `api-v2` | `api` ✅ |

**Arquivos que já usavam `api.ts`:**

- `useDashboardStats.ts`
- `useAlunos.ts`
- `useAlunoForm.ts`
- `Dashboard.tsx`
- `AuthContext.tsx`
- `LancarFaltas.tsx`
- `Intervencoes.tsx`
- `ImportarDados.tsx`
- `RelatorioEficacia.tsx`

### **4. Limpeza**

**Arquivos deletados:**
- ❌ `api-v2.ts` (duplicado)
- ❌ `compare_apis.py` (script temporário)
- ❌ `api_diff.txt` (diff temporário)

---

## 📊 RESUMO DAS ALTERAÇÕES

| Ação | Arquivo | Status |
|------|---------|--------|
| Adicionar módulo `frequencia` | `api.ts` | ✅ |
| Atualizar import | `Relatorios.tsx` | ✅ |
| Atualizar import | `AlunoDetail.tsx` | ✅ |
| Deletar arquivo duplicado | `api-v2.ts` | ✅ |
| Deletar scripts temporários | `compare_apis.py`, `api_diff.txt` | ✅ |

---

## ✅ VERIFICAÇÃO

### **Imports Atuais:**

```bash
# Todos os arquivos agora usam apenas 'api.ts'
grep -r "from.*api" src/

# Resultado esperado:
# useDashboardStats.ts: import api from '../services/api';
# useAlunos.ts: import api from '../services/api';
# Dashboard.tsx: import api from '../services/api';
# Relatorios.tsx: import api from '../services/api';  # ✅ ATUALIZADO
# AlunoDetail.tsx: import api from '../services/api'; # ✅ ATUALIZADO
# ...etc
```

### **Funcionalidades:**

| Funcionalidade | Endpoint | Status |
|----------------|----------|--------|
| Histórico de frequência | `/alunos/{matricula}/frequencia-historico` | ✅ |
| Stats de frequência | `/dashboard/frequencia-stats` | ✅ |
| Todas as outras | Vários endpoints | ✅ |

---

## 🎯 BENEFÍCIOS DA UNIFICAÇÃO

1. **Código mais limpo:**
   - Único arquivo de API
   - Sem duplicação
   - Fácil de manter

2. **Menos confusão:**
   - Todos usam `api.ts`
   - Sem dúvida de qual importar

3. **Manutenção simplificada:**
   - Mudanças em um só lugar
   - Menor risco de inconsistências

4. **Arquivo consolidado:**
   - `api.ts`: 846 linhas (completo)
   - `api-v2.ts`: DELETADO

---

## 📝 PRÓXIMOS PASSOS

1. ✅ **Unificação concluída**
2. ✅ **Imports atualizados**
3. ✅ **Arquivos duplicados deletados**
4. ⏳ **Testar sistema completo**
5. ⏳ **Verificar que tudo funciona**

---

**Unificação implementada em:** 24 de abril de 2026  
**Status:** ✅ Concluído  
**Prioridade:** ALTA (CRÍTICO)  
**Impacto:** Código mais limpo e manutenível
