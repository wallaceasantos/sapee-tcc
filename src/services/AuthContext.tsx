import React, { createContext, useContext, useState, useEffect } from 'react';
import { logAction } from './logService';
import { api } from './api';
import { storage } from '../utils/storage';

// Tipos de Roles
export type Role = 'ADMIN' | 'COORDENADOR' | 'PEDAGOGO' | 'DIRETOR' | 'PROFESSOR';

// Interface de Curso (resposta da API)
interface CursoResponse {
  id: number;
  nome: string;
}

// Interface de Role (resposta da API)
interface RoleResponse {
  id: number;
  nome: string;
  descricao?: string;
  permissoes?: string;
  criado_at?: string;
}

// Interface de Usuário (normalizada - usada no frontend)
export interface User {
  id: number;
  nome: string;
  email: string;
  role: Role;
  curso_id?: number;
  curso_nome?: string;
  ativo: boolean;
}

// Interface de Usuário da resposta da API (pode ter objetos aninhados)
interface UserApiResponse {
  id: number;
  nome: string;
  email: string;
  role?: string | RoleResponse;
  curso_id?: number;
  curso_nome?: string;
  curso?: CursoResponse;
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: (navigate?: (to: string) => void) => void;
  hasRole: (role: Role | Role[]) => boolean;
  can: (recurso: string, acao?: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se já tem usuário logado ao carregar
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const storedUser = storage.user.get();
      const storedToken = storage.token.get();

      // Limpar dados antigos corrompidos (role como objeto)
      if (storedUser && typeof (storedUser as any).role === 'object') {
            storage.clearAll();
            if (isMounted) {
              setIsLoading(false);
            }
            return;
          }

      if (storedUser && storedToken) {
        try {
          // Validar token com backend
          try {
            const userData: UserApiResponse = await api.auth.me(storedToken);

            // Extrair role - pode vir como string ou objeto ou undefined
            let roleName: string;
            if (!userData.role) {
              roleName = 'ADMIN';
            } else if (typeof userData.role === 'string') {
              roleName = userData.role;
            } else if (typeof userData.role === 'object' && 'nome' in userData.role) {
              roleName = userData.role.nome;
            } else {
              roleName = 'ADMIN';
            }

            // Extrair curso_nome se existir
            let cursoNome: string | undefined;
            if (userData.curso && typeof userData.curso === 'object' && 'nome' in userData.curso) {
              cursoNome = userData.curso.nome;
            } else if (typeof userData.curso_nome === 'string') {
              cursoNome = userData.curso_nome;
            }

            if (isMounted) {
              const normalizedUser: User = {
                id: userData.id,
                nome: userData.nome,
                email: userData.email,
                role: roleName as Role,
                curso_id: userData.curso_id,
                curso_nome: cursoNome,
                ativo: userData.ativo,
              };
              setUser(normalizedUser);
              storage.user.set(normalizedUser);
              setToken(storedToken);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error('Token inválido, limpando dados...', error);
            storage.user.clear();
            storage.token.clear();
            storage.refreshToken.clear();
          }
        } catch (error) {
          console.error('Erro ao carregar usuário:', error);
          storage.user.clear();
        }
      }
      // Sempre definir isLoading como false se não houver usuário válido
      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadUser();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      // Login com API real
      const response = await api.auth.login({ email, senha });
      
      // Armazenar token
      storage.token.set(response.access_token);
      storage.refreshToken.set(response.refresh_token);
      setToken(response.access_token);

      // Obter dados do usuário
      const userData: UserApiResponse = await api.auth.me(response.access_token);

      // Extrair role - pode vir como string ou objeto ou undefined
      let roleName: string;
      if (!userData.role) {
        roleName = 'ADMIN';
      } else if (typeof userData.role === 'string') {
        roleName = userData.role;
      } else if (typeof userData.role === 'object' && 'nome' in userData.role) {
        roleName = userData.role.nome;
      } else {
        roleName = 'ADMIN';
      }

      // Extrair curso_nome se existir
      let cursoNome: string | undefined;
      if (userData.curso && typeof userData.curso === 'object' && 'nome' in userData.curso) {
        cursoNome = userData.curso.nome;
      } else if (typeof userData.curso_nome === 'string') {
        cursoNome = userData.curso_nome;
      }

      // Extrair curso_id se vier do objeto curso
      let cursoId: number | undefined = userData.curso_id;
      if (userData.curso && typeof userData.curso === 'object' && 'id' in userData.curso) {
        cursoId = userData.curso.id;
      }

      // Salvar usuário normalizado
      const userToSave: User = {
        id: userData.id,
        nome: userData.nome,
        email: userData.email,
        role: roleName as Role,
        curso_id: cursoId,
        curso_nome: cursoNome,
        ativo: userData.ativo,
      };

      setUser(userToSave);
      storage.user.set(userToSave);
      
      // Log de sucesso
      logAction('Login', `Usuário realizou acesso ao sistema: ${email}`);
      
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      logAction('Tentativa de Login', `Falha ao tentar acessar com o e-mail: ${email}`);
      return false;
    }
  };

  const logout = () => {
    if (user) {
      logAction('Logout', `Usuário encerrou a sessão: ${user.email}`);
    }
    setUser(null);
    setToken(null);
    storage.user.clear();
    storage.token.clear();
    storage.refreshToken.clear();
    window.location.href = '/login';
  };

  // Verificar se tem um dos roles
  const hasRole = (role: Role | Role[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  // Verificar permissão granular (recurso + ação)
  const can = (recurso: string, acao?: string): boolean => {
    if (!user) return false;

    // ADMIN pode tudo
    if (user.role === 'ADMIN') return true;

    // Lógica simplificada por role
    switch (user.role) {
      case 'COORDENADOR':
        if (recurso === 'logs' || recurso === 'usuarios') return false;
        return true;
      case 'PEDAGOGO':
        if (recurso === 'alunos' && acao === 'delete') return false;
        if (recurso === 'importar' || recurso === 'usuarios') return false;
        return true;
      case 'DIRETOR':
        if (recurso === 'usuarios' || recurso === 'configuracoes') return false;
        return true;
      case 'PROFESSOR':
        // Professor pode: lançar faltas, ver alunos (read), ver suas disciplinas, lançar notas
        if (recurso === 'usuarios' || recurso === 'importar' || recurso === 'logs' || recurso === 'configuracoes') return false;
        if (recurso === 'alunos' && acao && acao !== 'read') return false;
        return true;
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
