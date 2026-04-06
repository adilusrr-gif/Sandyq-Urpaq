'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Props {
  personId: string
  onUploaded?: (memoryId: string, fileUrl: string) => void
}

export default function PhotoUploader({ personId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient() as any

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Только изображения (JPG, PNG, HEIC)')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('Максимум 20MB')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      const ext = file.name.split('.').pop() ?? 'jpg'
      const fileName = `memories/${user.id}/${personId}_${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('memories')
        .upload(fileName, file, { contentType: file.type })

      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage
        .from('memories').getPublicUrl(fileName)

      const { data: memory, error: memErr } = await supabase
        .from('memories')
        .insert({
          person_id: personId,
          added_by_user_id: user.id,
          type: 'photo',
          file_url: publicUrl,
          title: title || file.name,
          language: 'ru',
          visibility: 'family',
          is_ai_dataset: false,
          moderation_status: 'approved',
        })
        .select().single()

      if (memErr) throw memErr

      setDone(true)
      toast.success('Фото сохранено!')
      onUploaded?.(memory.id, publicUrl)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setFile(null); setPreview(null); setTitle(''); setDone(false)
  }

  if (done) {
    return (
      <div className="bg-white border border-gold/15 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h3 className="font-display font-bold text-ink text-lg mb-4">Фото сохранено!</h3>
        <button onClick={reset} className="btn-secondary">Загрузить ещё</button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gold/15 rounded-2xl p-6">
      <h3 className="font-display font-bold text-ink text-lg mb-5">
        📸 Добавить фото
      </h3>

      {!preview ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
            dragging
              ? 'border-gold bg-gold/5 scale-[1.02]'
              : 'border-gold/20 hover:border-gold/40 hover:bg-gold/3'
          )}>
          <div className="text-4xl mb-3">📸</div>
          <p className="font-display font-bold text-ink text-base mb-1">
            Перетащите фото сюда
          </p>
          <p className="font-body text-ink/40 text-sm">
            или нажмите для выбора · JPG, PNG, HEIC · до 20MB
          </p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
                 onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview"
                 className="w-full max-h-64 object-cover rounded-xl" />
            <button onClick={reset}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/60 text-white
                               flex items-center justify-center text-sm hover:bg-ink transition-colors">
              ✕
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="label text-ink/50">Подпись к фото</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
                   className="input-field" placeholder="Семья в ауле, 1965 год" />
          </div>

          <button onClick={upload} disabled={uploading}
                  className="btn-primary w-full">
            {uploading ? '⬆️ Загружаем...' : '✅ Сохранить фото'}
          </button>
        </div>
      )}
    </div>
  )
}
