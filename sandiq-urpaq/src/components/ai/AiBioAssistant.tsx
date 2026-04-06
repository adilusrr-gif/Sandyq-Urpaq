'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  personId: string
  personName: string
  onGenerated?: (bio: string, memoryId: string) => void
}

const QUESTIONS = [
  { id: 'childhood',  emoji: '🌱', label: 'Детство',       placeholder: 'Где вырос, в какой семье, как прошло детство...' },
  { id: 'work',       emoji: '⚒️', label: 'Профессия',     placeholder: 'Пастух, учитель, военный, колхозник...' },
  { id: 'family',     emoji: '👨‍👩‍👧‍👦', label: 'Семья',         placeholder: 'Сколько детей, как звали супруга(у)...' },
  { id: 'character',  emoji: '💛', label: 'Характер',      placeholder: 'Добрый, строгий, весёлый, мудрый...' },
  { id: 'hardship',   emoji: '🌧️', label: 'Испытания',     placeholder: 'Война, голод, переезды, болезни...' },
  { id: 'wisdom',     emoji: '📜', label: 'Мудрость',      placeholder: 'Любимые слова, наставления детям...' },
  { id: 'legacy',     emoji: '🌿', label: 'Наследие',      placeholder: 'Что оставил(а) после себя...' },
]

type Step = 'intro' | 'questions' | 'generating' | 'result'

