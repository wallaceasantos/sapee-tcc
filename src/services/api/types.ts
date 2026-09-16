export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  role_id: number;
  curso_id?: number;
  ativo: boolean;
  role?: {
    id: number;
    nome: string;
    descricao?: string;
  };
}
