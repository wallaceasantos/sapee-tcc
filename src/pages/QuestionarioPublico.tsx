/**
 * Página Pública do Questionário Psicossocial
 * SAPEE DEWAS - Acesso sem login via token
 * 
 * Layout profissional com sidebar de módulos
 *
 * Uso: http://localhost:5173/questionario-publico?token=abc123
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import * as questionarioApi from '../services/questionarioApi';
import {
  BlocoTematico,
  RespostasQuestionario,
  EscalaLikert,
} from '../types/questionario';
import TermoConsentimento from '../components/Questionario/TermoConsentimento';
import BarraProgresso from '../components/Questionario/BarraProgresso';
import BlocoTemas from '../components/Questionario/BlocoTemas';

export const QuestionarioPublico: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Estados
  const [blocos, setBlocos] = useState<BlocoTematico[]>([]);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [termoAceito, setTermoAceito] = useState(false);
  const [termoRecusado, setTermoRecusado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [tokenValido, setTokenValido] = useState(false);
  const [resultado, setResultado] = useState<{score_total: number, nivel_risco: string} | null>(null);
  const [tempoInicio, setTempoInicio] = useState<number>(Date.now());
  const [blocoAtual, setBlocoAtual] = useState(0);
  const [erroMensagem, setErroMensagem] = useState<string>('');
  const [sidebarColapsada, setSidebarColapsada] = useState(false);

  // Validar token ao montar
  useEffect(() => {
    if (!token) {
      setErroMensagem('Token não fornecido. Peça ao coordenador um link de acesso.');
      setCarregando(false);
      return;
    }
    validarToken(token);
  }, [token]);

  const validarToken = async (token: string) => {
    try {
      setCarregando(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/tokens/questionario/validar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.valido) {
        setTokenValido(true);
        await carregarPerguntas();
      } else {
        setErroMensagem(data.mensagem || 'Token inválido');
      }
    } catch (erro) {
      console.error('Erro ao validar token:', erro);
      setErroMensagem('Erro ao validar token. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  };

  // Carregar perguntas
  const carregarPerguntas = async () => {
    try {
      const dados = await questionarioApi.getPerguntas();
      setBlocos(dados.perguntas);
    } catch (erro) {
      console.error('Erro ao carregar perguntas:', erro);
      setErroMensagem('Erro ao carregar questionário.');
    }
  };

  // Calcular total de questões
  const totalQuestoes = blocos.reduce((acc, bloco) => acc + bloco.perguntas.length, 0);
  const questoesRespondidas = Object.keys(respostas).length;

  // Lidar com resposta
  const handleResponder = (questaoId: string, valor: EscalaLikert) => {
    setRespostas((prev) => ({
      ...prev,
      [questaoId]: valor,
    }));
    if (erros[questaoId]) {
      setErros((prev) => {
        const novosErros = { ...prev };
        delete novosErros[questaoId];
        return novosErros;
      });
    }
  };

  // Validar respostas
  const validarRespostas = () => {
    const novosErros: Record<string, string> = {};
    const todasQuestoes = blocos.flatMap((bloco) => bloco.perguntas.map((p) => p.id));

    todasQuestoes.forEach((questaoId) => {
      if (respostas[questaoId] === undefined) {
        novosErros[questaoId] = 'Esta questão é obrigatória';
      }
    });

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // Enviar questionário
  const handleEnviar = async () => {
    if (!token) {
      alert('Token inválido');
      return;
    }

    if (!validarRespostas()) {
      alert('Por favor, responda todas as questões antes de enviar.');
      const primeiroErro = Object.keys(erros)[0];
      if (primeiroErro) {
        const elemento = document.getElementById(`pergunta-${primeiroErro}`);
        elemento?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setEnviando(true);

      // Preparar dados
      const dados: RespostasQuestionario = {
        aluno_matricula: '', // Não precisa, token já identifica
        ...respostas,
        termo_consentimento: termoAceito,
        tempo_resposta_segundos: Math.round((Date.now() - tempoInicio) / 1000),
      };

      // Enviar
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/questionario-publico/responder?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao enviar');
      }

      const resultado = await response.json();
      setResultado(resultado);

    } catch (erro: any) {
      console.error('Erro ao enviar questionário:', erro);
      alert(erro.message || 'Erro ao enviar questionário. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  // Lidar com recusa do termo - REDIRECIONA PARA FORA
  const handleRecusarTermo = () => {
    setTermoRecusado(true);
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  // Navegar entre blocos
  const navegarBloco = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior' && blocoAtual > 0) {
      setBlocoAtual(blocoAtual - 1);
    } else if (direcao === 'proximo' && blocoAtual < blocos.length - 1) {
      const questoesBlocoAtual = blocos[blocoAtual].perguntas.map((p) => p.id);
      const todasRespondidas = questoesBlocoAtual.every((q) => respostas[q] !== undefined);

      if (!todasRespondidas) {
        alert('Por favor, responda todas as questões deste bloco antes de continuar.');
        return;
      }

      setBlocoAtual(blocoAtual + 1);
    }
  };

  // Ir para bloco específico pela sidebar
  const irParaBloco = (index: number) => {
    // Validar blocos anteriores se for avançar
    if (index > blocoAtual) {
      for (let i = blocoAtual; i < index; i++) {
        const questoesBloco = blocos[i].perguntas.map((p) => p.id);
        const todasRespondidas = questoesBloco.every((q) => respostas[q] !== undefined);
        if (!todasRespondidas) {
          alert(`Complete o bloco "${blocos[i].titulo}" antes de avançar.`);
          return;
        }
      }
    }
    setBlocoAtual(index);
  };

  // Calcular progresso por bloco
  const progressoPorBloco = blocos.map((bloco) => {
    const respondidas = bloco.perguntas.filter((p) => respostas[p.id] !== undefined).length;
    return {
      titulo: bloco.titulo,
      respondidas,
      total: bloco.perguntas.length,
      completo: respondidas === bloco.perguntas.length,
    };
  });

  // Renderizar carregamento
  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
            {token ? 'Validando token...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  // Renderizar erro de token ou recusa de termo
  if (!tokenValido && erroMensagem) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-red-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
              Acesso Não Autorizado
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
              {erroMensagem}
            </p>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 mb-6 text-left">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                <strong>Como funciona o acesso:</strong>
              </p>
              <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
                <li>O coordenador gera um token único para você</li>
                <li>Você recebe um link por email ou SMS</li>
                <li>Clica no link e responde o questionário</li>
                <li>O token só pode ser usado uma vez</li>
              </ol>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Entre em contato com o coordenador do seu curso para solicitar um novo acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar recusa de termo
  if (termoRecusado) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Questionário Encerrado
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Você optou por não participar do questionário. Suas respostas não foram registradas.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  // Renderizar resultado
  if (resultado) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-green-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
              Questionário Respondido!
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Obrigado por participar. Suas respostas foram registradas com sucesso.
            </p>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Score Total</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {resultado.score_total}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nível de Risco</p>
                  <p className={`text-xl font-bold ${
                    resultado.nivel_risco === 'BAIXO' ? 'text-green-600' :
                    resultado.nivel_risco === 'MEDIO' ? 'text-yellow-600' :
                    resultado.nivel_risco === 'ALTO' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {resultado.nivel_risco.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A equipe pedagógica analisará suas respostas e entrará em contato se necessário.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Layout Principal com Sidebar
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Modal de Termo de Consentimento - Só aparece se NÃO aceito */}
      <AnimatePresence>
        {!termoAceito && (
          <TermoConsentimento
            onAceitar={() => setTermoAceito(true)}
            onRecusar={handleRecusarTermo}
          />
        )}
      </AnimatePresence>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Menu de Módulos */}
        <aside className={`${sidebarColapsada ? 'w-20' : 'w-80'} bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300`}>
          {/* Logo */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              {!sidebarColapsada && (
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">SAPEE DEWAS</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Questionário Psicossocial</p>
                </div>
              )}
            </div>
            {/* Toggle Sidebar */}
            <button
              onClick={() => setSidebarColapsada(!sidebarColapsada)}
              className="mt-3 w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarColapsada ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Lista de Módulos */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!sidebarColapsada && (
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-3">
                Módulos do Questionário
              </p>
            )}
            {progressoPorBloco.map((bloco, index) => (
              <button
                key={index}
                onClick={() => irParaBloco(index)}
                disabled={index > blocoAtual}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  index === blocoAtual
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                    : bloco.completo
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                    : index > blocoAtual
                    ? 'bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 opacity-50 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-blue-300'
                }`}
              >
                {sidebarColapsada ? (
                  <div className="flex items-center justify-center">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      bloco.completo
                        ? 'bg-green-500 text-white'
                        : index === blocoAtual
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                    }`}>
                      {bloco.completo ? '✓' : index + 1}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${
                        bloco.completo
                          ? 'text-green-700 dark:text-green-400'
                          : index === blocoAtual
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {bloco.titulo}
                      </span>
                      {bloco.completo && (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          bloco.completo
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${(bloco.respondidas / bloco.total) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {bloco.respondidas}/{bloco.total} questões
                    </p>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Progresso Geral */}
          {!sidebarColapsada && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Progresso Total
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-3">
                    <div
                      className="bg-linear-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${(questoesRespondidas / totalQuestoes) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((questoesRespondidas / totalQuestoes) * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {questoesRespondidas} de {totalQuestoes} questões respondidas
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Área Principal */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 sm:p-8">
            {/* Cabeçalho */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-2">
                {blocos[blocoAtual]?.titulo || 'Questionário Psicossocial'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Bloco {blocoAtual + 1} de {blocos.length}
              </p>
              <div className="mt-4">
                <BarraProgresso atual={questoesRespondidas} total={totalQuestoes} />
              </div>
            </div>

            {/* Bloco Atual */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
              <BlocoTemas
                bloco={blocos[blocoAtual]}
                respostas={respostas}
                onResponder={handleResponder}
                erros={erros}
              />
            </div>

            {/* Navegação */}
            <div className="flex justify-between">
              <button
                onClick={() => navegarBloco('anterior')}
                disabled={blocoAtual === 0}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  blocoAtual === 0
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                ← Anterior
              </button>

              {blocoAtual < blocos.length - 1 ? (
                <button
                  onClick={() => navegarBloco('proximo')}
                  className="px-8 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
                >
                  Próximo →
                </button>
              ) : (
                <button
                  onClick={handleEnviar}
                  disabled={enviando}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                    enviando
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {enviando ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Enviar Questionário
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QuestionarioPublico;
