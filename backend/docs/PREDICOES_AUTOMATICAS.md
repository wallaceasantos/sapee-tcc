# 📚 Guia de Predições Automáticas - SAPEE DEWAS

## 🎯 **Nova Arquitetura Implementada**

### **Fluxo Automático:**

```
┌─────────────────────────────────────────────────────────┐
│                 CADASTRO DE ALUNO                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. API cria aluno                                      │
│     ↓                                                   │
│  2. Gera predição AUTOMATICAMENTE                       │
│     ↓                                                   │
│  3. Dashboard já mostra risco                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 **Endpoints Implementados**

### **1. Cadastro Individual (Automático)**

#### **POST `/alunos`**
```json
{
  "matricula": "2024101051",
  "nome": "Novo Aluno",
  "curso_id": 1,
  "periodo": 1,
  "media_geral": 8.0,
  "frequencia": 95.0,
  ...
}
```

**O Que Acontece:**
1. ✅ Cria aluno no banco
2. ✅ **Gera predição automaticamente**
3. ✅ Retorna aluno com predição

**Logs:**
```
✅ Predição gerada para Novo Aluno: BAIXO
```

---

#### **PUT `/alunos/{matricula}`**
```json
{
  "media_geral": 6.5,
  "frequencia": 80.0
}
```

**O Que Acontece:**
1. ✅ Atualiza dados do aluno
2. ✅ **Deleta predição antiga**
3. ✅ **Gera nova predição**

**Logs:**
```
✅ Predição atualizada para Novo Aluno: MEDIO
```

---

### **2. Geração em Lote (API)**

#### **POST `/predicoes/gerar-todas`**

**Quando Usar:**
- ✅ Após importar CSV
- ✅ Após cadastrar vários alunos manualmente
- ✅ Para corrigir dados

**Requisito:**
- 🔐 Apenas **ADMIN** pode executar

**Resposta:**
```json
{
  "message": "15 predições geradas com sucesso!",
  "alunos_processados": 15,
  "erros": 0,
  "total_alunos_sem_predicao": 15
}
```

**Como Usar:**

**Opção A: Swagger UI**
1. Acesse: http://localhost:8000/docs
2. Faça login como ADMIN
3. POST `/predicoes/gerar-todas`
4. Execute

**Opção B: curl**
```bash
curl -X POST http://localhost:8000/predicoes/gerar-todas \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

**Opção C: Frontend**
```typescript
await api.predicoes.gerarTodas(token)
```

---

#### **GET `/predicoes/resumo`**

**O Que Retorna:**
```json
{
  "total_alunos": 50,
  "alunos_com_predicao": 48,
  "alunos_sem_predicao": 2,
  "risco_alto": 10,
  "risco_medio": 15,
  "risco_baixo": 23,
  "percentual_com_predicao": 96.0
}
```

**Quando Usar:**
- ✅ Verificar integridade dos dados
- ✅ Dashboard administrativo
- ✅ Monitoramento

---

### **3. Script Manual (Manutenção)**

#### **`generate_predictions.py`**

**Comportamento Inteligente:**

**Cenário 1: Alunos sem predição**
```bash
$ python generate_predictions.py

📊 5 alunos sem predição encontrados.

🔍 Gerando predições para 5 alunos...
...
✅ OK: Todos os alunos possuem predições
```

**Cenário 2: Todos com predição**
```bash
$ python generate_predictions.py

✅ Todos os alunos já possuem predições!

Deseja REGERAR todas as predições? (s/n): 
```

**Quando Usar:**
- ✅ Manutenção corretiva
- ✅ Re-treinar modelo ML
- ✅ Corrigir inconsistências

---

## 🔄 **Fluxo de Importação CSV**

### **Fluxo Atualizado:**

```
┌─────────────────────────────────────────────────────────┐
│              IMPORTAÇÃO DE CSV                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Frontend faz upload do CSV                          │
│     ↓                                                   │
│  2. Backend importa alunos                              │
│     ↓                                                   │
│  3. Frontend chama: POST /predicoes/gerar-todas        │
│     ↓                                                   │
│  4. Backend gera predições para todos                   │
│     ↓                                                   │
│  5. Dashboard atualizado                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Implementação no Frontend:**

```typescript
// Após importar CSV
const handleImportComplete = async () => {
  // 1. Importar CSV (já existe)
  await api.alunos.importarCSV(file);
  
  // 2. Gerar predições em lote
  const resultado = await api.predicoes.gerarTodas(token);
  
  // 3. Mostrar resultado
  alert(`${resultado.alunos_processados} predições geradas!`);
  
  // 4. Recarregar dashboard
  window.location.reload();
};
```

---

## 📊 **Resumo da Arquitetura**

| Ação | Como Funciona | Quando |
|------|---------------|--------|
| **Cadastrar 1 aluno** | Gera predição automática | Sempre |
| **Editar aluno** | Atualiza predição | Sempre |
| **Importar CSV** | Chama `/predicoes/gerar-todas` | Após importar |
| **Manutenção** | `generate_predictions.py` | Quando necessário |

---

## ✅ **Vantagens da Nova Arquitetura**

| Antes | Depois |
|-------|--------|
| ❌ Esquecer de rodar script | ✅ Automático |
| ❌ Alunos sem predição | ✅ Sempre atualizado |
| ❌ Processo manual | ✅ Totalmente automático |
| ❌ Dashboard desatualizado | ✅ Tempo real |

---

## 🚀 **Próximos Passos**

1. ✅ **Backend implementado** - Funcional!
2. ⏳ **Atualizar Frontend** - Chamar `/predicoes/gerar-todas` após CSV
3. ⏳ **Testar fluxo completo** - Cadastro → Predição → Dashboard

---

**Documentação criada em:** Março 2026  
**Versão:** 2.0 (Automática)  
**Responsável:** Equipe DEWAS Sistemas