export default function AiBioAssistant({ personId, personName, onGenerated }: Props) {
  const [step, setStep] = useState<Step>('intro')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [language, setLanguage] = useState<'ru' | 'kk'>('ru')
  const [biography, setBiography] = useState('')
  const [generating, setGenerating] = useState(false)

  const progress = ((current + 1) / QUESTIONS.length) * 100
  const q = QUESTIONS[current]

  const next = () => {
    if (current < QUESTIONS.length - 1) {
      setCurrent(c => c + 1)
    } else {
      generate()
    }
  }

  const prev = () => {
    if (current > 0) setCurrent(c => c - 1)
    else setStep('intro')
  }

  const generate = async () => {
    setStep('generating')
    setGenerating(true)
    try {
      const res = await fetch('/api/ai-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, answers, language }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBiography(data.biography)
      setStep('result')
      onGenerated?.(data.biography, data.memoryId)
      toast.success('Биография создана!')
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка генерации')
      setStep('questions')
    } finally {
      setGenerating(false)
    }
  }

  // ── INTRO ──
  if (step === 'intro') {
    return (
      <div className="bg-parchment rounded-2xl border border-gold/15 p-8 text-center">
        <div className="text-5xl mb-4">🤖</div>
        <h3 className="font-display font-bold text-ink text-2xl mb-2">
          AI-помощник биографа
        </h3>
        <p className="font-body italic text-ink/50 text-lg mb-6 max-w-md mx-auto leading-relaxed">
          Ответьте на 7 вопросов о {personName} — и ИИ напишет живую, тёплую биографию на основе ваших воспоминаний.
        </p>

        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="font-mono text-[10px] tracking-widest text-ink/40 uppercase">Язык биографии:</span>
          {(['ru', 'kk'] as const).map(l => (
            <button key={l} onClick={() => setLanguage(l)}
              className={cn(
                'font-mono text-[10px] tracking-widest uppercase px-4 py-2 rounded-full border transition-all',
                language === l
                  ? 'bg-gold text-ink border-gold font-bold'
                  : 'border-gold/20 text-ink/40 hover:border-gold/40'
              )}>
              {l === 'ru' ? '🇷🇺 Русский' : '🇰🇿 Қазақша'}
            </button>
          ))}
        </div>

        {/* Steps preview */}
        <div className="flex justify-center gap-2 flex-wrap mb-8">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="flex items-center gap-1.5 bg-white border border-gold/10
                                        rounded-full px-3 py-1.5">
              <span className="text-sm">{q.emoji}</span>
              <span className="font-mono text-[9px] text-ink/50 tracking-widest uppercase">{q.label}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setStep('questions')} className="btn-primary">
          Начать — 7 вопросов →
        </button>
        <p className="font-mono text-[9px] text-ink/25 tracking-widest mt-3 uppercase">
          ~3 минуты · сохраняется автоматически
        </p>
      </div>
    )
  }

  // ── GENERATING ──
  if (step === 'generating') {
    return (
      <div className="bg-parchment rounded-2xl border border-gold/15 p-12 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-gold/20" />
          <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
        </div>
        <h3 className="font-display font-bold text-ink text-xl mb-2">Создаём биографию...</h3>
        <p className="font-body italic text-ink/40 text-base">
          ИИ изучает ответы и воссоздаёт историю жизни {personName}
        </p>

        {/* Animated dots */}
        <div className="flex justify-center gap-2 mt-6">
          {['Анализируем ответы', 'Учитываем эпоху', 'Пишем биографию'].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 opacity-0 animate-fade-up"
                 style={{ animationDelay: `${i * 0.8}s`, animationFillMode: 'forwards' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="font-mono text-[9px] text-ink/40 tracking-widest uppercase">{s}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── RESULT ──
  if (step === 'result') {
    return (
      <div className="bg-parchment rounded-2xl border border-gold/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-gold/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <div>
              <div className="font-display font-bold text-ink text-sm">Биография готова</div>
              <div className="font-mono text-[9px] text-ink/30 tracking-widest uppercase">
                Сохранена в воспоминаниях · {language === 'ru' ? 'Русский' : 'Қазақша'}
              </div>
            </div>
          </div>
          <button onClick={() => { setStep('intro'); setCurrent(0); setBiography(''); setAnswers({}) }}
                  className="font-mono text-[10px] text-ink/30 tracking-widest uppercase
                             hover:text-ink/60 transition-colors">
            ↺ Новая
          </button>
        </div>

        <div className="p-6">
          {/* Biography text */}
          <div className="font-body text-ink/80 text-base leading-[2] mb-6 whitespace-pre-wrap">
            {biography}
          </div>

          <div className="ornament-line" />

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => navigator.clipboard.writeText(biography).then(() => toast.success('Скопировано!'))}
              className="btn-secondary flex-1 text-sm py-3"
            >
              📋 Скопировать
            </button>
            <button
              onClick={() => { setStep('intro'); setCurrent(0); setBiography(''); setAnswers({}) }}
              className="btn-primary flex-1 text-sm py-3"
            >
              ✨ Улучшить ответы
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTIONS ──
  return (
    <div className="bg-parchment rounded-2xl border border-gold/15 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-gold/10">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[9px] text-ink/30 tracking-[3px] uppercase">
            {current + 1} / {QUESTIONS.length}
          </div>
          <div className="font-mono text-[9px] text-ink/30 tracking-widest uppercase">
            {personName}
          </div>
        </div>
        {/* Progress */}
        <div className="h-1 bg-gold/10 rounded-full">
          <div className="h-full bg-gradient-to-r from-gold to-gold-2 rounded-full transition-all duration-500"
               style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="px-6 py-6">
        <div className="text-4xl mb-4">{q.emoji}</div>
        <h3 className="font-display font-bold text-ink text-xl mb-1">{q.label}</h3>
        <p className="font-body italic text-ink/40 text-sm mb-4">
          Вопрос {current + 1}: о {personName}
        </p>

        <textarea
          value={answers[q.id] ?? ''}
          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          placeholder={q.placeholder}
          className="w-full input-field min-h-[120px] resize-none text-base"
          autoFocus
        />

        <p className="font-mono text-[9px] text-ink/20 tracking-widest uppercase mt-2">
          Необязательно — нажмите &quot;Далее&quot;, чтобы пропустить
        </p>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-5 flex gap-3">
        <button onClick={prev} className="btn-secondary px-6">
          ← {current === 0 ? 'Назад' : 'Пред.'}
        </button>
        <button onClick={next} className="btn-primary flex-1">
          {current === QUESTIONS.length - 1 ? '🤖 Создать биографию' : 'Далее →'}
        </button>
      </div>

      {/* Steps navigator */}
      <div className="px-6 pb-5 flex gap-1.5 flex-wrap">
        {QUESTIONS.map((q, i) => (
          <button key={q.id} onClick={() => setCurrent(i)}
                  title={q.label}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-mono tracking-widest uppercase transition-all',
                    i === current
                      ? 'border-gold bg-gold/10 text-gold'
                      : answers[q.id]
                      ? 'border-green-400/30 bg-green-50 text-green-600'
                      : 'border-gold/10 text-ink/25'
                  )}>
            <span>{q.emoji}</span>
            <span className="hidden sm:inline">{q.label}</span>
            {answers[q.id] && i !== current && <span className="text-green-500">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
