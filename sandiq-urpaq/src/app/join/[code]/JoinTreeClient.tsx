'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props {
  tree: {
    id: string
    name: string
    total_persons: number
    generations_count: number
    owner_user_id: string
    ownerName: string
  }
  user: any
  inviteCode: string
}

export default function JoinTreeClient({ tree, user, inviteCode }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!user) {
      router.push(`/register?invite=${inviteCode}`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/trees/${tree.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })
      const result = await response.json().catch(() => ({}))

      if (response.status === 401) {
        router.push(`/login?redirect=/join/${inviteCode}`)
        return
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Не удалось присоединиться к дереву')
      }

      toast.success(result.alreadyJoined ? 'Вы уже подключены к этому дереву.' : 'Теперь вы внутри семейного дерева.')
      router.push(`/tree/${tree.id}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Не удалось присоединиться')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md text-center animate-fade-up">
      {/* Tree info */}
      <div className="text-5xl mb-6">🌳</div>

      <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">
        Приглашение в семейное дерево
      </div>

      <h1 className="font-display font-bold text-parchment text-4xl mb-3">
        {tree.name}
      </h1>

      <p className="font-body italic text-parchment/40 text-xl mb-2">
        Владельцы дерева: {tree.ownerName}
      </p>

      <p className="font-body text-parchment/30 text-base mb-10">
        {tree.total_persons} персон · {tree.generations_count} поколений
      </p>

      <div className="ornament-line" />

      {user ? (
        <div>
          <p className="font-body text-parchment/60 text-lg mb-6">
            Продолжить как <strong className="text-gold">{user.user_metadata?.full_name ?? user.email?.split('@')[0]}</strong>?
          </p>
          <div className="space-y-3">
            <button onClick={handleJoin} disabled={loading} className="btn-primary w-full">
              {loading ? 'Подключаем...' : 'Войти в дерево семьи'}
            </button>
            <Link href={`/login?redirect=/join/${inviteCode}`} className="btn-ghost block">
              Войти под другим аккаунтом
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-body italic text-parchment/50 text-lg mb-6">
            Зарегистрируйтесь, чтобы присоединиться к родословной своей семьи и работать вместе
          </p>
          <div className="space-y-3">
            <Link href={`/register?invite=${inviteCode}`} className="btn-primary block w-full">
              Создать кабинет и присоединиться
            </Link>
            <Link href={`/login?redirect=/join/${inviteCode}`}
                  className="btn-secondary block w-full">
              У меня уже есть аккаунт
            </Link>
          </div>
        </div>
      )}

      <div className="ornament-line" />

      <p className="font-mono text-[9px] text-parchment/20 tracking-widest">
        КОД ПРИГЛАШЕНИЯ: {inviteCode.toUpperCase()}
      </p>
    </div>
  )
}
