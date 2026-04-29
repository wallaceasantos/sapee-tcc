/**
 * Componente de Gráfico de Evolução de Frequência
 * SAPEE DEWAS Frontend
 */

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle, Info, Calendar, CheckCircle } from 'lucide-react';
import { cn } from '../utils';

interface FrequenciaData {
  mes: string;
  frequencia: number;
  ano: number;
}

interface FrequenciaEvolucaoProps {
  data: FrequenciaData[];
  tendencia?: {
    tendencia: string;
    variacao: number | string;
    alerta: boolean;
    media_recente?: number;
    media_antiga?: number;
    mensagem?: string;
  };
}

export function FrequenciaEvolucao({ data, tendencia }: FrequenciaEvolucaoProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-slate-400">
          Dados de frequência não disponíveis
        </p>
      </div>
    );
  }
  
  // Calcular meses faltantes para 4 meses
  const mesesFaltantes = Math.max(0, 4 - data.length);
  const porcentagemConcluido = Math.min(100, (data.length / 4) * 100);
  
  // Calcular previsão (considerando mês atual + meses faltantes)
  const calcularPrevisao = () => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const mesPrevisto = (hoje.getMonth() + mesesFaltantes) % 12;
    const anoPrevisto = hoje.getFullYear() + Math.floor((hoje.getMonth() + mesesFaltantes) / 12);
    return `${meses[mesPrevisto]}/${anoPrevisto.toString().slice(2)}`;
  };

  const getTendenciaIcon = () => {
    if (!tendencia) return <Minus className="w-5 h-5 text-gray-400" />;
    
    switch (tendencia.tendencia) {
      case 'SUBINDO':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'DESCENDO':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTendenciaColor = () => {
    if (!tendencia) return 'text-gray-400';
    
    switch (tendencia.tendencia) {
      case 'SUBINDO':
        return 'text-emerald-600';
      case 'DESCENDO':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  const getAlertaClass = () => {
    if (tendencia?.alerta) {
      return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
    }
    return 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Aviso de Dados Insuficientes */}
      {data.length < 4 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 
                        dark:border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 
                                    shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                  📊 Histórico em Construção
                </h4>
                <button
                  onClick={() => setShowTooltip(!showTooltip)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 
                           dark:hover:text-blue-300 transition-colors"
                  title="Saiba mais"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                Este aluno possui apenas <strong>{data.length} mês(es)</strong> de 
                registro. Para uma análise completa de tendência, são necessários{' '}
                <strong>4 meses de histórico</strong>.
              </p>
              
              {/* Barra de Progresso */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs 
                                text-blue-700 dark:text-blue-400 mb-1">
                  <span>Progresso do histórico</span>
                  <span>{Math.round(porcentagemConcluido)}% concluído</span>
                </div>
                <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 
                                rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${porcentagemConcluido}%` }}
                  />
                </div>
              </div>
              
              {/* Informações Adicionais */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs 
                              text-blue-600 dark:text-blue-400">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>{data.length}/4 meses coletados</span>
                </div>
                {mesesFaltantes > 0 && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Completo em: {calcularPrevisao()}</span>
                  </div>
                )}
              </div>
              
              {/* Tooltip Explicativo */}
              {showTooltip && (
                <div className="mt-3 pt-3 border-t border-blue-200 
                                dark:border-blue-500/20 text-xs 
                                text-blue-700 dark:text-blue-400 space-y-2">
                  <p className="font-bold">ℹ️ Por que 4 meses?</p>
                  <p>
                    O período de 4 meses é o ideal para detectar evasão escolar 
                    sem reagir a variações normais (doenças, viagens, eventos 
                    pontuais).
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                      <p className="font-bold">2 meses:</p>
                      <p>Tendência básica</p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                      <p className="font-bold">4 meses:</p>
                      <p>Análise completa</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Cards de Tendência */}
      <div className={cn(
        "p-4 rounded-xl border",
        getAlertaClass()
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getTendenciaIcon()}
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Tendência de Frequência
              </p>
              <p className={cn("text-xs font-bold", getTendenciaColor())}>
                {tendencia?.tendencia || 'N/A'} {tendencia?.variacao && `(${Number(tendencia.variacao) > 0 ? '+' : ''}${tendencia.variacao}%)`}
              </p>
            </div>
          </div>
          
          {tendencia?.alerta && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-bold">QUEDA BRUSCA!</span>
            </div>
          )}
        </div>
        
        {tendencia && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Média Recente</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {tendencia.media_recente}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Média Antiga</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {tendencia.media_antiga}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Evolução Mensal da Frequência
        </h3>
        
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorFrequencia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#e5e7eb"
                className="dark:stroke-slate-700"
              />
              
              <XAxis 
                dataKey="mes" 
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
              />
              
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => `${value}%`}
              />
              
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: '#fff'
                }}
                formatter={(value: unknown) => {
                  const num = typeof value === 'number' ? value : parseFloat(String(value));
                  return [`${isNaN(num) ? '0' : num.toFixed(1)}%`, 'Frequência'];
                }}
              />
              
              <Area
                type="monotone"
                dataKey="frequencia"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorFrequencia)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legenda */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Frequência atual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-30" />
            <span>Tendência</span>
          </div>
        </div>
      </div>
    </div>
  );
}
