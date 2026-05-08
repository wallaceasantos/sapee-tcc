"""
Script para criar as tabelas de comunicações e templates.
Executar uma única vez.
"""
import pymysql

config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'S@nx5497',
    'database': 'sapee_dewas',
    'cursorclass': pymysql.cursors.DictCursor
}

try:
    connection = pymysql.connect(**config)
    with connection.cursor() as cursor:
        # Verificar tabela comunicacoes
        cursor.execute("""
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'sapee_dewas' AND TABLE_NAME = 'comunicacoes'
        """)
        if cursor.fetchone()['count'] == 0:
            print("🔄 Criando tabela comunicacoes...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS `comunicacoes` (
                    `id` INT NOT NULL AUTO_INCREMENT,
                    `aluno_matricula` VARCHAR(20) NOT NULL,
                    `usuario_id` INT NULL COMMENT 'Profissional que enviou (NULL = automático)',
                    `destinatario_tipo` ENUM('RESPONSAVEL', 'ALUNO', 'COORDENADOR', 'PROFESSOR') NOT NULL,
                    `destinatario_nome` VARCHAR(100) NOT NULL,
                    `destinatario_contato` VARCHAR(50) NULL,
                    `tipo_comunicacao` ENUM('FALTAS', 'RISCO', 'ATENDIMENTO', 'LEMBRETE', 'MANUAL', 'ENCAMINHAMENTO') NOT NULL,
                    `canal` ENUM('WHATSAPP', 'SMS', 'EMAIL', 'SISTEMA') NOT NULL DEFAULT 'SISTEMA',
                    `assunto` VARCHAR(200) NULL,
                    `mensagem` TEXT NOT NULL,
                    `template_id` VARCHAR(50) NULL,
                    `status` ENUM('PENDENTE', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
                    `data_envio` DATETIME NULL,
                    `data_leitura` DATETIME NULL,
                    `erro_motivo` TEXT NULL,
                    `eh_lembrete` TINYINT(1) NOT NULL DEFAULT 0,
                    `data_agendada` DATETIME NULL,
                    `data_envio_efetivo` DATETIME NULL,
                    `recebeu_resposta` TINYINT(1) NOT NULL DEFAULT 0,
                    `resposta_conteudo` TEXT NULL,
                    `data_resposta` DATETIME NULL,
                    `criado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `atualizado_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    INDEX `idx_comunicacoes_aluno` (`aluno_matricula`),
                    INDEX `idx_comunicacoes_usuario` (`usuario_id`),
                    INDEX `idx_comunicacoes_tipo` (`tipo_comunicacao`),
                    INDEX `idx_comunicacoes_canal` (`canal`),
                    INDEX `idx_comunicacoes_status` (`status`),
                    INDEX `idx_comunicacoes_data_agendada` (`data_agendada`),
                    INDEX `idx_comunicacoes_eh_lembrete` (`eh_lembrete`),
                    CONSTRAINT `fk_comunicacoes_aluno` FOREIGN KEY (`aluno_matricula`) REFERENCES `alunos` (`matricula`) ON DELETE CASCADE,
                    CONSTRAINT `fk_comunicacoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de todas as comunicações e notificações do sistema'
            """)
            print("✅ Tabela comunicacoes criada!")
        else:
            print("ℹ️ Tabela comunicacoes já existe.")

        # Verificar tabela templates_comunicacao
        cursor.execute("""
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'sapee_dewas' AND TABLE_NAME = 'templates_comunicacao'
        """)
        if cursor.fetchone()['count'] == 0:
            print("🔄 Criando tabela templates_comunicacao...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS `templates_comunicacao` (
                    `id` INT NOT NULL AUTO_INCREMENT,
                    `codigo` VARCHAR(50) NOT NULL UNIQUE,
                    `nome` VARCHAR(100) NOT NULL,
                    `tipo_comunicacao` ENUM('FALTAS', 'RISCO', 'ATENDIMENTO', 'LEMBRETE', 'MANUAL', 'ENCAMINHAMENTO') NOT NULL,
                    `canal` ENUM('WHATSAPP', 'SMS', 'EMAIL', 'SISTEMA') NOT NULL DEFAULT 'SISTEMA',
                    `assunto` VARCHAR(200) NULL,
                    `conteudo` TEXT NOT NULL,
                    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
                    `criado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    INDEX `idx_templates_tipo` (`tipo_comunicacao`),
                    INDEX `idx_templates_canal` (`canal`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Templates de mensagens para comunicações automáticas'
            """)
            
            # Inserir templates padrão
            print("📝 Inserindo templates padrão...")
            templates = [
                ('FALTAS_3_WHATSAPP', '3 Faltas - WhatsApp Responsável', 'FALTAS', 'WHATSAPP', None,
                 'Prezado(a) {nome_responsavel}, informamos que {nome_aluno} acumula {qtd_faltas} faltas consecutivas em {disciplina}. Solicitamos contato com a coordenação. SAPEE DEWAS'),
                ('FALTAS_5_WHATSAPP', '5 Faltas - WhatsApp Responsável', 'FALTAS', 'WHATSAPP', None,
                 '⚠️ ATENÇÃO: {nome_aluno} possui {qtd_faltas} faltas em {disciplina}. É necessário agendar reunião com a coordenação pedagógica. SAPEE DEWAS'),
                ('RISCO_ALTO_WHATSAPP', 'Risco ALTO - WhatsApp Responsável', 'RISCO', 'WHATSAPP', None,
                 'Prezado(a) {nome_responsavel}, identificamos que {nome_aluno} apresenta risco de evasão de {risco_evasao}%. É fundamental seu comparecimento à escola. SAPEE DEWAS'),
                ('ATENDIMENTO_LEMBRETE', 'Lembrete de Atendimento', 'ATENDIMENTO', 'WHATSAPP', None,
                 'Lembrete: {nome_aluno} possui atendimento agendado para {data_atendimento} às {hora_atendimento} com {profissional}. SAPEE DEWAS'),
                ('ENCAMINHAMENTO_STATUS', 'Atualização de Encaminhamento', 'ENCAMINHAMENTO', 'WHATSAPP', None,
                 'Prezado(a) {nome_responsavel}, o encaminhamento de {nome_aluno} para {destino_encaminhamento} foi atualizado para: {status_encaminhamento}. SAPEE DEWAS'),
            ]
            
            for codigo, nome, tipo, canal, assunto, conteudo in templates:
                cursor.execute(
                    "INSERT INTO templates_comunicacao (codigo, nome, tipo_comunicacao, canal, assunto, conteudo) VALUES (%s, %s, %s, %s, %s, %s)",
                    (codigo, nome, tipo, canal, assunto, conteudo)
                )
            
            print("✅ Templates inseridos!")
        else:
            print("ℹ️ Tabela templates_comunicacao já existe.")

        connection.commit()
        print("\n🎉 Migração de comunicações concluída com sucesso!")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
