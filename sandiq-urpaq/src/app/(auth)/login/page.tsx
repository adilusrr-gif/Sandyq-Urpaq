'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

// Создаём клиент на уровне модуля
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('[v0] LoginPage mounted')
    console.log('[v0] Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET')
    console.log('[v0] Supabase Key:', supabaseKey ? 'SET' : 'NOT SET')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[v0] handleSubmit called')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[v0] Missing Supabase credentials')
      setError('Ошибка конфигурации. Обратитесь к администратору.')
      return
    }
    
    const cleanPhone = phone.replace(/\D/g, '')
    console.log('[v0] Phone cleaned:', cleanPhone)
    
    if (cleanPhone.length < 10) {
      setError('Введите корректный номер телефона')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    setLoading(true)
    setError(null)
    console.log('[v0] Starting login process...')

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseKey)
      const email = `${cleanPhone}@example.com`
      console.log('[v0] Attempting login with:', email)
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('[v0] Login response:', { hasSession: !!data?.session, error: authError?.message })

      if (authError) {
        console.log('[v0] Auth error:', authError.message)
        if (authError.message.includes('Invalid login credentials')) {
          setError('Неверный телефон или пароль')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      console.log('[v0] Login successful, redirecting...')
      // Успешный вход - жёсткий редирект
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('[v0] Catch error:', err)
      setError('Произошла ошибка при входе')
      setLoading(false)
    }
  }
  
  // Показываем загрузку пока компонент не смонтирован
  if (!mounted) {
    return (
      <div className="animate-fade-up flex items-center justify-center min-h-[300px]">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display font-bold text-parchment text-2xl sm:text-3xl mb-2">
        Вернуться в кабинет
      </h1>
      <p className="font-body italic text-parchment/40 text-base sm:text-lg mb-8 sm:mb-10">
        Продолжайте собирать семейную историю там, где остановились
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="phone" className="label">Номер телефона</label>
          <input 
            id="phone"
            name="phone"
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field text-base"
            placeholder="+77001234567"
            autoComplete="tel"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Пароль</label>
          <input 
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field text-base"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="font-mono text-sm text-red-400">{error}</p>
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
              Входим...
            </span>
          ) : 'Войти'}
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
