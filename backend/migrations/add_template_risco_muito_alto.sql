-- ============================================================
-- SCRIPT DE INSERÇÃO: Template Risco MUITO ALTO
-- ============================================================
-- Adiciona o template específico para riscos críticos (MUITO_ALTO)
--
-- Execute: mysql -u seu_usuario -p sapee_db < add_template_risco_muito_alto.sql
-- ============================================================

INSERT INTO templates_comunicacao (codigo, nome, tipo_comunicacao, canal, conteudo, ativo) 
VALUES (
    'RISCO_MUITO_ALTO_NOTIFICACAO', 
    'Risco MUITO ALTO - WhatsApp Responsável', 
    'RISCO', 
    'WHATSAPP', 
    'Olá, {nome_responsavel}! Aqui é da escola.\n\n🚨 ALERTA CRÍTICO: Risco de Evasão Iminente\n👤 Aluno(a): {nome_aluno}\n📊 Nível de Risco: {nivel_risco}\n📈 Score: {risco_percentual}%\n\n⚠️ A situação do(a) aluno(a) é GRAVE. Solicitamos sua presença URGENTE na escola para evitarmos a evasão escolar. Por favor, entre em contato com a secretaria imediatamente.\n\nAtenciosamente,\nEquipe SAPEE',
    1
);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
