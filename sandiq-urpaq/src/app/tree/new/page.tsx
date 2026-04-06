'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { treeSchema, type TreeInput } from '@/lib/validations'

export default function NewTreePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<TreeInput>({
    resolver: zodResolver(treeSchema),
    defaultValues: { default_visibility: 'family' },
  })

  const visibility = watch('default_visibility')

  const onSubmit = async (data: TreeInput) => {
    setLoading(true)
    try {
      const response = await fetch('/api/trees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json().catch(() => ({}))

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Не удалось создать дерево')
      }

      toast.success('Дерево готово. Теперь добавьте себя.')
      router.push(`/tree/${result.tree.id}/add-person?gen=0&first=true`)
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка создания дерева')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-lg animate-fade-up">
        {/* Header */}
        <button onClick={() => router.back()}
                className="font-mono text-[10px] tracking-[3px] uppercase text-parchment/30
                           hover:text-gold transition-colors mb-8 flex items-center gap-2">
          ← Назад
        </button>

        <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">
          Шаг 1 из 4
        </div>
        <h1 className="font-display font-bold text-parchment text-4xl mb-2">
          Создать семейное дерево
        </h1>
        <p className="font-body italic text-parchment/40 text-xl mb-10">
          Дайте дереву понятное и красивое имя, чтобы семье было легко его узнать
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tree name */}
          <div>
            <label className="label">Название дерева</label>
            <input
              {...register('name')}
              className="input-field"
              placeholder="Шежіре Сейтовтар"
            />
            {errors.name && (
              <p className="font-mono text-[10px] text-red-400 mt-1">{errors.name.message}</p>
            )}
            <p className="font-mono text-[9px] text-parchment/20 mt-1 tracking-widest">
              Например: «Сейтовтар», «Семья Ахметовых», «Атажұрт»
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="label">Приватность по умолчанию</label>
            <div className="space-y-3">
              {VISIBILITY_OPTIONS.map((opt) => (
                <label key={opt.value}
                       className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer
                                   transition-all ${
                         visibility === opt.value
                           ? 'border-gold bg-gold/8'
                           : 'border-parchment/10 hover:border-parchment/20'
                       }`}>
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('default_visibility')}
                    className="mt-1 accent-amber-500"
                  />
                  <div>
                    <div className="font-display font-bold text-parchment text-sm">
                      {opt.icon} {opt.label}
                    </div>
                    <div className="font-body text-parchment/40 text-sm mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Steps preview */}
          <div className="card border-gold/15">
            <div className="font-mono text-[9px] tracking-[3px] uppercase text-parchment/30 mb-3">
              После создания
            </div>
            <div className="space-y-2">
              {[
                'Добавите себя как корневой узел',
                'Добавите родителей и дедушек/бабушек',
                'Пригласите родственников по ссылке',
                'Загрузите фото, аудио и истории предков',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-gold/15 border border-gold/30
                                   flex items-center justify-center font-mono text-[9px] text-gold
                                   flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-body text-parchment/50 text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Создаём...' : 'Создать дерево и продолжить →'}
          </button>
        </form>
      </div>
    </div>
  )
}

const VISIBILITY_OPTIONS = [
  {
    value: 'family',
    icon: '🔵',
    label: 'Только семья (рекомендуется)',
    desc: 'Детали видят только приглашённые члены дерева',
  },
  {
    value: 'public',
    icon: '🟢',
    label: 'Публично',
    desc: 'Имена и годы жизни видит любой казахстанец — помогает находить родственников',
  },
  {
    value: 'private',
    icon: '🔴',
    label: 'Приватно',
    desc: 'Только вы видите всё дерево',
  },
]
