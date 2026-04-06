import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

async function getStats() {
  try {
    const supabase = (process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : createClient()) as any
    const [{ count: usersCount }, { count: personsCount }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).not('paid_at', 'is', null),
      supabase.from('persons').select('*', { count: 'exact', head: true }),
    ])

    return { participants: usersCount ?? 0, ancestors: personsCount ?? 0 }
  } catch {
    return { participants: 0, ancestors: 0 }
  }
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <main className="min-h-screen bg-ink relative overflow-hidden">
      {/* Grid background */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(200,151,42,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,151,42,1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 50% 60%, rgba(200,151,42,0.12), transparent 58%)',
        }}
      />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5
                      bg-gradient-to-b from-ink/95 to-transparent">
        <div className="font-display font-black text-sm tracking-widest text-gold-2">
          САНДЫҚ <span className="text-gold/40 font-light">ҰРПАҚ</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="font-mono text-[10px] tracking-widest uppercase text-parchment/40 hover:text-gold transition-colors">
            Возможности
          </Link>
          <Link href="#how" className="font-mono text-[10px] tracking-widest uppercase text-parchment/40 hover:text-gold transition-colors">
            Как работает
          </Link>
          <Link href="/login" className="font-mono text-[10px] tracking-widest uppercase text-parchment/40 hover:text-gold transition-colors">
            Войти
          </Link>
          <Link href="/register" className="btn-primary text-[11px] px-5 py-2.5">
            Запустить семейный кабинет
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        {/* Ornament */}
        <div className="flex items-center gap-3 mb-10 animate-fade-up">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          <span className="font-body italic text-gold-2 text-base tracking-[4px]">
            Жеті атаңды біл
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
        </div>

        <h1 className="font-display font-black text-parchment leading-none mb-4 animate-fade-up animate-delay-100"
            style={{ fontSize: 'clamp(48px, 10vw, 120px)' }}>
          САНДЫҚ<br />
          <span className="text-gold-2">ҰРПАҚ</span>
        </h1>

        <p className="font-display font-light text-gold tracking-[8px] uppercase text-sm mb-8 animate-fade-up animate-delay-200">
          Цифровое Поколение
        </p>

        <p className="font-body italic text-parchment/50 text-xl max-w-xl leading-relaxed mb-16 animate-fade-up animate-delay-300">
          Соберите семейное дерево, сохраните фото, истории и голоса близких.
          Всё важное о вашем роде будет в одном аккуратном цифровом архиве.
        </p>

        {/* Stats */}
        <div className="flex gap-12 mb-16 animate-fade-up animate-delay-300">
          {[
            { num: stats.participants.toLocaleString('ru'), label: 'Хранителей' },
            { num: stats.ancestors.toLocaleString('ru'), label: 'Персон в деревьях' },
            { num: '7+', label: 'Поколений в глубину' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <span className="font-display font-black text-gold-2 block"
                    style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
                {s.num}
              </span>
              <span className="font-mono text-[10px] tracking-[2px] uppercase text-parchment/40 mt-1 block">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-up animate-delay-400">
          <Link href="/register" className="btn-primary animate-pulse-gold">
            Начать тестовый запуск
          </Link>
          <Link href="#how" className="btn-secondary">
            Как это работает
          </Link>
        </div>

        {/* Price badge */}
        <div className="absolute bottom-12 right-12 hidden lg:block">
          <div className="card-gold text-center">
            <span className="font-display font-black text-3xl text-gold block">500 ₸</span>
            <span className="font-mono text-[9px] tracking-[2px] uppercase text-parchment/40">доступ к кабинету</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-parchment py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-ink mb-3"
                style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}>
              Что вы создаёте за 500 тенге
            </h2>
            <p className="font-body italic text-ink/50 text-xl">Не анкету, а живую семейную шежіре</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title}
                   className="bg-white rounded-2xl p-8 border border-gold/10
                              hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(200,151,42,0.15)]
                              transition-all duration-300">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-display font-bold text-ink text-base mb-3">{f.title}</h3>
                <p className="font-body text-ink/60 text-base leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-parchment mb-3"
                style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}>
              Как это работает
            </h2>
            <p className="font-body italic text-parchment/40 text-xl">
              Спокойный сценарий без сложной настройки и лишних экранов
            </p>
          </div>

          <div className="space-y-0 relative">
            <div className="absolute left-5 top-10 bottom-10 w-0.5
                            bg-gradient-to-b from-gold via-gold-2 to-gold/20" />
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-8 py-8 relative">
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center
                                font-display font-black text-xs flex-shrink-0 z-10"
                     style={{ background: '#0C0A06', borderColor: '#C8972A', color: '#E8B84B' }}>
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-display font-bold text-parchment text-sm tracking-wide mb-2">
                    {step.title}
                  </h4>
                  <p className="font-body text-parchment/50 text-base leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/register" className="btn-primary">
              Открыть семейный кабинет
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(245,237,216,0.08)] py-8 px-6 text-center">
        <div className="font-display font-black text-gold-2/60 text-xs tracking-widest mb-2">
          САНДЫҚ ҰРПАҚ
        </div>
        <p className="font-mono text-[10px] text-parchment/20 tracking-widest">
          © 2026 · Казахстан · Платформа семейной памяти и цифровой шежіре
        </p>
      </footer>
    </main>
  )
}

const FEATURES = [
  { icon: '🌳', title: 'Дерево рода', desc: 'Собирайте предков поколение за поколением и приглашайте родственников по личной ссылке.' },
  { icon: '🎙️', title: 'Голоса и воспоминания', desc: 'Сохраняйте аудио, фото и семейные истории, чтобы они не терялись между чатами и телефонами.' },
  { icon: '🤖', title: 'Помощь ИИ', desc: 'ИИ подскажет вопросы для интервью и поможет оформить биографию на казахском или русском языке.' },
  { icon: '🗺️', title: 'География рода', desc: 'Отмечайте города, аулы и маршруты семьи, чтобы видеть происхождение рода на одной карте.' },
  { icon: '🏅', title: 'Сертификат хранителя', desc: 'После активации вы получаете именной цифровой сертификат участника проекта.' },
  { icon: '🔒', title: 'Гибкая приватность', desc: 'Можно оставить дерево только для семьи или открыть часть данных для поиска родственников.' },
]

const STEPS = [
  { title: 'Создайте профиль', desc: 'Имя, телефон и несколько базовых данных, чтобы открыть семейный кабинет.' },
  { title: 'Активируйте доступ', desc: 'Для тестового запуска работает Kaspi или демо-активация, если платёжный шлюз ещё не подключён.' },
  { title: 'Соберите первое дерево', desc: 'Добавьте себя, родителей и известных предков. Потом можно звать семью по invite-ссылке.' },
  { title: 'Наполните памятью', desc: 'Загрузите истории, фото и записи голоса, чтобы родословная стала живой и содержательной.' },
]
