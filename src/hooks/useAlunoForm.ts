/**
 * Hook para formulário de Aluno com API Real
 * SAPEE DEWAS Frontend
 * 
 * Este hook gerencia:
 * - Estado do formulário
 * - Validações
 * - Preview de predição (cálculo local)
 * - Integração com API (criar/editar)
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import { NivelRisco } from '../types';

// Interface do formulário (27+ campos)
export interface AlunoFormData {
  // Identificação
  matricula: string;
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  idade: number;
  sexo: 'M' | 'F' | 'O';

  // Acadêmicos
  curso_id: number;
  periodo: number;
  turno: string;
  media_geral: number;
  frequencia: number;
  historico_reprovas: number;
  coeficiente_rendimento: number;
  ano_ingresso: number;

  // Endereço
  cidade: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  zona_residencial: string;

  // Socioeconômicos
  renda_familiar: number;
  renda_per_capita: number;
  possui_auxilio: boolean;
  tipo_auxilio: string;

  // Trabalho
  trabalha: boolean;
  carga_horaria_trabalho: number;

  // Deslocamento
  tempo_deslocamento: number;
  custo_transporte_diario: number;
  dificuldade_acesso: string;
  transporte_utilizado: string;
  usa_transporte_alternativo: boolean;

  // Infraestrutura
  possui_computador: boolean;
  possui_internet: boolean;

  // Vulnerabilidade
  beneficiario_bolsa_familia: boolean;
  primeiro_geracao_universidade: boolean;
}

// Estado inicial do formulário
const initialFormData: AlunoFormData = {
  // Identificação
  matricula: '',
  nome: '',
  email: '',
  telefone: '',
  data_nascimento: '',
  idade: 0,
  sexo: 'M',

  // Acadêmicos
  curso_id: 0,
  periodo: 1,
  turno: 'MATUTINO',
  media_geral: 0,
  frequencia: 0,
  historico_reprovas: 0,
  coeficiente_rendimento: 0,
  ano_ingresso: new Date().getFullYear(),

  // Endereço
  cidade: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  zona_residencial: '',

  // Socioeconômicos
  renda_familiar: 0,
  renda_per_capita: 0,
  possui_auxilio: false,
  tipo_auxilio: '',

  // Trabalho
  trabalha: false,
  carga_horaria_trabalho: 0,

  // Deslocamento
  tempo_deslocamento: 0,
  custo_transporte_diario: 0,
  dificuldade_acesso: 'MEDIA',
  transporte_utilizado: '',
  usa_transporte_alternativo: false,

  // Infraestrutura
  possui_computador: false,
  possui_internet: false,

  // Vulnerabilidade
  beneficiario_bolsa_familia: false,
  primeiro_geracao_universidade: false,
};

// Interface de retorno do hook
export interface UseAlunoFormReturn {
  formData: AlunoFormData;
  isEditing: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  predicaoPreview: {
    risco_evasao: number;
    nivel_risco: NivelRisco;
    fatores_principais: string[];
  } | null;
  setFormData: React.Dispatch<React.SetStateAction<AlunoFormData>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCurrencyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNumericFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  getNumericValue: (value: number) => string;
  formatCurrency: (value: number) => string;
  parseCurrency: (value: string) => number;
  resetForm: () => void;
  setEditingData: (aluno: any) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  calcularRiscoPreview: (dados: Partial<AlunoFormData>) => void;
}

/**
 * Calcula risco de evasão (mesma lógica do backend para preview)
 */
