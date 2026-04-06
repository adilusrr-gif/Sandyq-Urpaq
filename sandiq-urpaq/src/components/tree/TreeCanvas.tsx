'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { FamilyTree, Person, Relationship, TreeRole } from '@/types'
import { cn, formatLifespan } from '@/lib/utils'

interface Props {
  tree: FamilyTree
  persons: Person[]
  relationships: Relationship[]
  userRole: TreeRole
  userId: string
}

export default function TreeCanvas({ tree, persons, relationships, userRole, userId }: Props) {
  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor'

  // Group persons by generation
  const byGeneration = useMemo(() => {
    const map = new Map<number, Person[]>()
    persons.forEach((p) => {
      const gen = p.generation_num ?? 0
      if (!map.has(gen)) map.set(gen, [])
      map.get(gen)!.push(p)
    })
    return map
  }, [persons])

  const sortedGens = Array.from(byGeneration.keys()).sort((a, b) => a - b)

  return (
    <main className="flex-1 overflow-auto bg-parchment/5">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-parchment border-b border-gold/10 px-8 py-4
                      flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-ink text-xl">{tree.name}</h1>
          <p className="font-body italic text-ink/40 text-sm">
            {tree.total_persons} предков · {tree.generations_count} поколений
          </p>
        </div>
        {canEdit && (
          <Link href={`/tree/${tree.id}/add-person`} className="btn-primary text-xs px-5 py-2.5">
            ＋ Добавить предка
          </Link>
        )}
      </div>

      {/* Tree visualization */}
      <div className="p-10 min-w-max">
        {persons.length === 0 ? (
          <EmptyTree treeId={tree.id} canEdit={canEdit} />
        ) : (
          <div className="flex flex-col items-center gap-0">
            {sortedGens.map((gen, idx) => (
              <div key={gen} className="flex flex-col items-center">
                {/* Generation label */}
                <div className="font-mono text-[9px] tracking-[3px] uppercase text-ink/20 mb-4">
                  {gen === 0 ? 'ВЫ' : gen < 0 ? `ПОКОЛЕНИЕ ${Math.abs(gen)} НАЗАД` : `ПОКОЛЕНИЕ +${gen}`}
                </div>

                {/* Persons row */}
                <div className="flex gap-5 items-start">
                  {byGeneration.get(gen)!.map((person) => (
                    <PersonNode
                      key={person.id}
                      person={person}
                      isCurrentUser={person.user_id === userId}
                    />
                  ))}
                  {canEdit && gen === 0 && persons.length > 0 && (
                    <AddPersonNode treeId={tree.id} generation={gen + 1} />
                  )}
                </div>

                {/* Connector */}
                {idx < sortedGens.length - 1 && (
                  <div className="w-0.5 h-10 bg-gradient-to-b from-gold to-gold/20 mt-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function PersonNode({ person, isCurrentUser }: { person: Person; isCurrentUser: boolean }) {
  const emoji = person.is_historical || (!person.is_alive && person.death_year)
    ? (person.death_year && person.death_year < 1900 ? '☠️' : '👴')
    : isCurrentUser ? '⭐' : person.is_alive ? '👤' : '👴'

  return (
    <Link href={`/ancestor/${person.id}`}>
      <div className={cn(
        'person-card relative',
        isCurrentUser && 'person-card-self',
        (person.is_historical || !person.is_alive) && !isCurrentUser && 'person-card-historical',
      )}>
        {/* Badge */}
        {isCurrentUser && (
          <span className="absolute -top-2 -right-2 bg-gold text-ink font-mono text-[8px]
                           font-bold px-2 py-0.5 rounded-full tracking-widest">
            ВЫ
          </span>
        )}
        {person.is_historical && (
          <span className="absolute -top-2 -right-2 bg-parchment/60 text-ink/60 font-mono text-[8px]
                           px-2 py-0.5 rounded-full tracking-widest">
            ИСТОРИЯ
          </span>
        )}

        <div className="text-3xl mb-1.5">{emoji}</div>
        <div className={cn(
          'font-display font-bold text-xs leading-tight mb-1',
          isCurrentUser ? 'text-ink' : 'text-ink'
        )}>
          {person.first_name}<br />{person.last_name}
        </div>
        <div className={cn(
          'font-mono text-[9px] tracking-widest',
          isCurrentUser ? 'text-ink/60' : 'text-ink/40'
        )}>
          {formatLifespan(person.birth_year, person.death_year, person.is_alive)}
        </div>
        {person.location && (
          <div className="font-mono text-[8px] text-ink/30 mt-1 truncate max-w-[120px]">
            📍 {person.location}
          </div>
        )}
      </div>
    </Link>
  )
}

function AddPersonNode({ treeId, generation }: { treeId: string; generation: number }) {
  return (
    <Link href={`/tree/${treeId}/add-person?gen=${generation}`}>
      <div className="min-w-[140px] py-4 px-5 rounded-2xl border-2 border-dashed border-gold/20
                      text-center cursor-pointer hover:border-gold/50 hover:bg-gold/5
                      transition-all duration-300 text-gold">
        <div className="text-2xl mb-1">＋</div>
        <div className="font-mono text-[9px] tracking-widest uppercase">Добавить</div>
      </div>
    </Link>
  )
}

function EmptyTree({ treeId, canEdit }: { treeId: string; canEdit: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-6">🌱</div>
      <h3 className="font-display font-bold text-ink text-2xl mb-2">
        Дерево пока пустое
      </h3>
      <p className="font-body italic text-ink/40 text-lg mb-8 max-w-sm">
        Начните с себя — добавьте свой профиль и потом добавляйте предков поколение за поколением
      </p>
      {canEdit && (
        <Link href={`/tree/${treeId}/add-person?gen=0`} className="btn-primary">
          Добавить себя
        </Link>
      )}
    </div>
  )
}
