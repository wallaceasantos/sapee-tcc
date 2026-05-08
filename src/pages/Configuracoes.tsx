/**
 * Página de Configurações do Sistema - SAPEE DEWAS
 * 
 * Funcionalidades:
 * - Editar Templates de Mensagens
 * - Configurar Limiares de Alerta (Faltas e Risco)
 * - Dados da Instituição
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, MessageSquare, Building, School, CheckCircle, X, Loader2 } from 'lucide-react';
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

export default function Configuracoes() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [abaAtiva, setAbaAtiva] = useState<'instituicao' | 'alertas' | 'templates'>('instituicao');
  const [configuracoes, setConfiguracoes] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Formulários de edição de template
  const [editandoTemplate, setEditandoTemplate] = useState<number | null>(null);
  const [templateEditando, setTemplateEditando] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Carregar configurações
      const configs = await api.configuracoes.list(token);
      const mapa: Record<string, string> = {};
      configs.forEach((c: Configuracao) => mapa[c.chave] = c.valor);
      setConfiguracoes(mapa);

      // Carregar templates
      const temps = await api.comunicacoes.templates.list(token);
      setTemplates(temps);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracoes = async () => {
    if (!token) return;
    setSalvando(true);
    try {
      await api.configuracoes.updateBatch(token, configuracoes);
      addToast({ type: 'success', title: 'Sucesso!', message: 'Configurações salvas com sucesso' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
    } finally {
      setSalvando(false);
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
    } catch (error: any) {
      addToast({ type: 'error', title: 'Erro', message: error.message });
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
      {/* Header */}
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

      {/* Seletor de Abas */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setAbaAtiva('instituicao')}
          className={cn(
            "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]",
            abaAtiva === 'instituicao'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <Building className="w-4 h-4 inline mr-2" /> Instituição
        </button>
        <button
          onClick={() => setAbaAtiva('alertas')}
          className={cn(
            "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]",
            abaAtiva === 'alertas'
              ? "border-amber-600 text-amber-600 dark:text-amber-400"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" /> Alertas e Limiares
        </button>
        <button
          onClick={() => setAbaAtiva('templates')}
          className={cn(
            "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px]",
            abaAtiva === 'templates'
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" /> Templates
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* ABA INSTITUIÇÃO */}
        {abaAtiva === 'instituicao' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <School className="w-5 h-5 text-indigo-600" />
              Dados da Instituição
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Nome da Instituição</label>
                <input 
                  type="text" 
                  value={configuracoes.instituicao_nome || ''} 
                  onChange={(e) => atualizarConfig('instituicao_nome', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
                  placeholder="Ex: Instituto Federal do Amazonas"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Email Oficial</label>
                <input 
                  type="email" 
                  value={configuracoes.instituicao_email || ''} 
                  onChange={(e) => atualizarConfig('instituicao_email', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
                  placeholder="contato@instituicao.edu.br"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Telefone Padrão</label>
                <input
                  type="tel"
                  value={configuracoes.instituicao_telefone || ''}
                  onChange={(e) => atualizarConfig('instituicao_telefone', formatarTelefone(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
                  placeholder="(92) 99999-9999"
                  maxLength={15}
                />
                {configuracoes.instituicao_telefone && !validarTelefone(configuracoes.instituicao_telefone) && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">⚠️ Telefone deve ter 10 ou 11 dígitos</p>
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
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Limiares de Alerta de Faltas
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
                      <input 
                        type="checkbox" 
                        checked={configuracoes[item.chave] === 'true'} 
                        onChange={(e) => atualizarConfig(item.chave, e.target.checked ? 'true' : 'false')}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Limiares de Risco de Evasão
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-2">Score Máx. Risco BAIXO</label>
                  <input 
                    type="number" 
                    value={configuracoes.risco_baixo_max || '30'} 
                    onChange={(e) => atualizarConfig('risco_baixo_max', e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase mb-2">Score Máx. Risco MEDIO</label>
                  <input 
                    type="number" 
                    value={configuracoes.risco_medio_max || '60'} 
                    onChange={(e) => atualizarConfig('risco_medio_max', e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-yellow-300 dark:border-yellow-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <label className="block text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-2">Score Máx. Risco ALTO</label>
                  <input 
                    type="number" 
                    value={configuracoes.risco_alto_max || '85'} 
                    onChange={(e) => atualizarConfig('risco_alto_max', e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA TEMPLATES */}
        {abaAtiva === 'templates' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Templates de Mensagens
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
                    <textarea 
                      value={templateEditando} 
                      onChange={(e) => setTemplateEditando(e.target.value)} 
                      rows={4} 
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-700 dark:text-slate-300"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap">{t.conteudo.substring(0, 150)}{t.conteudo.length > 150 ? '...' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