function calcularRiscoEvasao(dados: Partial<AlunoFormData>): {
  risco_evasao: number;
  nivel_risco: NivelRisco;
  fatores_principais: string[];
} {
  let score = 0;
  const fatores: string[] = [];

  // Fatores Acadêmicos (Peso Alto)
  if (dados.frequencia && dados.frequencia < 75) {
    score += 30;
    fatores.push('Frequência abaixo de 75%');
  } else if (dados.frequencia && dados.frequencia < 85) {
    score += 15;
    fatores.push('Frequência abaixo de 85%');
  }

  if (dados.media_geral && dados.media_geral < 5) {
    score += 25;
    fatores.push('Média abaixo de 5.0');
  } else if (dados.media_geral && dados.media_geral < 7) {
    score += 10;
    fatores.push('Média abaixo de 7.0');
  }

  if (dados.historico_reprovas && dados.historico_reprovas > 2) {
    score += 15;
    fatores.push('Histórico de reprovas');
  }

  if (dados.coeficiente_rendimento && dados.coeficiente_rendimento > 0 && dados.coeficiente_rendimento < 6) {
    score += 10;
    fatores.push('Coeficiente de rendimento baixo');
  }

  // Fatores Socioeconômicos
  if (dados.renda_familiar && dados.renda_familiar < 1500) {
    score += 15;
    fatores.push('Renda familiar baixa');
  }

  if (dados.trabalha) {
    if (dados.carga_horaria_trabalho && dados.carga_horaria_trabalho > 30) {
      score += 20;
      fatores.push('Trabalha em tempo integral (>30h/semana)');
    } else if (dados.carga_horaria_trabalho && dados.carga_horaria_trabalho > 15) {
      score += 15;
      fatores.push('Trabalha meio período (>15h/semana)');
    } else {
      score += 10;
      fatores.push('Trabalha (carga reduzida)');
    }
  }

  // Fatores de Deslocamento
  if (dados.tempo_deslocamento && dados.tempo_deslocamento > 120) {
    score += 20;
    fatores.push('Tempo de deslocamento crítico (>2h/dia)');
  } else if (dados.tempo_deslocamento && dados.tempo_deslocamento > 60) {
    score += 10;
    fatores.push('Tempo de deslocamento elevado (>1h/dia)');
  }

  if (dados.dificuldade_acesso === 'MUITO_DIFICIL') {
    score += 20;
    fatores.push('Acesso ao campus muito difícil');
  } else if (dados.dificuldade_acesso === 'DIFICIL') {
    score += 15;
    fatores.push('Acesso ao campus difícil');
  }

  // Infraestrutura
  if (dados.possui_computador === false) {
    score += 10;
    fatores.push('Não possui computador');
  }

  if (dados.possui_internet === false) {
    score += 10;
    fatores.push('Não possui internet em casa');
  }

  // Vulnerabilidade
  if (dados.beneficiario_bolsa_familia) {
    score += 5;
    fatores.push('Beneficiário de programa social');
  }

  if (dados.primeiro_geracao_universidade) {
    score += 5;
    fatores.push('Primeira geração na universidade');
  }

  // Determinar nível de risco (v2.0 com MUITO_ALTO)
  let nivelRisco: NivelRisco = NivelRisco.BAIXO;
  if (score >= 85) nivelRisco = NivelRisco.MUITO_ALTO;
  else if (score >= 70) nivelRisco = NivelRisco.ALTO;
  else if (score >= 40) nivelRisco = NivelRisco.MEDIO;

  return {
    risco_evasao: Math.min(score, 100),
    nivel_risco: nivelRisco,
    fatores_principais: fatores.length > 0 ? fatores : ['Sem fatores de risco identificados'],
  };
}

