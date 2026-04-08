'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setInviteCode(invite)
    }
  }, [])

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)
    try {
      const supabase = createClient() as any

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            tribe_zhuz: data.tribe_zhuz?.trim() || null,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Этот email уже зарегистрирован. Попробуйте войти.')
        }
        if (authError.message.includes('Password should be')) {
          throw new Error('Пароль слишком простой. Используйте не меньше 8 символов.')
        }
        throw authError
      }

      if (!authData.user) {
        throw new Error('Не удалось создать аккаунт')
      }

      if (authData.session) {
        toast.success('Аккаунт создан. Можно переходить к дереву.')

        if (inviteCode) {
          router.push(`/join/${inviteCode}`)
        } else {
          router.push('/dashboard?onboarding=true')
        }
      } else {
        toast.success('Проверьте почту — письмо для входа уже отправлено.')
        router.push('/login')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">
        Шаг 1 из 3
      </div>
      <h1 className="font-display font-bold text-parchment text-3xl mb-2">
        Создать семейный кабинет
      </h1>
      <p className="font-body italic text-parchment/40 text-lg mb-10">
        Один красивый профиль, чтобы хранить дерево рода, истории и голос семьи
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Имя</label>
            <input {...register('full_name')} className="input-field"
                   placeholder="Алибек Сейтов" />
            {errors.full_name && (
              <p className="font-mono text-[10px] text-red-400 mt-1">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <label className="label">Жуз / Регион</label>
            <input {...register('tribe_zhuz')} className="input-field"
                   placeholder="Старший жуз" />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input {...register('email')} className="input-field"
                 type="email" placeholder="alibek@gmail.com" autoComplete="email" />
          {errors.email && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="label">Пароль</label>
          <input {...register('password')} className="input-field"
                 type="password" placeholder="Минимум 8 символов" />
          {errors.password && (
            <p className="font-mono text-[10px] text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Payment preview */}
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Создаём аккаунт...' : 'Создать аккаунт →'}
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
