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
      // Using example.com as it's a reserved domain that passes email validation
      const email = `${data.phone.replace(/\D/g, '')}@example.com`
      const { error } = await supabase.auth.signInWithPassword({ email, password: data.password })
      if (error) throw error
      toast.success('Добро пожаловать!')
      router.push(redirectPath)
      router.refresh()
    } catch (err: any) {
      toast.error('Неверный телефон или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display font-bold text-parchment text-3xl mb-2">
        Вернуться в кабинет
      </h1>
      <p className="font-body italic text-parchment/40 text-lg mb-10">
        Продолжайте собирать семейную историю там, где остановились
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Номер телефона</label>
          <input {...register('phone')} className="input-field"
                 type="tel" placeholder="+77001234567" />
          {errors.phone && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="label">Пароль</label>
          <input {...register('password')} className="input-field"
                 type="password" placeholder="••••••••" />
          {errors.password && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Входим...' : 'Войти →'}
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
