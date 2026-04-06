'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Match {
  id: string
  first_name: string
  last_name: string
  birth_year: number | null
  location: string | null
  zhuz: string | null
  generation_num: number
  score: number
  family_trees: { id: string; name: string }
}

export default function FindRelativesPage() {
  const [lastName, setLastName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [location, setLocation] = useState('')
  const [zhuz, setZhuz] = useState('')
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [searched, setSearched] = useState(false)

  const search = async () => {
    if (!lastName.trim() && !location.trim() && !zhuz.trim()) {
      toast.error('Введите хотя бы одно поле для поиска')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/find-relatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastName: lastName.trim() || undefined,
          birthYear: birthYear ? parseInt(birthYear) : undefined,
          location: location.trim() || undefined,
          zhuz: zhuz.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMatches(data.matches ?? [])
      setSearched(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="bg-parchment border-b border-gold/10 px-8 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 hover:text-gold transition-colors">
          ← Назад
        </Link>
        <div className="h-4 w-px bg-ink/10" />
        <div>
          <span className="font-mono text-[10px] text-ink/30 tracking-widest uppercase">Поиск родственников</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">🔍 Поиск по всем деревьям</div>
          <h1 className="font-display font-bold text-ink text-4xl mb-3">Найти родственников</h1>
          <p className="font-body italic text-ink/40 text-xl leading-relaxed">
            Ищем совпадения в публичных деревьях других семей Казахстана
          </p>
        </div>

        {/* Search form */}
        <div className="bg-white rounded-2xl border border-gold/15 p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-ink/50">Фамилия предка</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                     className="input-field" placeholder="Сейтов, Ахметов..." onKeyDown={e => e.key==='Enter' && search()} />
            </div>
            <div>
              <label className="label text-ink/50">Год рождения (±5 лет)</label>
              <input value={birthYear} onChange={e => setBirthYear(e.target.value)}
                     className="input-field" type="number" placeholder="1905" onKeyDown={e => e.key==='Enter' && search()} />
            </div>
            <div>
              <label className="label text-ink/50">Регион / Город</label>
              <input value={location} onChange={e => setLocation(e.target.value)}
                     className="input-field" placeholder="Семей, Павлодар..." onKeyDown={e => e.key==='Enter' && search()} />
            </div>
            <div>
              <label className="label text-ink/50">Жуз / Племя</label>
              <input value={zhuz} onChange={e => setZhuz(e.target.value)}
                     className="input-field" placeholder="Средний жуз, Аргын..." onKeyDown={e => e.key==='Enter' && search()} />
            </div>
          </div>

          <button onClick={search} disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                Ищем...
              </span>
            ) : '🔍 Найти родственников'}
          </button>
        </div>

        {/* Results */}
        {searched && (
          <div>
            <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 mb-4">
              {matches.length > 0
                ? `Найдено совпадений: ${matches.length}`
                : 'Совпадений не найдено'}
            </div>

            {matches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gold/10 p-10 text-center">
                <div className="text-5xl mb-4">🌐</div>
                <h3 className="font-display font-bold text-ink text-xl mb-2">Пока не нашли</h3>
                <p className="font-body italic text-ink/40 text-base leading-relaxed max-w-sm mx-auto">
                  Попробуйте другие параметры или подождите — платформа растёт каждый день
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((m) => (
                  <div key={m.id}
                       className="bg-white rounded-2xl border border-gold/10 p-5 hover:border-gold/30
                                  transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20
                                        flex items-center justify-center text-2xl flex-shrink-0">
                          👴
                        </div>
                        <div>
                          <div className="font-display font-bold text-ink text-lg">
                            {m.first_name} {m.last_name}
                          </div>
                          <div className="font-mono text-[10px] text-ink/30 tracking-widest">
                            {m.birth_year ?? '?'} · {m.location ?? '—'} · {m.zhuz ?? '—'}
                          </div>
                          <div className="font-mono text-[9px] text-ink/20 mt-0.5">
                            Дерево: {m.family_trees?.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {/* Match score */}
                        <div className={cn(
                          'font-mono text-[9px] tracking-widest uppercase px-2 py-1 rounded-full',
                          m.score >= 60 ? 'bg-green-50 text-green-600 border border-green-200' :
                          m.score >= 30 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          'bg-gray-50 text-gray-400 border border-gray-200'
                        )}>
                          {m.score >= 60 ? '🎯 Высокое' : m.score >= 30 ? '🔶 Среднее' : '◯ Слабое'} совп.
                        </div>

                        <button
                          onClick={() => toast.success('Запрос отправлен владельцу дерева!')}
                          className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5
                                     border border-gold/30 text-gold rounded-full hover:bg-gold/5 transition-all"
                        >
                          📨 Связаться
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        {!searched && (
          <div className="bg-white rounded-2xl border border-gold/10 p-6">
            <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 mb-4">
              Как работает поиск
            </div>
            <div className="space-y-3">
              {[
                ['🔍', 'Ищем по публичным деревьям других семей'],
                ['📊', 'Сортируем по степени совпадения фамилии, региона и жуза'],
                ['📨', 'Вы можете отправить запрос владельцу дерева'],
                ['🌳', 'При подтверждении родства — объединяем деревья'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="font-body text-ink/60 text-base">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
