import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient() as any

  // Load all stats in parallel
  const [
    { count: totalUsers },
    { count: paidUsers },
    { count: totalPersons },
    { count: totalMemories },
    { count: totalTrees },
    { data: recentUsers },
    { data: dailySignups },
    { data: memoryTypes },
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).not('paid_at', 'is', null),
    admin.from('persons').select('*', { count: 'exact', head: true }),
    admin.from('memories').select('*', { count: 'exact', head: true }),
    admin.from('family_trees').select('*', { count: 'exact', head: true }),
    admin.from('users').select('id, full_name, paid_at, participant_num, tribe_zhuz, created_at')
      .order('created_at', { ascending: false }).limit(10),
    // Last 7 days signups
    admin.from('users').select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // Memory breakdown by type
    admin.from('memories').select('type'),
  ])

  const revenue = (paidUsers ?? 0) * 500
  const conversionRate = totalUsers ? (((paidUsers ?? 0) / (totalUsers ?? 1)) * 100).toFixed(1) : '0'

  // Count memory types
  const memTypeCount = (memoryTypes ?? []).reduce((acc: Record<string, number>, m: { type: string }) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1
    return acc
  }, {})
  const memTypeEntries = Object.entries(memTypeCount) as Array<[string, number]>
  const totalMemoryItems = (Object.values(memTypeCount) as number[]).reduce(
    (sum: number, value: number) => sum + value,
    0
  )
  const recentUserRows = (recentUsers ?? []) as Array<{
    id: string
    full_name: string
    paid_at: string | null
    participant_num: number | null
    tribe_zhuz: string | null
    created_at: string
  }>

  // Daily signups last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const count = (dailySignups ?? []).filter((u: { created_at: string }) => u.created_at.startsWith(dateStr)).length
    return { date: dateStr.slice(5), count } // MM-DD
  })

  const STATS = [
    { label: 'Всего участников', value: (totalUsers ?? 0).toLocaleString('ru'), icon: '👥', color: 'text-blue-600' },
    { label: 'Оплатили 500 ₸', value: (paidUsers ?? 0).toLocaleString('ru'), icon: '💳', color: 'text-green-600' },
    { label: 'Выручка (тг)', value: revenue.toLocaleString('ru'), icon: '💰', color: 'text-gold' },
    { label: 'Конверсия', value: `${conversionRate}%`, icon: '📈', color: 'text-purple-600' },
    { label: 'Предков добавлено', value: (totalPersons ?? 0).toLocaleString('ru'), icon: '👴', color: 'text-amber-600' },
    { label: 'Воспоминаний', value: (totalMemories ?? 0).toLocaleString('ru'), icon: '🎙️', color: 'text-red-500' },
    { label: 'Деревьев создано', value: (totalTrees ?? 0).toLocaleString('ru'), icon: '🌳', color: 'text-emerald-600' },
    { label: 'До $1M (участников)', value: Math.max(0, 1000000 - (paidUsers ?? 0)).toLocaleString('ru'), icon: '🏆', color: 'text-gold' },
  ]

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <header className="bg-ink border-b border-[rgba(245,237,216,0.08)] px-8 py-5 flex items-center justify-between">
        <div>
          <div className="font-display font-black text-gold-2 text-sm tracking-widest">САНДЫҚ ҰРПАҚ</div>
          <div className="font-mono text-[9px] text-parchment/30 tracking-widest uppercase mt-0.5">Admin Analytics</div>
        </div>
        <a href="/dashboard" className="btn-ghost text-sm">← Выйти из admin</a>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gold/10 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{s.icon}</span>
                <span className="font-mono text-[9px] tracking-widest uppercase text-ink/25">
                  {s.label}
                </span>
              </div>
              <div className={`font-display font-black text-3xl ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          {/* Daily signups chart */}
          <div className="bg-white rounded-2xl border border-gold/10 p-6">
            <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 mb-4">
              Регистрации — последние 7 дней
            </div>
            <div className="flex items-end gap-2 h-32">
              {last7.map((d) => {
                const maxCount = Math.max(...last7.map(x => x.count), 1)
                const h = Math.max(4, (d.count / maxCount) * 100)
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-mono text-[9px] text-ink/40">{d.count}</span>
                    <div className="w-full bg-gradient-to-t from-gold to-gold-2 rounded-t"
                         style={{ height: `${h}%` }} />
                    <span className="font-mono text-[8px] text-ink/30">{d.date}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Memory types breakdown */}
          <div className="bg-white rounded-2xl border border-gold/10 p-6">
            <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 mb-4">
              Типы воспоминаний
            </div>
            <div className="space-y-3">
              {memTypeEntries.sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = totalMemoryItems ? Math.round((count / totalMemoryItems) * 100) : 0
                const ICONS: Record<string, string> = {
                  audio: '🎙️', photo: '📸', story: '📖', tradition: '🏺',
                  recipe: '🍲', document: '📜', location: '🗺️', video: '🎥',
                }
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-lg w-6">{ICONS[type] ?? '📄'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-[10px] text-ink/50 uppercase tracking-widest">{type}</span>
                        <span className="font-mono text-[10px] text-ink/50">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gold/10 rounded-full">
                        <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-ink/30 w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
              {Object.keys(memTypeCount).length === 0 && (
                <p className="font-body italic text-ink/30 text-sm text-center py-4">Нет данных</p>
              )}
            </div>
          </div>
        </div>

        {/* Progress to $1M */}
        <div className="bg-gradient-to-r from-ink to-ink-2 rounded-2xl p-6 mb-10 border border-gold/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-1">
                Прогресс к $1,000,000
              </div>
              <div className="font-display font-black text-parchment text-3xl">
                {((paidUsers ?? 0) / 10000 * 100).toFixed(2)}%
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] text-parchment/30 tracking-widest mb-1">
                {(paidUsers ?? 0).toLocaleString('ru')} / 1,000,000
              </div>
              <div className="font-mono text-[10px] text-gold tracking-widest">
                выручка: {revenue.toLocaleString('ru')} ₸
              </div>
            </div>
          </div>
          <div className="h-3 bg-parchment/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-2 rounded-full transition-all"
              style={{ width: `${Math.min(((paidUsers ?? 0) / 1000000) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="font-mono text-[9px] text-parchment/20">0</span>
            <span className="font-mono text-[9px] text-parchment/20">1,000,000 участников</span>
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-2xl border border-gold/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-gold/10">
            <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30">
              Последние регистрации
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-parchment/30">
                  {['#', 'Имя', 'Жуз', 'Статус', 'Дата'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-mono text-[9px] tracking-[3px] uppercase text-ink/30">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUserRows.map((u) => (
                  <tr key={u.id} className="border-t border-gold/5 hover:bg-parchment/20 transition-colors">
                    <td className="px-5 py-3 font-mono text-[10px] text-gold">
                      {u.participant_num ? `#${u.participant_num}` : '—'}
                    </td>
                    <td className="px-5 py-3 font-body text-ink text-sm font-semibold">{u.full_name}</td>
                    <td className="px-5 py-3 font-mono text-[10px] text-ink/40">{u.tribe_zhuz ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`font-mono text-[9px] tracking-widest uppercase px-2 py-1 rounded-full ${
                        u.paid_at
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : 'bg-red-50 text-red-400 border border-red-100'
                      }`}>
                        {u.paid_at ? '✓ Оплачено' : '— Не оплачено'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px] text-ink/30">
                      {new Date(u.created_at).toLocaleDateString('ru')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
