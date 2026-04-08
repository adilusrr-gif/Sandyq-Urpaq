import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    onboarding?: string
    payment?: string
    already_paid?: string
    num?: string
  }
}) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fetchedProfile }, { data: memberTrees }, { data: ownedTrees }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('family_trees').select('*, tree_members!inner(user_id)').eq('tree_members.user_id', user.id),
    supabase.from('family_trees').select('*').eq('owner_user_id', user.id),
  ])

  let profile = fetchedProfile
  if (!profile) {
    const fallbackProfile = {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Хранитель',
      paid_at: null,
      participant_num: null,
      tribe_zhuz: null,
    }

    const { data: createdProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        full_name: fallbackProfile.full_name,
      })
      .select('*')
      .single()

    profile = createdProfile ?? fallbackProfile

    if (
      profileError &&
      !profileError.message.toLowerCase().includes('duplicate') &&
      !profileError.message.toLowerCase().includes('unique')
    ) {
      profile = fallbackProfile
    }
  }

  const treesMap = new Map<string, any>()
  ;[...(memberTrees ?? []), ...(ownedTrees ?? [])].forEach((tree) => {
    treesMap.set(tree.id, tree)
  })
  const trees = Array.from(treesMap.values()).sort((a, b) => (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ))

  const treeIds = trees.map((tree) => tree.id)
  const { data: persons } = treeIds.length > 0
    ? await supabase
        .from('persons')
        .select('id, family_tree_id, generation_num')
        .in('family_tree_id', treeIds)
    : { data: [] }

  const personIds = (persons ?? []).map((person) => person.id)
  const { data: memories } = personIds.length > 0
    ? await supabase
        .from('memories')
        .select('id, person_id')
        .in('person_id', personIds)
    : { data: [] }

  const isPaid = !!profile?.paid_at
  const showOnboarding = searchParams.onboarding === 'true' || !isPaid
  const generations = (persons ?? []).length > 0
    ? Math.max(...(persons ?? []).map((person) => person.generation_num))
      - Math.min(...(persons ?? []).map((person) => person.generation_num))
      + 1
    : 0
  const paymentState = searchParams.payment ?? (searchParams.already_paid ? 'already_paid' : undefined)
  const paymentBanner = paymentState ? PAYMENT_BANNERS[paymentState] : null

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <header className="border-b border-[rgba(245,237,216,0.08)] px-8 py-5 flex items-center justify-between">
        <div className="font-display font-black text-gold-2 text-sm tracking-widest">
          САНДЫҚ <span className="text-gold/40 font-light">ҰРПАҚ</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-body italic text-parchment/40 text-base">
            {profile?.full_name}
          </span>
          {profile?.participant_num && (
            <span className="font-mono text-[10px] tracking-[2px] text-gold border border-gold/30 px-3 py-1 rounded-full">
              #{profile.participant_num.toLocaleString('ru')}
            </span>
          )}
          <form action="/api/auth/logout" method="POST">
            <button className="btn-ghost">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {paymentBanner && (
          <div className={`mb-6 rounded-2xl border px-5 py-4 ${paymentBanner.className}`}>
            <div className="font-mono text-[10px] tracking-[3px] uppercase mb-1 opacity-70">
              Активация кабинета
            </div>
            <p className="font-body text-base leading-relaxed">
              {paymentBanner.text}
              {paymentState === 'success' && searchParams.num ? ` Ваш номер хранителя: #${searchParams.num}.` : ''}
            </p>
          </div>
        )}

        {/* Payment CTA */}
        {showOnboarding && !isPaid && (
          <div className="card-gold mb-10 flex items-center justify-between animate-fade-up">
            <div>
              <h3 className="font-display font-bold text-parchment text-lg mb-1">
                Активируйте кабинет
              </h3>
              <p className="font-body text-parchment/50 text-base">
                Для тестового запуска можно пройти через Kaspi или включить демо-активацию автоматически
              </p>
            </div>
            <Link href="/api/payment/kaspi" className="btn-primary whitespace-nowrap ml-6">
              Активировать за 500 ₸
            </Link>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-12 animate-fade-up">
          <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">
            Добро пожаловать
          </div>
          <h1 className="font-display font-bold text-parchment mb-3"
              style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}>
            {profile?.full_name ?? 'Хранитель'}
          </h1>
          <p className="font-body italic text-parchment/40 text-xl">
            Управляйте деревьями семьи, приглашениями и семейным архивом из одного кабинета
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Деревьев', value: trees.length, icon: '🌳' },
            { label: 'Персон', value: persons?.length ?? 0, icon: '👴' },
            { label: 'Воспоминаний', value: memories?.length ?? 0, icon: '🎙️' },
            { label: 'Поколений', value: generations, icon: '⏳' },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="font-display font-black text-gold-2 text-3xl">{s.value}</div>
              <div className="font-mono text-[9px] tracking-[2px] uppercase text-parchment/40 mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Trees */}
        <div className="section-title">Мои деревья</div>

        {(!trees || trees.length === 0) ? (
          <div className="card border-dashed text-center py-16">
              <div className="text-5xl mb-4">🌱</div>
              <h3 className="font-display font-bold text-parchment text-xl mb-2">
                Создайте первое семейное дерево
              </h3>
              <p className="font-body italic text-parchment/40 text-base mb-6">
                Начните с себя, а затем аккуратно добавляйте родителей, дедушек, бабушек и старшие поколения
              </p>
              <Link href="/tree/new" className="btn-primary">
                Создать дерево
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trees.map((tree) => (
              <Link key={tree.id} href={`/tree/${tree.id}`}
                    className="card hover:border-gold/40 transition-all duration-300 hover:-translate-y-0.5 block">
                <div className="font-display font-bold text-parchment text-lg mb-1">{tree.name}</div>
                <div className="font-mono text-[10px] text-parchment/30 tracking-widest mb-2">
                  {tree.total_persons} персон · {tree.generations_count} поколений
                </div>
                <div className="font-body text-sm text-parchment/45">
                  Код приглашения: <span className="text-gold">{tree.invite_code}</span>
                </div>
              </Link>
            ))}
            <Link href="/tree/new"
                  className="card border-dashed flex items-center justify-center gap-3
                             text-gold hover:border-gold/40 transition-all">
              <span className="text-2xl">＋</span>
              <span className="font-mono text-[11px] tracking-widest uppercase">Новое дерево</span>
            </Link>
          </div>
        )}

        {/* Certificate */}
        {isPaid && profile?.participant_num && (
          <div className="mt-12">
            <div className="section-title">Мой сертификат</div>
            <div className="card-gold flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[3px] uppercase text-parchment/40 mb-1">
                  Хранитель семейной памяти
                </div>
                <div className="font-display font-black text-gold-2 text-4xl">
                  #{profile.participant_num.toLocaleString('ru')}
                </div>
                <div className="font-body italic text-parchment/50 text-base mt-1">
                  {profile.full_name}
                </div>
              </div>
              <Link href="/certificate" className="btn-primary">
                Скачать сертификат
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const PAYMENT_BANNERS: Record<string, { className: string; text: string }> = {
  success: {
    className: 'border-gold/30 bg-gold/10 text-parchment',
    text: 'Активация прошла успешно. Все функции кабинета уже доступны.',
  },
  failed: {
    className: 'border-red-400/30 bg-red-400/10 text-parchment',
    text: 'Платёж не завершился. Можно попробовать ещё раз чуть позже.',
  },
  error: {
    className: 'border-red-400/30 bg-red-400/10 text-parchment',
    text: 'Не удалось подтвердить активацию автоматически. Проверьте ещё раз или повторите попытку.',
  },
  already: {
    className: 'border-parchment/20 bg-parchment/5 text-parchment',
    text: 'Этот кабинет уже был активирован ранее.',
  },
  already_paid: {
    className: 'border-parchment/20 bg-parchment/5 text-parchment',
    text: 'Доступ уже активирован. Можно сразу продолжать работу.',
  },
}
