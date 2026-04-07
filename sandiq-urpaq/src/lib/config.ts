/**
 * Application configuration
 * Centralized config for feature flags and settings
 */

// Payment feature flag - set to false for load testing
// When enabled, users need to pay 500 tg to access all features
export const PAYMENT_ENABLED = false

// Auth configuration
export const AUTH_CONFIG = {
  // Minimum seconds between auth attempts (rate limit protection)
  MIN_AUTH_INTERVAL_MS: 3000,
  // Session persistence settings
  persistSession: true,
  autoRefreshToken: true,
} as const

// Human-readable error messages (no raw Supabase errors)
export const ERROR_MESSAGES = {
  // Auth errors
  RATE_LIMIT: 'Слишком много попыток. Подождите несколько секунд и попробуйте снова.',
  NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету.',
  INVALID_CREDENTIALS: 'Неверный телефон или пароль',
  USER_EXISTS: 'Пользователь с таким номером уже зарегистрирован',
  REGISTRATION_ERROR: 'Не удалось создать аккаунт. Попробуйте позже.',
  LOGIN_ERROR: 'Не удалось войти. Попробуйте позже.',
  // Generic errors
  GENERIC_ERROR: 'Произошла ошибка. Попробуйте позже.',
  SESSION_EXPIRED: 'Сессия истекла. Пожалуйста, войдите снова.',
} as const

/**
 * Get user-friendly error message from Supabase error
 */
export function getErrorMessage(error: any): string {
  if (!error) return ERROR_MESSAGES.GENERIC_ERROR
  
  const message = error.message?.toLowerCase() || ''
  const code = error.code || ''
  
  // Rate limiting
  if (code === 'over_request_rate_limit' || message.includes('rate limit') || message.includes('too many')) {
    return ERROR_MESSAGES.RATE_LIMIT
  }
  
  // Network errors
  if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  
  // Auth errors
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS
  }
  
  if (message.includes('user already registered') || message.includes('already exists')) {
    return ERROR_MESSAGES.USER_EXISTS
  }
  
  return ERROR_MESSAGES.GENERIC_ERROR
}
