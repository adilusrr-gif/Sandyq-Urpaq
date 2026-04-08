'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [redirectPath, setRedirectPath] = useState('/dashboard')

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect && redirect.startsWith('/')) {
      setRedirectPath(redirect)
    }
  }, [])

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Неверный email или пароль')
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Подтвердите email через письмо на почте')
        }
        throw error
      }

      if (!authData.session) {
        throw new Error('Не удалось создать сессию')
      }

      toast.success('Добро пожаловать!')
      router.refresh()
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push(redirectPath)
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display font-bold text-parchment text-3xl mb-2">
        Войти
      </h1>
      <p className="font-body italic text-parchment/40 text-lg mb-10">
        С возвращением, хранитель
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Email</label>
          <input {...register('email')} className="input-field"
                 type="email" placeholder="alibek@gmail.com" autoComplete="email" autoFocus />
          {errors.email && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="label">Пароль</label>
          <input {...register('password')} className="input-field"
                 type="password" placeholder="••••••••" autoComplete="current-password" />
          {errors.password && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              Входим...
            </span>
          ) : 'Войти →'}
        </button>
      </form>

      <p className="font-mono text-[10px] text-parchment/30 text-center mt-6 tracking-widest">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-gold hover:text-gold-2 transition-colors">
          Зарегистрироваться — 500 ₸
        </Link>
      </p>
    </div>
  )
}