export function useAlunoForm(onSuccess?: () => void): UseAlunoFormReturn {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AlunoFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [predicaoPreview, setPredicaoPreview] = useState<UseAlunoFormReturn['predicaoPreview']>(null);

  // Calcular idade automaticamente
  const idade = useMemo(() => {
    if (!formData.data_nascimento) return 0;
    const hoje = new Date();
    const nascimento = new Date(formData.data_nascimento);
    return hoje.getFullYear() - nascimento.getFullYear();
  }, [formData.data_nascimento]);

  // Atualizar idade no formData
  useState(() => {
    if (idade > 0 && formData.idade !== idade) {
      setFormData(prev => ({ ...prev, idade }));
    }
  });

  // Handler para inputs numéricos - seleciona tudo ao focar
  const handleNumericFocus = useCallback((
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    e.target.select();
  }, []);

  // Handler para inputs normais
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    // Campos de texto puro (não converter para número)
    const textFields = ['nome', 'email', 'telefone', 'logradouro', 'numero', 'complemento', 'bairro', 'tipo_auxilio', 'transporte_utilizado', 'cidade', 'cep', 'matricula'];
    
    if (textFields.includes(name)) {
      // Campos de texto - manter como string
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    // Campos numéricos inteiros (curso_id, periodo, historico_reprovas, etc)
    const intFields = ['curso_id', 'periodo', 'historico_reprovas', 'idade', 'ano_ingresso', 'tempo_deslocamento', 'carga_horaria_trabalho'];
    if (intFields.includes(name)) {
      const num = parseInt(value);
      setFormData(prev => ({ ...prev, [name]: isNaN(num) ? 0 : num }));
      return;
    }

    // Sincronização Automática: Matrícula define o Ano de Ingresso
    if (name === 'matricula') {
      // Tenta encontrar um ano no início da matrícula (ex: 2024...)
      const yearMatch = value.match(/^(\d{4})/);
      let anoCalculado = formData.ano_ingresso;
      
      if (yearMatch) {
        const ano = parseInt(yearMatch[1]);
        // Validação básica de ano razoável (entre 1950 e 2100)
        if (ano >= 1950 && ano <= 2100) {
          anoCalculado = ano;
        }
      }
      
      setFormData(prev => ({ ...prev, matricula: value, ano_ingresso: anoCalculado }));
      return;
    }

    // Validação especial para ano_ingresso
    if (name === 'ano_ingresso') {
      const anoAtual = new Date().getFullYear();
      const anoMinimo = 1950;
      const anoMaximo = anoAtual + 1; // Permite ano que vem, mas não além
      
      // Se estiver vazio, usa ano atual
      if (value === '') {
        setFormData(prev => ({ ...prev, ano_ingresso: anoAtual }));
        return;
      }
      
      const ano = parseInt(value);
      
      // Valida se está dentro do range aceitável
      if (ano >= anoMinimo && ano <= anoMaximo) {
        setFormData(prev => ({ ...prev, ano_ingresso: ano }));
      }
      // Se estiver fora do range, não atualiza (mantém o valor anterior válido)
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' || type === 'text'
        ? (value === '' ? 0 : parseCurrency(value))
        : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  }, []);

  // Handler específico para campos monetários com formatação
  const handleCurrencyChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    
    // Remove tudo exceto dígitos
    const numbers = value.replace(/\D/g, '');
    
    // Converte para decimal (últimos 2 dígitos são centavos)
    const decimal = parseInt(numbers) / 100;
    
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(decimal) ? 0 : decimal,
    }));
  }, []);

  // Função para formatar valor monetário para exibição
  const formatCurrency = useCallback((value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  // Função para parsear valores monetários no formato brasileiro
  // Aceita: "1.500,00" ou "1500,00" ou "1500"
  const parseCurrency = useCallback((value: string): number => {
    if (value === '') return 0;

    // Remove tudo que não for dígito, vírgula ou ponto
    const cleaned = value.replace(/[^0-9,.]/g, '');

    // Se tiver vírgula, substitui por ponto (formato brasileiro)
    const normalized = cleaned.replace(',', '.');

    // Remove pontos de milhar (último ponto antes da vírgula)
    const parts = normalized.split('.');
    if (parts.length > 2) {
      // Tem múltiplos pontos - remove todos exceto o último (decimal)
      const lastPart = parts.pop();
      const withoutThousands = parts.join('');
      return parseFloat(withoutThousands + '.' + lastPart) || 0;
    }

    return parseFloat(normalized) || 0;
  }, []);

  // Handler para checkboxes
  const handleCheckboxChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  }, []);

  // Função auxiliar para obter valor de exibição (permite digitação normal)
  // Retorna string vazia apenas se for o valor inicial 0 e o campo não estiver focado
  const getNumericValue = useCallback((value: number): string => {
    // Se for 0, retorna string vazia para placeholder aparecer
    // Usuário pode digitar normalmente a partir daí
    return value === 0 ? '' : value.toString();
  }, []);

  // Calcular preview de predição
  const calcularRiscoPreview = useCallback((dados: Partial<AlunoFormData>) => {
    const risco = calcularRiscoEvasao({ ...formData, ...dados });
    setPredicaoPreview(risco);
  }, [formData]);

  // Resetar formulário
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setIsEditing(false);
    setPredicaoPreview(null);
  }, []);

  // Setar dados para edição
  // Handler específico para carregar dados de edição
  const setEditingData = useCallback((aluno: any) => {
    // Lógica de Sincronização: A matrícula manda mais que o ano salvo
    let anoFinal = aluno.ano_ingresso;
    if (aluno.matricula) {
      const yearMatch = String(aluno.matricula).match(/^(\d{4})/);
      if (yearMatch) {
        const anoMatricula = parseInt(yearMatch[1]);
        // Se a matrícula tem um ano válido, usamos ele
        if (anoMatricula >= 1950 && anoMatricula <= 2100) {
          anoFinal = anoMatricula;
        }
      }
    }

    setFormData({
      matricula: aluno.matricula || '',
      nome: aluno.nome || '',
      email: aluno.email || '',
      telefone: aluno.telefone || '',
      data_nascimento: aluno.data_nascimento || '',
      idade: aluno.idade || 0,
      sexo: aluno.sexo || 'M',
      curso_id: aluno.curso_id || 0,
      periodo: aluno.periodo || 1,
      turno: aluno.turno || 'MATUTINO',
      media_geral: aluno.media_geral || 0,
      frequencia: aluno.frequencia || 100,
      historico_reprovas: aluno.historico_reprovas || 0,
      coeficiente_rendimento: aluno.coeficiente_rendimento || 0,
      ano_ingresso: anoFinal,
      cidade: aluno.cidade || '',
      cep: aluno.cep || '',
      logradouro: aluno.logradouro || '',
      numero: aluno.numero || '',
      complemento: aluno.complemento || '',
      bairro: aluno.bairro || '',
      zona_residencial: aluno.zona_residencial || '',
      renda_familiar: aluno.renda_familiar || 0,
      renda_per_capita: aluno.renda_per_capita || 0,
      possui_auxilio: aluno.possui_auxilio || false,
      tipo_auxilio: aluno.tipo_auxilio || '',
      trabalha: aluno.trabalha || false,
      carga_horaria_trabalho: aluno.carga_horaria_trabalho || 0,
      tempo_deslocamento: aluno.tempo_deslocamento || 30,
      custo_transporte_diario: aluno.custo_transporte_diario || 0,
      dificuldade_acesso: aluno.dificuldade_acesso || 'MEDIA',
      transporte_utilizado: aluno.transporte_utilizado || '',
      usa_transporte_alternativo: aluno.usa_transporte_alternativo || false,
      possui_computador: aluno.possui_computador || false,
      possui_internet: aluno.possui_internet || false,
      beneficiario_bolsa_familia: aluno.beneficiario_bolsa_familia || false,
      primeiro_geracao_universidade: aluno.primeiro_geracao_universidade || false,
    });
    setIsEditing(true);
    setPredicaoPreview(null);
  }, []);

  // Submit do formulário (criar ou editar via API)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (!formData.matricula || !formData.nome || !formData.curso_id) {
      addToast({
        type: 'error',
        title: 'Campos obrigatórios',
        message: 'Preencha matrícula, nome e curso.',
      });
      return;
    }

    if (formData.media_geral < 0 || formData.media_geral > 10) {
      addToast({
        type: 'error',
        title: 'Média inválida',
        message: 'A média deve estar entre 0 e 10.',
      });
      return;
    }

    if (formData.frequencia < 0 || formData.frequencia > 100) {
      addToast({
        type: 'error',
        title: 'Frequência inválida',
        message: 'A frequência deve estar entre 0 e 100%.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('sapee_token');
      
      if (!token) {
        addToast({
          type: 'error',
          title: 'Erro de autenticação',
          message: 'Faça login novamente.',
        });
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      console.log('🔵 Tentando salvar aluno na URL:', API_URL);
      
      // Preparar dados para envio
      const dadosParaEnvio = {
        ...formData,
        // tipo_auxilio deve ser JSON array, não string vazia
        tipo_auxilio: formData.tipo_auxilio || '[]',
      };
      
      console.log('🔵 Dados do aluno:', JSON.stringify(dadosParaEnvio, null, 2));

      // Verificar campos obrigatórios
      console.log('🔵 Verificando campos obrigatórios:');
      console.log('  - matricula:', dadosParaEnvio.matricula);
      console.log('  - nome:', dadosParaEnvio.nome);
      console.log('  - curso_id:', dadosParaEnvio.curso_id);
      console.log('  - tipo_auxilio:', dadosParaEnvio.tipo_auxilio);

      if (isEditing) {
        // ATUALIZAR aluno existente
        console.log('🔵 Atualizando aluno:', dadosParaEnvio.matricula);
        await api.alunos.update(token, dadosParaEnvio.matricula, dadosParaEnvio);
        
        addToast({
          type: 'success',
          title: 'Aluno atualizado!',
          message: 'Cadastro atualizado com sucesso. Predição recalculada automaticamente.',
        });
      } else {
        // CRIAR novo aluno
        console.log('🔵 Criando novo aluno');
        await api.alunos.create(token, dadosParaEnvio);
        
        addToast({
          type: 'success',
          title: 'Aluno cadastrado!',
          message: 'Cadastro realizado com sucesso. Predição gerada automaticamente.',
        });
      }

      // Callback de sucesso (para recarregar lista, por exemplo)
      if (onSuccess) {
        onSuccess();
      }

      // Otimização: Navegar sem recarregar a página e corrigir o histórico (Back button)
      // Usamos 'replace: true' para que o botão "Voltar" não retorne ao formulário de edição
      navigate('/alunos', { replace: true });

      // Resetar formulário
      resetForm();
      
    } catch (error) {
      console.error('🔴 Erro ao salvar aluno:', error);
      
      let errorMessage = 'Erro ao processar solicitação';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando em http://localhost:8000';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditing, onSuccess, addToast, resetForm]);

  return {
    formData,
    isEditing,
    isLoading,
    isSubmitting,
    predicaoPreview,
    setFormData,
    handleInputChange,
    handleCurrencyChange,
    handleCheckboxChange,
    handleNumericFocus,
    getNumericValue,
    formatCurrency,
    parseCurrency,
    resetForm,
    setEditingData,
    handleSubmit,
    calcularRiscoPreview,
  };
}
