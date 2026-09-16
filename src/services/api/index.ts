import { API_BASE_URL, fetchWithAuth } from './client';
export { API_BASE_URL, fetchWithAuth };
export * from './types';

import { auth } from './auth';
import { alunos } from './alunos';
import { dashboard } from './dashboard';
import { usuarios } from './usuarios';
import { predicoes } from './predicoes';
import { notificacoes } from './notificacoes';
import { intervencoes } from './intervencoes';
import { faltas } from './faltas';
import { frequencia } from './frequencia';
import { cursos } from './cursos';
import { disciplinas } from './disciplinas';
import { notas } from './notas';
import { configuracoes } from './configuracoes';
import { comunicacoes } from './comunicacoes';
import { relatorios } from './relatorios';
import { jornada } from './jornada';
import { atendimentos } from './atendimentos';

export const api = {
  auth,
  alunos,
  dashboard,
  usuarios,
  predicoes,
  notificacoes,
  intervencoes,
  faltas,
  frequencia,
  cursos,
  disciplinas,
  notas,
  configuracoes,
  comunicacoes,
  relatorios,
  jornada,
  atendimentos,
};

export default api;
