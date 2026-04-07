'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { User } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props { profile: User }

export default function CertificateClient({ profile }: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null)
  const certRef = useRef<HTMLDivElement>(null)

  const generateAI = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/certificate', { method: 'POST' })
      const data = await res.json()
      if (data.imageUrl) {
        setAiImageUrl(data.imageUrl)
        toast.success('AI-сертификат сгенерирован!')
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error('Ошибка генерации: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const shareText = `Я стал хранителем культуры Казахстана #${profile.participant_num?.toLocaleString('ru')} на платформе SandyQ UrpaQ! Сохрани историю своей семьи → sandiq.kz`

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'SandyQ UrpaQ', text: shareText, url: 'https://sandiq.kz' })
    } else {
      await navigator.clipboard.writeText(shareText)
      toast.success('Скопировано в буфер!')
    }
  }

  const paidDate = profile.paid_at
    ? format(new Date(profile.paid_at), 'd MMMM yyyy', { locale: ru })
    : ''

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-4 py-16">
      <button onClick={() => router.push('/dashboard')}
              className="font-mono text-[10px] tracking-[3px] uppercase text-parchment/30
                         hover:text-gold transition-colors mb-10 flex items-center gap-2 self-start
                         max-w-2xl w-full mx-auto">
        ← Панель управления
      </button>

      <div className="font-mono text-[10px] tracking-[6px] uppercase text-gold mb-8 text-center">
        Ваш сертификат хранителя
      </div>

      {/* Certificate */}
      <div ref={certRef}
           className="w-full max-w-xl bg-parchment border-4 border-gold rounded p-10
                      relative overflow-hidden shadow-[0_0_80px_rgba(200,151,42,0.25)]
                      text-center animate-fade-up">

        {/* Corner ornaments */}
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <div key={pos} className={`absolute w-10 h-10 border-gold border-2 ${
            pos === 'tl' ? 'top-3 left-3 border-r-0 border-b-0' :
            pos === 'tr' ? 'top-3 right-3 border-l-0 border-b-0' :
            pos === 'bl' ? 'bottom-3 left-3 border-r-0 border-t-0' :
            'bottom-3 right-3 border-l-0 border-t-0'
          }`} />
        ))}

        {/* AI background image */}
        {aiImageUrl && (
          <div className="absolute inset-0 opacity-10"
               style={{ backgroundImage: `url(${aiImageUrl})`, backgroundSize: 'cover' }} />
        )}

        <div className="relative z-10">
          {/* Logo */}
          <div className="font-display font-black text-gold tracking-[4px] text-sm mb-1">
            SandyQ UrpaQ
          </div>
          <div className="font-body italic text-ink/50 text-sm mb-4">
            Цифровое Поколение · Казахстан
          </div>

          {/* Ornament line */}
          <div className="w-4/5 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent mx-auto mb-6" />

          <p className="font-body italic text-ink/60 text-sm mb-3">
            Настоящим подтверждается, что
          </p>

          {/* Name */}
          <h2 className="font-body italic font-semibold text-ink text-4xl mb-2">
            {profile.full_name}
          </h2>

          <div className="font-mono text-[9px] tracking-[3px] uppercase text-ink/40 mb-6">
            является хранителем культуры Казахстана
          </div>

          {/* Number */}
          <div className="font-display font-black text-gold mb-1"
               style={{ fontSize: 'clamp(48px, 8vw, 72px)', lineHeight: 1 }}>
            #{profile.participant_num?.toLocaleString('ru')}
          </div>
          <div className="font-mono text-[9px] tracking-[4px] uppercase text-ink/30 mb-6">
            Номер хранителя
          </div>

          <p className="font-body italic text-ink/50 text-base leading-relaxed mb-6 max-w-xs mx-auto">
            Голос, история и культура вашей семьи навсегда стали частью народной памяти Казахстана
          </p>

          <div className="w-4/5 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent mx-auto mb-6" />

          {/* Seal */}
          <div className="w-16 h-16 rounded-full border-2 border-gold mx-auto flex items-center
                          justify-center text-3xl bg-gold/5 mb-4">
            🌾
          </div>

          {/* Date */}
          <div className="font-mono text-[9px] tracking-[3px] uppercase text-ink/25">
            {paidDate} · Алматы, Казахстан
          </div>

          {/* Tribe */}
          {profile.tribe_zhuz && (
            <div className="font-mono text-[9px] tracking-[2px] uppercase text-ink/20 mt-1">
              {profile.tribe_zhuz}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <button onClick={handleShare} className="btn-primary">
          📤 Поделиться
        </button>

        {!aiImageUrl ? (
          <button onClick={generateAI} disabled={generating} className="btn-secondary">
            {generating ? '🎨 Генерируем...' : '🤖 Добавить AI-орнамент'}
          </button>
        ) : (
          <a href={aiImageUrl} download="sandiq-certificate.png" className="btn-secondary">
            ⬇️ Скачать PNG
          </a>
        )}

        <button onClick={() => router.push('/tree/new')} className="btn-secondary">
          🌳 Создать дерево
        </button>
      </div>

      {/* Viral text */}
      <div className="mt-8 card-gold max-w-lg w-full text-center">
        <div className="font-mono text-[9px] tracking-[3px] uppercase text-parchment/40 mb-2">
          Поделитесь с друзьями
        </div>
        <p className="font-body italic text-parchment/60 text-base leading-relaxed">
          {shareText}
        </p>
      </div>
    </div>
  )
}
