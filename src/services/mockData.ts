import { AlunoComRisco, NivelRisco, Intervencao, StatusIntervencao } from '../types';

export const MOCK_INTERVENCOES: Intervencao[] = [
  {
    id: 'int-1',
    alunoId: '2021101002',
    data: '2026-03-01',
    tipo: 'Reunião com Coordenação',
    descricao: 'Conversa sobre baixa frequência e dificuldades em conciliar trabalho e estudo.',
    responsavel: 'Prof. Ricardo Silva',
    status: StatusIntervencao.CONCLUIDA
  },
  {
    id: 'int-2',
    alunoId: '2021101002',
    data: '2026-03-05',
    tipo: 'Encaminhamento Psicológico',
    descricao: 'Aluno relatou alto nível de estresse e cansaço.',
    responsavel: 'Coordenação Pedagógica',
    status: StatusIntervencao.EM_ANDAMENTO
  },
  {
    id: 'int-3',
    alunoId: '2021101005',
    data: '2026-02-20',
    tipo: 'Auxílio Permanência',
    descricao: 'Início do processo de solicitação de auxílio transporte.',
    responsavel: 'Assistência Estudantil',
    status: StatusIntervencao.PENDENTE
  }
];

export const MOCK_ALUNOS: AlunoComRisco[] = [
  {
    matricula: '2021101001',
    id: '2021101001',
    nome: 'Ana Silva Oliveira',
    idade: 19,
    sexo: 'F',
    curso: 'Informática',
    periodo: 4,
    mediaGeral: 8.5,
    media_geral: 8.5,
    frequencia: 95,
    rendaFamiliar: 1500,
    renda_familiar: 1500,
    cidade: 'Manaus',
    possuiAuxilio: true,
    possui_auxilio: true,
    trabalha: false,
    historicoReprovas: 0,
    historico_reprovas: 0,
    predicao: {
      risco_evasao: 12,
      nivel_risco: NivelRisco.BAIXO,
      principais_fatores: ['Alta frequência', 'Bom desempenho acadêmico']
    }
  },
  {
    matricula: '2021101002',
    id: '2021101002',
    nome: 'João Pereira Santos',
    idade: 22,
    sexo: 'M',
    curso: 'Edificações',
    periodo: 6,
    mediaGeral: 5.2,
    media_geral: 5.2,
    frequencia: 65,
    rendaFamiliar: 900,
    renda_familiar: 900,
    cidade: 'Manaus',
    possuiAuxilio: false,
    possui_auxilio: false,
    trabalha: true,
    historicoReprovas: 3,
    historico_reprovas: 3,
    predicao: {
      risco_evasao: 88,
      nivel_risco: NivelRisco.ALTO,
      principais_fatores: ['Baixa frequência', 'Baixo rendimento', 'Trabalha e estuda']
    }
  },
  {
    matricula: '2021101003',
    id: '2021101003',
    nome: 'Maria Eduarda Costa',
    idade: 20,
    sexo: 'F',
    curso: 'Mecânica',
    periodo: 3,
    mediaGeral: 6.8,
    media_geral: 6.8,
    frequencia: 82,
    rendaFamiliar: 1200,
    renda_familiar: 1200,
    cidade: 'Manaus',
    possuiAuxilio: true,
    possui_auxilio: true,
    trabalha: false,
    historicoReprovas: 1,
    historico_reprovas: 1,
    predicao: {
      risco_evasao: 45,
      nivel_risco: NivelRisco.MEDIO,
      principais_fatores: ['Queda no rendimento', 'Histórico de reprovas']
    }
  },
  {
    matricula: '2021101004',
    id: '2021101004',
    nome: 'Ricardo Almeida',
    idade: 21,
    sexo: 'M',
    curso: 'Informática',
    periodo: 5,
    mediaGeral: 7.2,
    media_geral: 7.2,
    frequencia: 88,
    rendaFamiliar: 2500,
    renda_familiar: 2500,
    cidade: 'Itacoatiara',
    possuiAuxilio: false,
    possui_auxilio: false,
    trabalha: false,
    historicoReprovas: 0,
    historico_reprovas: 0,
    predicao: {
      risco_evasao: 25,
      nivel_risco: NivelRisco.BAIXO,
      principais_fatores: ['Deslocamento intermunicipal']
    }
  },
  {
    matricula: '2021101005',
    id: '2021101005',
    nome: 'Beatriz Souza',
    idade: 18,
    sexo: 'F',
    curso: 'Química',
    periodo: 2,
    mediaGeral: 4.5,
    media_geral: 4.5,
    frequencia: 70,
    rendaFamiliar: 800,
    renda_familiar: 800,
    cidade: 'Manaus',
    possuiAuxilio: true,
    possui_auxilio: true,
    trabalha: false,
    historicoReprovas: 2,
    historico_reprovas: 2,
    predicao: {
      risco_evasao: 75,
      nivel_risco: NivelRisco.ALTO,
      principais_fatores: ['Baixa renda', 'Baixo rendimento']
    }
  },
  // Adding more to reach ~20
  ...Array.from({ length: 15 }).map((_, i) => {
    const matricula = (2021101006 + i).toString();
    const cursos = ['Informática', 'Edificações', 'Mecânica', 'Química', 'Eletrotécnica'];
    const curso = cursos[Math.floor(Math.random() * cursos.length)];
    const freq = Math.floor(Math.random() * 40) + 60;
    const media = Math.random() * 6 + 4;
    const risco = Math.floor(Math.random() * 100);
    let nivel = NivelRisco.BAIXO;
    if (risco > 70) nivel = NivelRisco.ALTO;
    else if (risco > 30) nivel = NivelRisco.MEDIO;

    return {
      matricula,
      id: matricula,
      nome: `Aluno Exemplo ${i + 6}`,
      idade: 18 + Math.floor(Math.random() * 10),
      sexo: Math.random() > 0.5 ? 'M' : 'F',
      curso,
      periodo: Math.floor(Math.random() * 8) + 1,
      mediaGeral: Number(media.toFixed(1)),
      media_geral: Number(media.toFixed(1)),
      frequencia: freq,
      rendaFamiliar: 800 + Math.floor(Math.random() * 3000),
      renda_familiar: 800 + Math.floor(Math.random() * 3000),
      cidade: Math.random() > 0.8 ? 'Manacapuru' : 'Manaus',
      possuiAuxilio: Math.random() > 0.5,
      possui_auxilio: Math.random() > 0.5,
      trabalha: Math.random() > 0.7,
      historicoReprovas: Math.floor(Math.random() * 4),
      historico_reprovas: Math.floor(Math.random() * 4),
      predicao: {
        risco_evasao: risco,
        nivel_risco: nivel,
        principais_fatores: ['Fator aleatório de teste']
      }
    } as AlunoComRisco;
  })
];
