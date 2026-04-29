/**
 * Página de Questionário Psicossocial
 * SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as questionarioApi from '../services/questionarioApi';
import {
  BlocoTematico,
  RespostasQuestionario,
  QuestionarioResponse,
  EscalaLikert,
} from '../types/questionario';
import TermoConsentimento from '../components/Questionario/TermoConsentimento';
import BarraProgresso from '../components/Questionario/BarraProgresso';
import BlocoTemas from '../components/Questionario/BlocoTemas';
import { useAuth } from '../services/AuthContext';

export const QuestionarioPsicossocial: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados
  const [blocos, setBlocos] = useState<BlocoTematico[]>([]);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [termoAceito, setTermoAceito] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<QuestionarioResponse | null>(null);
  const [tempoInicio, setTempoInicio] = useState<number>(Date.now());
  const [blocoAtual, setBlocoAtual] = useState(0);

  // Carregar perguntas ao montar
  useEffect(() => {
    carregarPerguntas();
  }, []);

  const carregarPerguntas = async () => {
    try {
      setCarregando(true);
      const dados = await questionarioApi.getPerguntas();
      setBlocos(dados.perguntas);
    } catch (erro) {
      console.error('Erro ao carregar perguntas:', erro);
      alert('Erro ao carregar questionário. Tente novamente.');
    } finally {
      setCarregando(false);
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
    // Limpar erro se existir
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
    if (!validarRespostas()) {
      alert('Por favor, responda todas as questões antes de enviar.');
      // Rolar para o primeiro erro
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
        aluno_matricula: '', // Será preenchido pelo backend via token/session
        ...respostas,
        termo_consentimento: termoAceito,
        tempo_resposta_segundos: Math.round((Date.now() - tempoInicio) / 1000),
      };

      // Enviar
      const resposta = await questionarioApi.responderQuestionario(dados);
      setResultado(resposta);

      // Mostrar resultado
      setTimeout(() => {
        alert('Questionário respondido com sucesso!');
        navigate('/dashboard');
      }, 2000);
    } catch (erro: any) {
      console.error('Erro ao enviar questionário:', erro);
      alert(erro.response?.data?.detail || 'Erro ao enviar questionário. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  // Lidar com recusa do termo
  const handleRecusarTermo = () => {
    alert('É necessário aceitar o termo de consentimento para responder o questionário.');
  };

  // Navegar entre blocos
  const navegarBloco = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior' && blocoAtual > 0) {
      setBlocoAtual(blocoAtual - 1);
    } else if (direcao === 'proximo' && blocoAtual < blocos.length - 1) {
      // Validar bloco atual antes de avançar
      const questoesBlocoAtual = blocos[blocoAtual].perguntas.map((p) => p.id);
      const todasRespondidas = questoesBlocoAtual.every((q) => respostas[q] !== undefined);

      if (!todasRespondidas) {
        alert('Por favor, responda todas as questões deste bloco antes de continuar.');
        return;
      }

      setBlocoAtual(blocoAtual + 1);
    }
  };

  // Renderizar carregamento
  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
            Carregando questionário...
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
                    {resultado.score_psicossocial_total}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nível de Risco</p>
                  <p className={`text-xl font-bold ${
                    resultado.nivel_risco_psicossocial === 'BAIXO' ? 'text-green-600' :
                    resultado.nivel_risco_psicossocial === 'MEDIO' ? 'text-yellow-600' :
                    resultado.nivel_risco_psicossocial === 'ALTO' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {resultado.nivel_risco_psicossocial.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Redirecionando para o dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
      {/* Modal de Termo de Consentimento */}
      {!termoAceito && (
        <TermoConsentimento
          onAceitar={() => setTermoAceito(true)}
          onRecusar={handleRecusarTermo}
        />
      )}

      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-2">
            Questionário Psicossocial
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
          </p>
        </div>

        {/* Barra de Progresso */}
        <div className="mb-6">
          <BarraProgresso atual={questoesRespondidas} total={totalQuestoes} />
        </div>

        {/* Blocos de Perguntas */}
        <div className="space-y-6">
          {blocos.map((bloco, index) => (
            <div
              key={bloco.bloco}
              className={index === blocoAtual ? 'block' : 'hidden'}
            >
              <BlocoTemas
                bloco={bloco}
                respostas={respostas}
                onResponder={handleResponder}
                erros={erros}
              />
            </div>
          ))}
        </div>

        {/* Navegação */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => navegarBloco('anterior')}
            disabled={blocoAtual === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              Próximo →
            </button>
          ) : (
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
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

        {/* Informações adicionais */}
        <div className="mt-8 bg-blue-50 dark:bg-slate-800 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Tempo estimado:</strong> 10-15 minutos | 
            <strong> Questões:</strong> {totalQuestoes} | 
            <strong> Respostas:</strong> {questoesRespondidas}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuestionarioPsicossocial;
