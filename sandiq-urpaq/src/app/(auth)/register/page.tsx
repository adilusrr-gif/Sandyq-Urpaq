'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PAYMENT_ENABLED } from '@/lib/config'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [tribeZhuz, setTribeZhuz] = useState('')
  const [phone, setPhone] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) setInviteCode(invite)
  }, [])

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    
    if (loading) return
    
    setLoading(true)
    setError(null)

    // Validate inputs
    if (!fullName.trim()) {
      setError('Введите ваше имя')
      setLoading(false)
      return
    }
    
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
      
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Этот номер телефона уже зарегистрирован')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Не удалось создать аккаунт. Попробуйте еще раз.')
        setLoading(false)
        return
      }

      // 2. Create user profile
      const birthYearNum = birthYear ? parseInt(birthYear) : null
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        full_name: fullName.trim(),
        phone,
        birth_year: birthYearNum && !isNaN(birthYearNum) ? birthYearNum : null,
        tribe_zhuz: tribeZhuz.trim() || null,
        paid_at: PAYMENT_ENABLED ? null : new Date().toISOString(),
      })

      if (profileError) {
        setError('Ошибка создания профиля: ' + profileError.message)
        setLoading(false)
        return
      }

      // Success - redirect
      if (inviteCode) {
        router.push(`/join/${inviteCode}`)
      } else {
        router.push('/dashboard?onboarding=true')
      }
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка'
      setError(message)
      setLoading(false)
    }
  }

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

      <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fullName" className="label">Имя</label>
            <input 
              id="fullName"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field text-base"
              placeholder="Алибек Сейтов"
              autoComplete="name"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label htmlFor="tribeZhuz" className="label">Жуз / Регион</label>
            <input 
              id="tribeZhuz"
              name="tribeZhuz"
              type="text"
              value={tribeZhuz}
              onChange={(e) => setTribeZhuz(e.target.value)}
              className="input-field text-base"
              placeholder="Старший жуз"
              disabled={loading}
            />
          </div>
        </div>

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
            required
          />
        </div>

        <div>
          <label htmlFor="birthYear" className="label">Год рождения (необязательно)</label>
          <input 
            id="birthYear"
            name="birthYear"
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="input-field text-base"
            placeholder="1990"
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
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            disabled={loading}
            required
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="font-mono text-sm text-red-400">{error}</p>
          </div>
        )}

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
          ) : 'Создать аккаунт'}
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
