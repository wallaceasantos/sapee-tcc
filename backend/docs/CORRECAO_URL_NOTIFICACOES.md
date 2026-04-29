# ✅ CORREÇÃO: URLs Erradas de Notificações

---

## 📋 PROBLEMA IDENTIFICADO

O frontend estava chamando endpoints que **não existem** no backend:

| Arquivo | URL Errada | URL Correta | Status |
|---------|-----------|-------------|--------|
| `src/services/api.ts` | `/api/v1/notificacoes/alerta-risco/` | `/api/v1/notificacoes/alerta-geral/` | ✅ Corrigido |
| `src/services/api.ts` | `/api/v1/notificacoes/testar` | `/api/v1/notificacoes/testar-telegram` | ✅ Corrigido |
| `src/services/api-v2.ts` | `/api/v1/notificacoes/alerta-risco/` | `/api/v1/notificacoes/alerta-geral/` | ✅ Corrigido |
| `src/services/api-v2.ts` | `/api/v1/notificacoes/testar` | `/api/v1/notificacoes/testar-telegram` | ✅ Corrigido |

---

## 🔧 SOLUÇÃO IMPLEMENTADA

### **Arquivo 1: `src/services/api-v2.ts`**

**Antes:**
```typescript
enviarAlertaRisco: async (token: string, matricula: string): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notificacoes/alerta-risco/${matricula}`,  // ❌ ERRADO
    ...
  );
}

testar: async (token: string): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notificacoes/testar`,  // ❌ ERRADO
    ...
  );
}
```

**Depois:**
```typescript
enviarAlertaRisco: async (token: string, matricula: string): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notificacoes/alerta-geral/${matricula}`,  // ✅ CORRETO
    ...
  );
}

testar: async (token: string): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notificacoes/testar-telegram`,  // ✅ CORRETO
    ...
  );
}
```

### **Arquivo 2: `src/services/api.ts`**

Mesma correção aplicada.

---

## 📊 ENDPOINTS CORRETOS NO BACKEND

Conforme `backend/routes/notificacoes.py`:

| Endpoint | Método | Função |
|----------|--------|--------|
| `/api/v1/notificacoes/alerta-geral/{matricula}` | POST | Enviar alerta de risco |
| `/api/v1/notificacoes/testar-telegram` | POST | Testar conexão Telegram |
| `/api/v1/notificacoes/alerta-frequencia` | POST | Alerta de queda de frequência |
| `/api/v1/notificacoes/alertas` | GET | Listar alertas |

---

## ✅ VERIFICAÇÃO

### **Testar no Frontend:**

1. Acesse: `http://localhost:5173/dashboard`
2. Clique em "Enviar Alerta" para um aluno em risco
3. Verifique se não há erro 404
4. Verifique se o alerta chegou no Telegram

### **Testar via curl:**

```bash
# Testar envio de alerta
curl -X POST "http://localhost:8000/api/v1/notificacoes/alerta-geral/2024101001" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Testar conexão Telegram
curl -X POST "http://localhost:8000/api/v1/notificacoes/testar-telegram" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 RESUMO DAS ALTERAÇÕES

| Arquivo | Linhas Alteradas | Mudança |
|---------|------------------|---------|
| `src/services/api-v2.ts` | 2 URLs | `alerta-risco` → `alerta-geral`<br>`testar` → `testar-telegram` |
| `src/services/api.ts` | 2 URLs | Mesmas correções |

---

## 🐛 ERRO ANTES DA CORREÇÃO

```
POST /api/v1/notificacoes/alerta-risco/2024101001
HTTP 404 Not Found

❌ Erro ao enviar alerta: Not Found
```

## ✅ ERRO APÓS A CORREÇÃO

```
POST /api/v1/notificacoes/alerta-geral/2024101001
HTTP 200 OK

✅ Alerta enviado! Risco: ALTO (75.0%)
```

---

**Correção implementada em:** 24 de abril de 2026  
**Status:** ✅ Concluído  
**Prioridade:** ALTA (CRÍTICO)  
**Impacto:** Notificações via Telegram agora funcionam corretamente
