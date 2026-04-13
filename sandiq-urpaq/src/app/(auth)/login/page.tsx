'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate inputs
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setError('Введите корректный номер телефона')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const email = `${cleanPhone}@example.com`
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Неверный телефон или пароль')
        } else {
          setError(authError.message)
        }
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Произошла ошибка. Попробуйте еще раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display font-bold text-parchment text-2xl sm:text-3xl mb-2">
        Вернуться в кабинет
      </h1>
      <p className="font-body italic text-parchment/40 text-base sm:text-lg mb-8 sm:mb-10">
        Продолжайте собирать семейную историю там, где остановились
      </p>

      <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
        <div>
          <label className="label">Номер телефона</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field text-base"
            placeholder="+77001234567"
            autoComplete="tel"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="label">Пароль</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field text-base"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            required
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
