/**
 * Utilitários para formatação e validação de telefone
 * Garante consistência em todo o sistema
 */

/**
 * Remove toda a formatação do telefone, deixando apenas números
 * @example cleanPhone("(67) 99999-9999") => "67999999999"
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Formata telefone brasileiro com DDD
 * @example formatPhone("67999999999") => "(67) 99999-9999"
 * @example formatPhone("6799999999") => "(67) 9999-9999"
 */
export function formatPhone(phone: string): string {
  const cleaned = cleanPhone(phone)

  if (cleaned.length === 0) return ''

  // Celular com 9 dígitos: (XX) XXXXX-XXXX
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }

  // Telefone fixo: (XX) XXXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }

  // Parcialmente digitado - apenas DDD
  if (cleaned.length <= 2) {
    return cleaned
  }

  // Parcialmente digitado - DDD + início
  if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  }

  // Parcialmente digitado - quase completo
  if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }

  // Parcialmente digitado - celular
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
}

/**
 * Valida se o telefone brasileiro está completo
 * @example isValidPhone("67999999999") => true
 * @example isValidPhone("679999") => false
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = cleanPhone(phone)
  // Aceita telefone fixo (10 dígitos) ou celular (11 dígitos)
  return cleaned.length === 10 || cleaned.length === 11
}

/**
 * Normaliza telefone para comparação no banco de dados
 * Remove formatação E aplica formatação padrão
 * @example normalizePhone("67999999999") => "(67) 99999-9999"
 * @example normalizePhone("(67) 99999-9999") => "(67) 99999-9999"
 */
export function normalizePhone(phone: string): string {
  return formatPhone(cleanPhone(phone))
}