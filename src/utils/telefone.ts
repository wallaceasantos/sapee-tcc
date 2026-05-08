/**
 * Utilitários de formatação de telefone
 * SAPEE DEWAS
 */

/**
 * Formata número de telefone para o padrão (XX) XXXXX-XXXX
 * Aceita entradas com 10 ou 11 dígitos (com ou sem formatação)
 */
export function formatarTelefone(value: string): string {
  // Remove todos os caracteres não numéricos
  const digits = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const limited = digits.slice(0, 11);
  
  if (limited.length === 0) return '';
  
  // Formata conforme tamanho
  if (limited.length <= 2) {
    return `(${limited}`;
  } else if (limited.length <= 7) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
}

/**
 * Remove formatação de telefone, retornando apenas dígitos.
 * Retorna null se estiver vazio.
 */
export function limparTelefone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * Valida se um telefone tem 10 ou 11 dígitos
 */
export function validarTelefone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}
