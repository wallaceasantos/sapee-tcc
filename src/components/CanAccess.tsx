import React from 'react';
import { useAuth, Role } from '../services/AuthContext';

interface CanAccessProps {
  role?: Role | Role[];
  permission?: string;
  recurso?: string;
  acao?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente para renderização condicional baseada em permissões
 * 
 * @example
 * // Esconder botão para não-ADMINs
 * <CanAccess role={['ADMIN']}>
 *   <Button onClick={handleDelete}>Excluir</Button>
 * </CanAccess>
 * 
 * @example
 * // Mostrar apenas se tiver permissão de importar
 * <CanAccess permission="importar">
 *   <Button>Importar CSV</Button>
 * </CanAccess>
 * 
 * @example
 * // Verificar permissão granular
 * <CanAccess recurso="alunos" acao="delete">
 *   <Button>Excluir Aluno</Button>
 * </CanAccess>
 */
export function CanAccess({
  role,
  permission,
  recurso,
  acao,
  children,
  fallback = null,
}: CanAccessProps) {
  const { user, hasRole, can } = useAuth();

  // Se não tiver usuário, não mostra
  if (!user) {
    return <>{fallback}</>;
  }

  // ADMIN tem acesso a tudo
  if (user.role === 'ADMIN') {
    return <>{children}</>;
  }

  // Verificar role
  if (role) {
    const hasRequiredRole = Array.isArray(role)
      ? role.includes(user.role)
      : user.role === role;

    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Verificar permissão simples (via função can do AuthContext)
  if (permission) {
    if (!hasRole(['ADMIN']) && !can(permission)) {
      return <>{fallback}</>;
    }
  }

  // Verificar permissão granular (recurso + ação)
  if (recurso && !can(recurso, acao)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook para verificar permissões em componentes
 * 
 * @example
 * function MeuComponente() {
 *   const { canAccess, hasRole, user } = useAccess();
 *   
 *   if (canAccess('alunos', 'delete')) {
 *     return <Button>Excluir</Button>;
 *   }
 *   return null;
 * }
 */
export function useAccess() {
  const { user, hasRole, can } = useAuth();

  const canAccess = (recurso: string, acao?: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return can(recurso, acao);
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return {
    user,
    canAccess,
    hasRole,
    hasAnyRole,
    role: user?.role,
    curso: user?.curso_nome,
  };
}
