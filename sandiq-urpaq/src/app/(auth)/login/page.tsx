'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import { login } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="btn-primary w-full min-h-[48px] text-base"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Входим...
        </span>
      ) : 'Войти'}
    </button>
  )
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
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

      <form action={handleAction} className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="phone" className="label">Номер телефона</label>
          <input 
            id="phone"
            name="phone"
            type="tel" 
            className="input-field text-base"
            placeholder="+77001234567"
            autoComplete="tel"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Пароль</label>
          <input 
            id="password"
            name="password"
            type="password"
            className="input-field text-base"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            minLength={6}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="font-mono text-sm text-red-400">{error}</p>
          </div>
        )}

        <SubmitButton />
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
