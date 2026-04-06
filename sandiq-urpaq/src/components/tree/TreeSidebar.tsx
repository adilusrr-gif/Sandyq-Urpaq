'use client'

import Link from 'next/link'
import { FamilyTree, Person, TreeRole } from '@/types'

interface Props {
  tree: FamilyTree
  persons: Person[]
  userRole: TreeRole
  userId: string
}

export default function TreeSidebar({ tree, persons, userRole, userId }: Props) {
  const livingPersons = persons.filter((p) => p.is_alive && !p.is_historical)
  const historicalPersons = persons.filter((p) => p.is_historical || !p.is_alive)
  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'
  const generations = tree.generations_count

  return (
    <aside className="w-72 bg-ink border-r border-[rgba(245,237,216,0.08)] flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[rgba(245,237,216,0.08)]">
        <Link href="/dashboard" className="font-mono text-[9px] tracking-[3px] uppercase text-parchment/30
                                           hover:text-gold transition-colors mb-4 flex items-center gap-2">
          ← Панель управления
        </Link>
        <h2 className="font-display font-black text-gold-2 text-xl leading-tight">{tree.name}</h2>
        <p className="font-mono text-[9px] tracking-widest text-parchment/30 mt-1">
          {tree.total_persons} предков · {generations} поколений
        </p>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-2 border-b border-[rgba(245,237,216,0.08)]">
        {[
          { n: tree.total_persons, l: 'Предков' },
          { n: generations, l: 'Поколений' },
          { n: livingPersons.length, l: 'Живых' },
          { n: historicalPersons.length, l: 'Исторических' },
        ].map((s) => (
          <div key={s.l} className="bg-[rgba(245,237,216,0.04)] rounded-lg p-3">
            <span className="font-display font-black text-gold-2 text-xl block">{s.n}</span>
            <span className="font-mono text-[9px] tracking-widest uppercase text-parchment/30">{s.l}</span>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="p-4 flex-1">
        <div className="font-mono text-[9px] tracking-[3px] uppercase text-parchment/30 mb-3
                        pb-2 border-b border-[rgba(245,237,216,0.08)]">
          Участники дерева
        </div>

        <div className="space-y-2 mb-4">
          {persons.slice(0, 8).map((p) => (
            <Link key={p.id} href={`/ancestor/${p.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-parchment/5
                             transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center
                              justify-center text-sm flex-shrink-0 group-hover:border-gold/40 transition-colors">
                {p.is_alive ? '👤' : p.is_historical ? '☠️' : '👴'}
              </div>
              <div className="min-w-0">
                <span className="font-body text-parchment text-sm font-semibold block truncate">
                  {p.first_name} {p.last_name}
                </span>
                <span className="font-mono text-[9px] text-parchment/30 block">
                  {p.is_alive ? '● Живой' : p.is_historical ? '✦ Исторический' : '✦ Предок'}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {canEdit && (
          <div className="space-y-2">
            <Link href={`/tree/${tree.id}/add-person`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg
                             border border-dashed border-gold/20 text-gold font-mono text-[10px]
                             tracking-widest uppercase hover:border-gold/40 hover:bg-gold/5 transition-all">
              <span>＋</span> Добавить предка
            </Link>
            <Link href={`/join/${tree.invite_code}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                             border border-dashed border-parchment/10 text-parchment/30
                             font-mono text-[10px] tracking-widest uppercase
                             hover:border-parchment/20 hover:text-parchment/50 transition-all">
              📨 Invite-ссылка
            </Link>
            <div className="rounded-lg border border-[rgba(245,237,216,0.08)] px-3 py-2">
              <div className="font-mono text-[8px] tracking-[3px] uppercase text-parchment/25 mb-1">
                Код приглашения
              </div>
              <div className="font-mono text-xs tracking-[0.3em] text-gold break-all">
                {tree.invite_code}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role badge */}
      <div className="p-4 border-t border-[rgba(245,237,216,0.08)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-widest uppercase text-parchment/20">Ваша роль</span>
          <span className="font-mono text-[9px] tracking-widest uppercase text-gold border border-gold/30
                           px-2 py-1 rounded-full">
            {userRole.toUpperCase()}
          </span>
        </div>
      </div>
    </aside>
  )
}
