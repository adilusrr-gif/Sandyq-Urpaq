'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function AddMemoryButton({ personId }: { personId: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'audio' | 'photo' | 'story' | 'tradition'>('story')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [isAiDataset, setIsAiDataset] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient() as any

  const save = async () => {
    if (!title && !text) { toast.error('Заполните название или текст'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('memories').insert({
        person_id: personId,
        added_by_user_id: user!.id,
        type,
        title: title || null,
        text_content: text || null,
        language: 'ru',
        visibility: 'family',
        is_ai_dataset: isAiDataset,
        moderation_status: 'pending',
      })
      toast.success('Воспоминание добавлено!')
      setOpen(false)
      setTitle(''); setText('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-xs px-4 py-2">
        ＋ Добавить воспоминание
      </button>

      {open && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-parchment rounded-2xl p-8 w-full max-w-lg animate-fade-up">
            <h3 className="font-display font-bold text-ink text-2xl mb-6">Добавить воспоминание</h3>

            {/* Type selector */}
            <div className="mb-5">
              <label className="label text-ink/60">Тип</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { v: 'story', icon: '📖', label: 'История' },
                  { v: 'audio', icon: '🎙️', label: 'Аудио' },
                  { v: 'tradition', icon: '🍲', label: 'Традиция' },
                  { v: 'photo', icon: '📸', label: 'Фото' },
                ] as const).map((t) => (
                  <button key={t.v}
                          onClick={() => setType(t.v as any)}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            type === t.v
                              ? 'border-gold bg-gold/10'
                              : 'border-gold/15 hover:border-gold/30'
                          }`}>
                    <div className="text-xl">{t.icon}</div>
                    <div className="font-mono text-[9px] text-ink/50 mt-1">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-ink/60">Название</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                     className="input-field" placeholder="Рассказ о детстве в ауле" />
            </div>

            <div className="mb-4">
              <label className="label text-ink/60">Текст / описание</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                        className="input-field min-h-[120px] resize-none"
                        placeholder="Напишите историю..." />
            </div>

            <label className="flex items-center gap-3 cursor-pointer mb-6">
              <input type="checkbox" checked={isAiDataset} onChange={e => setIsAiDataset(e.target.checked)}
                     className="w-4 h-4 accent-amber-500" />
              <span className="font-body text-ink/60 text-base">
                🤖 Разрешить использовать для обучения казахского ИИ (анонимно)
              </span>
            </label>

            <div className="flex gap-3">
              <button onClick={save} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
