'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { AUTH_CONFIG, getErrorMessage, ERROR_MESSAGES } from '@/lib/config'
import { logger } from '@/lib/logger'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [redirectPath, setRedirectPath] = useState('/dashboard')
  const lastSubmitRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect && redirect.startsWith('/')) {
      setRedirectPath(redirect)
    }
    
    // Cleanup on unmount
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const onSubmit = useCallback(async (data: LoginInput) => {
    // Prevent double submission
    if (loading) return
    
    // Rate limit protection - min 3 seconds between attempts
    const now = Date.now()
    if (now - lastSubmitRef.current < AUTH_CONFIG.MIN_AUTH_INTERVAL_MS) {
      logger.rateLimit.hit('login')
      toast.error('Подождите несколько секунд перед повторной попыткой')
      return
    }
    lastSubmitRef.current = now
    
    logger.auth.loginAttempt(data.phone)
    
    // Abort any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    const supabase = createClient()
    
    try {
      // Using example.com as it's a reserved domain that passes email validation
      const email = `${data.phone.replace(/\D/g, '')}@example.com`
      console.log('[v0] Attempting login with email:', email)
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password: data.password 
      })
      
      console.log('[v0] signInWithPassword result:', { 
        hasSession: !!authData?.session,
        hasUser: !!authData?.user,
        error: error?.message 
      })
      
      if (error) {
        console.log('[v0] Login error:', error.message)
        throw error
      }
      
      if (!authData.session) {
        console.log('[v0] No session returned from login')
        throw new Error('Сессия не создана. Попробуйте еще раз.')
      }
      
      // Verify session was saved
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[v0] getUser after login:', { userId: user?.id })
      
      logger.auth.loginSuccess(user?.id || 'unknown')
      toast.success('Добро пожаловать!')
      
      console.log('[v0] Redirecting to:', redirectPath)
      // Small delay to ensure cookies are written before redirect
      await new Promise(resolve => setTimeout(resolve, 100))
      // Use hard redirect to ensure session cookies are properly read
      window.location.href = redirectPath
    } catch (err: any) {
      console.log('[v0] Caught error:', err?.message, err)
      
      // Don't show error if request was aborted
      if (err?.name === 'AbortError') return
      
      logger.auth.loginError(err?.message || 'Unknown error')
      
      // Check for specific auth errors
      const message = err?.message?.toLowerCase() || ''
      if (message.includes('invalid login') || message.includes('invalid credentials')) {
        toast.error(ERROR_MESSAGES.INVALID_CREDENTIALS)
      } else {
        toast.error(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }, [loading, redirectPath])

  return (
    <div className="animate-fade-up">
      <h1 className="font-display font-bold text-parchment text-2xl sm:text-3xl mb-2">
        Вернуться в кабинет
      </h1>
      <p className="font-body italic text-parchment/40 text-base sm:text-lg mb-8 sm:mb-10">
        Продолжайте собирать семейную историю там, где остановились
      </p>

      <form 
        method="POST" 
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit(onSubmit)(e)
        }} 
        className="space-y-4 sm:space-y-5"
      >
        <div>
          <label className="label">Номер телефона</label>
          <input 
            {...register('phone')} 
            className="input-field text-base"
            type="tel" 
            placeholder="+77001234567"
            autoComplete="tel"
            disabled={loading}
          />
          {errors.phone && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="label">Пароль</label>
          <input 
            {...register('password')} 
            className="input-field text-base"
            type="password" 
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />
          {errors.password && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="btn-primary w-full min-h-[48px] text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Входим...
            </span>
          ) : 'Войти →'}
        </button>
      </form>

      <p className="font-mono text-[10px] text-parchment/30 text-center mt-6 tracking-widest">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-gold hover:text-gold-2 transition-colors">
          Создать семейный кабинет
        </Link>
      </p>
    </div>
  )
}
