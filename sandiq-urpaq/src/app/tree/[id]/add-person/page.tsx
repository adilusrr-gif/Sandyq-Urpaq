'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { personSchema, type PersonInput } from '@/lib/validations'

interface Props { params: { id: string } }

export default function AddPersonPage({ params }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gen = parseInt(searchParams.get('gen') ?? '0')
  const isFirst = searchParams.get('first') === 'true'
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'basic' | 'details'>('basic')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<PersonInput>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      is_alive: gen >= 0,
      is_historical: gen < -1,
      visibility: 'family',
      generation_num: gen,
    } as any,
  })

  const isAlive = watch('is_alive')

  const onSubmit = async (data: PersonInput) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        birth_year: Number.isFinite(data.birth_year as number) ? data.birth_year : null,
        death_year: Number.isFinite(data.death_year as number) ? data.death_year : null,
        bio: data.bio?.trim() || null,
        location: data.location?.trim() || null,
        zhuz: data.zhuz?.trim() || null,
        generation_num: gen,
        link_self: gen === 0 && isFirst,
      }

      const response = await fetch(`/api/trees/${params.id}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Не удалось сохранить человека')
      }

      toast.success(`${data.first_name} добавлен(а) в дерево!`)

      if (isFirst) {
        // Suggest adding parents next
        router.push(`/tree/${params.id}?added=self`)
      } else {
        router.push(`/tree/${params.id}`)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  const genLabel = gen === 0 ? 'себя' : gen < 0
    ? `предка (поколение ${Math.abs(gen)} назад)`
    : `потомка (поколение +${gen})`

  return (
    <div className="min-h-screen bg-ink px-4 py-12">
      <div className="max-w-lg mx-auto animate-fade-up">
        <button onClick={() => router.back()}
                className="font-mono text-[10px] tracking-[3px] uppercase text-parchment/30
                           hover:text-gold transition-colors mb-8 flex items-center gap-2">
          ← Назад к дереву
        </button>

        <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">
          {gen === 0 ? 'Корневой узел' : gen < 0 ? `Предок · ${Math.abs(gen)} поколения назад` : `Потомок · Поколение +${gen}`}
        </div>
        <h1 className="font-display font-bold text-parchment text-3xl mb-2">
          Добавить {genLabel}
        </h1>
        <p className="font-body italic text-parchment/40 text-lg mb-8">
          {isFirst
            ? 'Начните с себя — вы станете корнем родословной'
            : 'Заполните известные данные. Всё, что не знаете сейчас, можно дополнить позже.'}
        </p>

        {/* Step tabs */}
        <div className="flex gap-0 border-b border-parchment/10 mb-8">
          {(['basic', 'details'] as const).map((s) => (
            <button key={s} onClick={() => setStep(s)}
                    className={`px-6 py-3 font-mono text-[10px] tracking-widest uppercase border-b-2
                                transition-all ${
                      step === s
                        ? 'text-gold border-gold'
                        : 'text-parchment/30 border-transparent hover:text-parchment/60'
                    }`}>
              {s === 'basic' ? '1. Основное' : '2. Детали'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {step === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Имя *</label>
                  <input {...register('first_name')} className="input-field" placeholder="Ахмет" />
                  {errors.first_name && (
                    <p className="font-mono text-[10px] text-red-400 mt-1">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">Фамилия *</label>
                  <input {...register('last_name')} className="input-field" placeholder="Сейтов" />
                  {errors.last_name && (
                    <p className="font-mono text-[10px] text-red-400 mt-1">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Год рождения</label>
                  <input {...register('birth_year', { valueAsNumber: true })}
                         className="input-field" type="number" placeholder="1905" />
                </div>
                {!isAlive && (
                  <div>
                    <label className="label">Год смерти</label>
                    <input {...register('death_year', { valueAsNumber: true })}
                           className="input-field" type="number" placeholder="1978" />
                  </div>
                )}
              </div>

              {/* Is alive toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl
                               border border-parchment/10 hover:border-parchment/20 transition-colors">
                <input type="checkbox" {...register('is_alive')}
                       className="w-4 h-4 accent-amber-500" />
                <span className="font-body text-parchment/70 text-base">Человек ещё жив</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl
                               border border-parchment/10 hover:border-parchment/20 transition-colors">
                <input type="checkbox" {...register('is_historical')}
                       className="w-4 h-4 accent-amber-500" />
                <span className="font-body text-parchment/70 text-base">
                  Исторический предок (нет аккаунта, только история)
                </span>
              </label>

              <button type="button" onClick={() => setStep('details')}
                      className="btn-primary w-full">
                Далее — детали →
              </button>
            </>
          )}

          {step === 'details' && (
            <>
              <div>
                <label className="label">Откуда родом</label>
                <input {...register('location')} className="input-field"
                       placeholder="Семей, Павлодарская область" />
              </div>

              <div>
                <label className="label">Жуз / Племя</label>
                <input {...register('zhuz')} className="input-field"
                       placeholder="Средний жуз · Аргын" />
              </div>

              <div>
                <label className="label">Краткая биография</label>
                <textarea {...register('bio')}
                          className="input-field min-h-[120px] resize-none"
                          placeholder="Несколько строк о жизни этого человека..." />
              </div>

              {/* Visibility */}
              <div>
                <label className="label">Приватность</label>
                <select {...register('visibility')} className="input-field">
                  <option value="family">🔵 Только семья</option>
                  <option value="public">🟢 Публично (имя + регион)</option>
                  <option value="private">🔴 Только Owner/Admin</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('basic')}
                        className="btn-secondary flex-1">
                  ← Назад
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Сохраняем...' : 'Добавить в дерево ✓'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
