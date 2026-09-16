/**
 * Página de Configurações do Sistema - SAPEE DEWAS
 * 
 * Funcionalidades:
 * - Editar Templates de Mensagens
 * - Configurar Limiares de Alerta (Faltas e Risco)
 * - Dados da Instituição
 * - Canais de Comunicação (Email, Telegram, WhatsApp)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, AlertTriangle, MessageSquare, Building, School, CheckCircle, X, Loader2, Send, Mail, CheckCheck, AlertOctagon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { formatarTelefone, validarTelefone } from '../utils/telefone';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

interface Configuracao {
  id: number;
  chave: string;
  valor: string;
  descricao?: string;
}

type CanalTipo = 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';

export default function Configuracoes() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [abaAtiva, setAbaAtiva] = useState<'instituicao' | 'alertas' | 'templates' | 'canais'>('instituicao');
  const [configuracoes, setConfiguracoes] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Array<{ id: number; nome: string; codigo: string; conteudo: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [editandoTemplate, setEditandoTemplate] = useState<number | null>(null);
  const [templateEditando, setTemplateEditando] = useState('');

  const [canalExpandido, setCanalExpandido] = useState<CanalTipo | null>(null);
  const [testandoCanal, setTestandoCanal] = useState<CanalTipo | null>(null);
  const [resultadoTeste, setResultadoTeste] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  const [canalEmail, setCanalEmail] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', email_from: '', email_from_name: '' });
  const [canalTelegram, setCanalTelegram] = useState({ bot_token: '', chat_id: '' });
  const [canalWhatsapp, setCanalWhatsapp] = useState({ account_sid: '', auth_token: '', whatsapp_number: '' });

  const carregarDados = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const configs = await api.configuracoes.list(token);
      const mapa: Record<string, string> = {};
      configs.forEach((c: Configuracao) => mapa[c.chave] = c.valor);
      setConfiguracoes(mapa);

      setCanalEmail({
        smtp_host: mapa.email_smtp_host || 'smtp.gmail.com',
        smtp_port: mapa.email_smtp_port || '587',
        smtp_user: mapa.email_smtp_user || '',
        smtp_pass: mapa.email_smtp_pass || '',
        email_from: mapa.email_from || '',
        email_from_name: mapa.email_from_name || 'SAPEE',
      });
      setCanalTelegram({
        bot_token: mapa.telegram_bot_token || '',
        chat_id: mapa.telegram_chat_id || '',
      });
      setCanalWhatsapp({
        account_sid: mapa.whatsapp_account_sid || '',
        auth_token: mapa.whatsapp_auth_token || '',
        whatsapp_number: mapa.whatsapp_number || '',
      });

      const temps = await api.comunicacoes.templates.list(token);
      setTemplates(temps);
    } catch (error) {
      addToast({ type: 'error', title: 'Erro', message: error instanceof Error ? error.message : 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const salvarConfiguracoes = async () => {
    if (!token) return;
    setSalvando(true);
    try {
      await api.configuracoes.updateBatch(token, configuracoes);
      addToast({ type: 'success', title: 'Sucesso!', message: 'Configurações salvas com sucesso' });
    } catch (error) {
      addToast({ type: 'error', title: 'Erro', message: error instanceof Error ? error.message : 'Erro ao salvar configurações' });
    } finally {
      setSalvando(false);
    }
  };

  const salvarCanal = async (canal: CanalTipo) => {
    if (!token) return;
    const updates: Record<string, string> = {};
    if (canal === 'EMAIL') {
      updates.email_smtp_host = canalEmail.smtp_host;
      updates.email_smtp_port = canalEmail.smtp_port;
      updates.email_smtp_user = canalEmail.smtp_user;
      updates.email_smtp_pass = canalEmail.smtp_pass;
      updates.email_from = canalEmail.email_from;
      updates.email_from_name = canalEmail.email_from_name;
    } else if (canal === 'TELEGRAM') {
      updates.telegram_bot_token = canalTelegram.bot_token;
      updates.telegram_chat_id = canalTelegram.chat_id;
    } else if (canal === 'WHATSAPP') {
      updates.whatsapp_account_sid = canalWhatsapp.account_sid;
      updates.whatsapp_auth_token = canalWhatsapp.auth_token;
      updates.whatsapp_number = canalWhatsapp.whatsapp_number;
    }
    try {
      await api.configuracoes.updateBatch(token, updates);
      setConfiguracoes(prev => ({ ...prev, ...updates }));
      addToast({ type: 'success', title: 'Sucesso!', message: `Configuração de ${canal === 'EMAIL' ? 'Email' : canal === 'TELEGRAM' ? 'Telegram' : 'WhatsApp'} salva!` });
    } catch (error) {
      addToast({ type: 'error', title: 'Erro', message: error instanceof Error ? error.message : 'Erro ao salvar canal' });
    }
  };

  const testarCanal = async (canal: CanalTipo) => {
    if (!token) return;
    setTestandoCanal(canal);
    setResultadoTeste(null);
    try {
      const payload: any = { canal };
      if (canal === 'EMAIL') {
        payload.smtp_host = canalEmail.smtp_host;
        payload.smtp_port = parseInt(canalEmail.smtp_port) || 587;
        payload.smtp_user = canalEmail.smtp_user;
        payload.smtp_pass = canalEmail.smtp_pass;
        payload.email_from = canalEmail.email_from;
        payload.email_from_name = canalEmail.email_from_name;
      } else if (canal === 'TELEGRAM') {
        payload.telegram_bot_token = canalTelegram.bot_token;
        payload.telegram_chat_id = canalTelegram.chat_id;
      } else if (canal === 'WHATSAPP') {
        payload.twilio_account_sid = canalWhatsapp.account_sid;
        payload.twilio_auth_token = canalWhatsapp.auth_token;
        payload.twilio_whatsapp_number = canalWhatsapp.whatsapp_number;
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/configuracoes/testar-canal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setResultadoTeste({ sucesso: data.sucesso, mensagem: data.mensagem });
      if (data.sucesso) {
        addToast({ type: 'success', title: 'Teste OK!', message: data.mensagem });
      } else {
        addToast({ type: 'error', title: 'Falha no Teste', message: data.mensagem });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao testar';
      setResultadoTeste({ sucesso: false, mensagem: msg });
      addToast({ type: 'error', title: 'Erro', message: msg });
    } finally {
      setTestandoCanal(null);
    }
  };

  const atualizarConfig = (chave: string, valor: string) => {
    setConfiguracoes(prev => ({ ...prev, [chave]: valor }));
  };

  const salvarTemplate = async (id: number) => {
    if (!token) return;
    try {
      await api.comunicacoes.templates.update(token, id, { conteudo: templateEditando });
      setEditandoTemplate(null);
      carregarDados();
      addToast({ type: 'success', title: 'Sucesso!', message: 'Template atualizado' });
    } catch (error) {
      addToast({ type: 'error', title: 'Erro', message: error instanceof Error ? error.message : 'Erro ao salvar template' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
            Configurações do Sistema
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Personalize o comportamento do SAPEE sem alterar o código
          </p>
        </div>
        <button
          onClick={salvarConfiguracoes}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 flex-wrap">
        <button onClick={() => setAbaAtiva('instituicao')} className={cn("px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]", abaAtiva === 'instituicao' ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-700")}>
          <Building className="w-4 h-4 inline mr-2" /> Instituição
        </button>
        <button onClick={() => setAbaAtiva('alertas')} className={cn("px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]", abaAtiva === 'alertas' ? "border-amber-600 text-amber-600 dark:text-amber-400" : "border-transparent text-gray-500 hover:text-gray-700")}>
          <AlertTriangle className="w-4 h-4 inline mr-2" /> Alertas e Limiares
        </button>
        <button onClick={() => setAbaAtiva('templates')} className={cn("px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]", abaAtiva === 'templates' ? "border-purple-600 text-purple-600 dark:text-purple-400" : "border-transparent text-gray-500 hover:text-gray-700")}>
          <MessageSquare className="w-4 h-4 inline mr-2" /> Templates
        </button>
        <button onClick={() => setAbaAtiva('canais')} className={cn("px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]", abaAtiva === 'canais' ? "border-green-600 text-green-600 dark:text-green-400" : "border-transparent text-gray-500 hover:text-gray-700")}>
          <Send className="w-4 h-4 inline mr-2" /> Canais de Comunicação
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* ABA INSTITUIÇÃO */}
        {abaAtiva === 'instituicao' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <School className="w-5 h-5 text-indigo-600" /> Dados da Instituição
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Nome da Instituição</label>
                <input type="text" value={configuracoes.instituicao_nome || ''} onChange={(e) => atualizarConfig('instituicao_nome', e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white" placeholder="Ex: Instituto Federal do Amazonas" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Email Oficial</label>
                <input type="email" value={configuracoes.instituicao_email || ''} onChange={(e) => atualizarConfig('instituicao_email', e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white" placeholder="contato@instituicao.edu.br" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Telefone Padrão</label>
                <input type="tel" value={configuracoes.instituicao_telefone || ''} onChange={(e) => atualizarConfig('instituicao_telefone', formatarTelefone(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white" placeholder="(92) 99999-9999" maxLength={15} />
                {configuracoes.instituicao_telefone && !validarTelefone(configuracoes.instituicao_telefone) && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Telefone deve ter 10 ou 11 dígitos</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA ALERTAS */}
        {abaAtiva === 'alertas' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Limiares de Alerta de Faltas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { chave: 'alerta_faltas_3_ativo', label: 'Alerta de 3 Faltas', desc: 'Notificar quando aluno atinge 3 faltas' },
                  { chave: 'alerta_faltas_5_ativo', label: 'Alerta de 5 Faltas', desc: 'Intervenção pedagógica recomendada' },
                  { chave: 'alerta_faltas_10_ativo', label: 'Alerta de 10 Faltas', desc: 'Risco crítico de evasão' },
                  { chave: 'alerta_faltas_notificar_telegram', label: 'Notificar via Telegram', desc: 'Enviar alertas automaticamente para o bot' },
                ].map(item => (
                  <div key={item.chave} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={configuracoes[item.chave] === 'true'} onChange={(e) => atualizarConfig(item.chave, e.target.checked ? 'true' : 'false')} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-red-600" /> Limiares de Risco de Evasão
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-2">Score Máx. Risco BAIXO</label>
                  <input type="number" value={configuracoes.risco_baixo_max || '30'} onChange={(e) => atualizarConfig('risco_baixo_max', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded-xl text-gray-900 dark:text-white" />
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-2">Score Máx. Risco MEDIO</label>
                  <input type="number" value={configuracoes.risco_medio_max || '60'} onChange={(e) => atualizarConfig('risco_medio_max', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-yellow-300 dark:border-yellow-700 rounded-xl text-gray-900 dark:text-white" />
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <label className="block text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-2">Score Máx. Risco ALTO</label>
                  <input type="number" value={configuracoes.risco_alto_max || '85'} onChange={(e) => atualizarConfig('risco_alto_max', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-xl text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA TEMPLATES */}
        {abaAtiva === 'templates' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" /> Templates de Mensagens
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Edite os textos usados nas notificações. Use variáveis como <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">{`{nome_aluno}`}</code>, <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">{`{qtd_faltas}`}</code>.
            </p>
            <div className="space-y-4">
              {templates.map((t) => (
                <div key={t.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">{t.nome}</span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700">{t.codigo}</span>
                    </div>
                    {!editandoTemplate ? (
                      <button onClick={() => { setEditandoTemplate(t.id); setTemplateEditando(t.conteudo); }} className="px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">Editar</button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => salvarTemplate(t.id)} className="px-3 py-1 text-xs font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Salvar</button>
                        <button onClick={() => setEditandoTemplate(null)} className="px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1"><X className="w-3 h-3" /> Cancelar</button>
                      </div>
                    )}
                  </div>
                  {editandoTemplate === t.id ? (
                    <textarea value={templateEditando} onChange={(e) => setTemplateEditando(e.target.value)} rows={4} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-700 dark:text-slate-300" />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap">{t.conteudo.substring(0, 150)}{t.conteudo.length > 150 ? '...' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA CANAIS DE COMUNICAÇÃO */}
        {abaAtiva === 'canais' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Configure as credenciais para envio de notificações por Email, Telegram e WhatsApp. Após preencher, use o botão <strong>Testar Conexão</strong> para validar.
            </p>

            {/* EMAIL */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
              <button onClick={() => setCanalExpandido(canalExpandido === 'EMAIL' ? null : 'EMAIL')} className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Email (SMTP)</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {canalEmail.smtp_host ? `${canalEmail.smtp_host}:${canalEmail.smtp_port}` : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <svg className={cn("w-5 h-5 text-gray-400 transition-transform", canalExpandido === 'EMAIL' && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {canalExpandido === 'EMAIL' && (
                <div className="p-6 pt-0 border-t border-gray-100 dark:border-slate-700 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Servidor SMTP</label>
                      <input type="text" value={canalEmail.smtp_host} onChange={(e) => setCanalEmail(prev => ({ ...prev, smtp_host: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Porta SMTP</label>
                      <input type="text" value={canalEmail.smtp_port} onChange={(e) => setCanalEmail(prev => ({ ...prev, smtp_port: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="587" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Usuário (Email)</label>
                      <input type="email" value={canalEmail.smtp_user} onChange={(e) => setCanalEmail(prev => ({ ...prev, smtp_user: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="seuemail@gmail.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Senha (App Password)</label>
                      <input type="password" value={canalEmail.smtp_pass} onChange={(e) => setCanalEmail(prev => ({ ...prev, smtp_pass: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="••••••••••••••••" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Email Remetente</label>
                      <input type="email" value={canalEmail.email_from} onChange={(e) => setCanalEmail(prev => ({ ...prev, email_from: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="noreply@instituicao.edu.br" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Nome do Remetente</label>
                      <input type="text" value={canalEmail.email_from_name} onChange={(e) => setCanalEmail(prev => ({ ...prev, email_from_name: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="SAPEE" />
                    </div>
                  </div>
                  {resultadoTeste && testandoCanal === null && (
                    <div className={cn("p-4 rounded-xl flex items-start gap-3", resultadoTeste.sucesso ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800")}>
                      {resultadoTeste.sucesso ? <CheckCheck className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertOctagon className="w-5 h-5 text-red-600 mt-0.5" />}
                      <p className="text-sm text-gray-700 dark:text-slate-300">{resultadoTeste.mensagem}</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => salvarCanal('EMAIL')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
                      <Save className="w-4 h-4" /> Salvar
                    </button>
                    <button onClick={() => testarCanal('EMAIL')} disabled={testandoCanal === 'EMAIL'} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50">
                      {testandoCanal === 'EMAIL' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {testandoCanal === 'EMAIL' ? 'Testando...' : 'Testar Conexão'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TELEGRAM */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
              <button onClick={() => setCanalExpandido(canalExpandido === 'TELEGRAM' ? null : 'TELEGRAM')} className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <Send className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Telegram Bot</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {canalTelegram.bot_token ? 'Bot Token configurado' : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <svg className={cn("w-5 h-5 text-gray-400 transition-transform", canalExpandido === 'TELEGRAM' && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {canalExpandido === 'TELEGRAM' && (
                <div className="p-6 pt-0 border-t border-gray-100 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Bot Token</label>
                    <input type="text" value={canalTelegram.bot_token} onChange={(e) => setCanalTelegram(prev => ({ ...prev, bot_token: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Chat ID</label>
                    <input type="text" value={canalTelegram.chat_id} onChange={(e) => setCanalTelegram(prev => ({ ...prev, chat_id: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="-1001234567890" />
                  </div>
                  {resultadoTeste && testandoCanal === null && (
                    <div className={cn("p-4 rounded-xl flex items-start gap-3", resultadoTeste.sucesso ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800")}>
                      {resultadoTeste.sucesso ? <CheckCheck className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertOctagon className="w-5 h-5 text-red-600 mt-0.5" />}
                      <p className="text-sm text-gray-700 dark:text-slate-300">{resultadoTeste.mensagem}</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => salvarCanal('TELEGRAM')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"><Save className="w-4 h-4" /> Salvar</button>
                    <button onClick={() => testarCanal('TELEGRAM')} disabled={testandoCanal === 'TELEGRAM'} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50">
                      {testandoCanal === 'TELEGRAM' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {testandoCanal === 'TELEGRAM' ? 'Testando...' : 'Testar Conexão'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* WHATSAPP */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
              <button onClick={() => setCanalExpandido(canalExpandido === 'WHATSAPP' ? null : 'WHATSAPP')} className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">WhatsApp (Twilio)</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {canalWhatsapp.account_sid ? 'Account SID configurado' : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <svg className={cn("w-5 h-5 text-gray-400 transition-transform", canalExpandido === 'WHATSAPP' && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {canalExpandido === 'WHATSAPP' && (
                <div className="p-6 pt-0 border-t border-gray-100 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Twilio Account SID</label>
                    <input type="text" value={canalWhatsapp.account_sid} onChange={(e) => setCanalWhatsapp(prev => ({ ...prev, account_sid: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Twilio Auth Token</label>
                    <input type="password" value={canalWhatsapp.auth_token} onChange={(e) => setCanalWhatsapp(prev => ({ ...prev, auth_token: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="••••••••••••••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Número WhatsApp (com código país)</label>
                    <input type="text" value={canalWhatsapp.whatsapp_number} onChange={(e) => setCanalWhatsapp(prev => ({ ...prev, whatsapp_number: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="+5511999999999" />
                  </div>
                  {resultadoTeste && testandoCanal === null && (
                    <div className={cn("p-4 rounded-xl flex items-start gap-3", resultadoTeste.sucesso ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800")}>
                      {resultadoTeste.sucesso ? <CheckCheck className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertOctagon className="w-5 h-5 text-red-600 mt-0.5" />}
                      <p className="text-sm text-gray-700 dark:text-slate-300">{resultadoTeste.mensagem}</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => salvarCanal('WHATSAPP')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"><Save className="w-4 h-4" /> Salvar</button>
                    <button onClick={() => testarCanal('WHATSAPP')} disabled={testandoCanal === 'WHATSAPP'} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50">
                      {testandoCanal === 'WHATSAPP' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {testandoCanal === 'WHATSAPP' ? 'Testando...' : 'Testar Conexão'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </motion.div>
    </div>
  );
}
