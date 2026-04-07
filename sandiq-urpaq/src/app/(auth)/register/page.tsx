'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { PAYMENT_ENABLED, AUTH_CONFIG, getErrorMessage } from '@/lib/config'
import { logger } from '@/lib/logger'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const lastSubmitRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setInviteCode(invite)
    }
    
    // Cleanup on unmount
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const onSubmit = useCallback(async (data: RegisterInput) => {
    // Prevent double submission
    if (loading) return
    
    // Rate limit protection - min 3 seconds between attempts
    const now = Date.now()
    if (now - lastSubmitRef.current < AUTH_CONFIG.MIN_AUTH_INTERVAL_MS) {
      logger.rateLimit.hit('signup')
      toast.error('Подождите несколько секунд перед повторной попыткой')
      return
    }
    lastSubmitRef.current = now
    
    logger.auth.signupAttempt(data.phone)
    
    // Abort any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    try {
      const supabase = createClient() as any
      const birthYear = Number.isFinite(data.birth_year as number) ? data.birth_year : null

      // 1. Create Supabase auth user (email = phone@example.com workaround)
      // Using example.com as it's a reserved domain that passes email validation
      const email = `${data.phone.replace(/\D/g, '')}@example.com`
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: { 
          data: { full_name: data.full_name, phone: data.phone },
        },
      })

      if (authError) throw authError

      // 2. Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user!.id,
        full_name: data.full_name,
        phone: data.phone,
        birth_year: birthYear,
        tribe_zhuz: data.tribe_zhuz?.trim() || null,
        // If payments disabled, mark as paid immediately
        paid_at: PAYMENT_ENABLED ? null : new Date().toISOString(),
      })

      if (profileError) throw profileError

      logger.auth.signupSuccess(authData.user!.id)
      toast.success('Аккаунт создан!')

      if (inviteCode) {
        router.push(`/join/${inviteCode}`)
      } else {
        router.push('/dashboard?onboarding=true')
      }
    } catch (err: any) {
      // Don't show error if request was aborted
      if (err?.name === 'AbortError') return
      logger.auth.signupError(err?.message || 'Unknown error')
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [loading, inviteCode, router])

  return (
    <div className="animate-fade-up">
      <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">
        {PAYMENT_ENABLED ? 'Шаг 1 из 3' : 'Регистрация'}
      </div>
      <h1 className="font-display font-bold text-parchment text-2xl sm:text-3xl mb-2">
        Создать семейный кабинет
      </h1>
      <p className="font-body italic text-parchment/40 text-base sm:text-lg mb-8 sm:mb-10">
        Один красивый профиль, чтобы хранить дерево рода, истории и голос семьи
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Имя</label>
            <input 
              {...register('full_name')} 
              className="input-field text-base"
              placeholder="Алибек Сейтов"
              autoComplete="name"
              disabled={loading}
            />
            {errors.full_name && (
              <p className="font-mono text-[10px] text-red-400 mt-1">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <label className="label">Жуз / Регион</label>
            <input 
              {...register('tribe_zhuz')} 
              className="input-field text-base"
              placeholder="Старший жуз"
              disabled={loading}
            />
          </div>
        </div>

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
          <label className="label">Год рождения (необязательно)</label>
          <input 
            {...register('birth_year', { valueAsNumber: true })}
            className="input-field text-base" 
            type="number" 
            placeholder="1990"
            disabled={loading}
          />
        </div>

        <div>
          <label className="label">Пароль</label>
          <input 
            {...register('password')} 
            className="input-field text-base"
            type="password" 
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            disabled={loading}
          />
          {errors.password && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Payment preview - only show if payments enabled */}
        {PAYMENT_ENABLED && (
          <div className="card-gold flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] tracking-[2px] uppercase text-parchment/40 mb-1">
                Доступ к кабинету
              </div>
              <div className="font-display font-black text-3xl text-gold">500 ₸</div>
              <div className="font-mono text-[9px] text-parchment/30 mt-1">
                Kaspi или демо-активация для тестового запуска
              </div>
            </div>
            <div className="bg-[#ef3e42] text-white font-display font-bold text-xs px-4 py-2 rounded-full">
              TEST MODE
            </div>
          </div>
        )}

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
              Создаём аккаунт...
            </span>
          ) : 'Создать аккаунт →'}
        </button>
      </form>

      <p className="font-mono text-[10px] text-parchment/30 text-center mt-6 tracking-widest">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-gold hover:text-gold-2 transition-colors">
          Войти
        </Link>
      </p>
    </div>
  )
}
