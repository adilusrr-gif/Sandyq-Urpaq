/**
 * Simple logging utility for load testing
 * Logs events to console and can be extended to send to Supabase
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEvent {
  level: LogLevel
  event: string
  data?: Record<string, any>
  timestamp: string
  userAgent?: string
}

const LOG_PREFIX = '[SandyQ]'

/**
 * Log an event to console (and optionally to backend)
 */
export function log(level: LogLevel, event: string, data?: Record<string, any>) {
  const logEvent: LogEvent = {
    level,
    event,
    data,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
  }

  const message = `${LOG_PREFIX} [${level.toUpperCase()}] ${event}`
  
  switch (level) {
    case 'error':
      console.error(message, data || '')
      break
    case 'warn':
      console.warn(message, data || '')
      break
    default:
      console.log(message, data || '')
  }

  // In production, you could send this to a logging service
  // sendToLoggingService(logEvent)
  
  return logEvent
}

// Convenience methods
export const logger = {
  info: (event: string, data?: Record<string, any>) => log('info', event, data),
  warn: (event: string, data?: Record<string, any>) => log('warn', event, data),
  error: (event: string, data?: Record<string, any>) => log('error', event, data),
  
  // Auth-specific logging
  auth: {
    signupAttempt: (phone: string) => log('info', 'auth:signup_attempt', { phone: phone.slice(-4) }),
    signupSuccess: (userId: string) => log('info', 'auth:signup_success', { userId: userId.slice(0, 8) }),
    signupError: (error: string) => log('error', 'auth:signup_error', { error }),
    
    loginAttempt: (phone: string) => log('info', 'auth:login_attempt', { phone: phone.slice(-4) }),
    loginSuccess: (userId: string) => log('info', 'auth:login_success', { userId: userId.slice(0, 8) }),
    loginError: (error: string) => log('error', 'auth:login_error', { error }),
    
    logout: () => log('info', 'auth:logout'),
    sessionExpired: () => log('warn', 'auth:session_expired'),
  },
  
  // Rate limit logging
  rateLimit: {
    hit: (action: string) => log('warn', 'rate_limit:hit', { action }),
  },
  
  // Navigation logging
  navigation: {
    page: (path: string) => log('info', 'navigation:page', { path }),
  },
}
