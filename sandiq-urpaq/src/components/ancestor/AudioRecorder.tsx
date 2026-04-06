'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Props {
  personId: string
  onUploaded?: (memoryId: string, fileUrl: string) => void
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done'

export default function AudioRecorder({ personId, onUploaded }: Props) {
  const [state, setState] = useState<RecordState>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState<'kk' | 'ru' | 'en'>('kk')
  const [isAiDataset, setIsAiDataset] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient() as any

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })

      chunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
        setState('recorded')
      }

      mediaRecorder.start(1000)
      setState('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= 600) { stopRecording(); return d } // max 10 min
          return d + 1
        })
      }, 1000)
    } catch (err) {
      toast.error('Нет доступа к микрофону. Разрешите доступ в браузере.')
    }
  }, [stopRecording])

  const transcribeAudio = async (blob: Blob, url: string) => {
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append('file', blob, 'audio.webm')
      form.append('language', language)

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      if (data.transcript) {
        setTranscript(data.transcript)
        toast.success('Транскрипция готова!')
      }
    } catch {
      // Transcription is optional — don't block upload
    } finally {
      setTranscribing(false)
    }
  }

  const uploadAudio = async () => {
    if (!audioBlob) return
    setState('uploading')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      // 1. Upload file to Supabase Storage
      const ext = audioBlob.type.includes('webm') ? 'webm' : 'mp4'
      const fileName = `memories/${user.id}/${personId}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(fileName, audioBlob, { contentType: audioBlob.type, upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('memories').getPublicUrl(fileName)

      // 2. Transcribe (parallel, non-blocking)
      let finalTranscript = transcript
      if (!finalTranscript) {
        try {
          const form = new FormData()
          form.append('file', audioBlob, `audio.${ext}`)
          form.append('language', language)
          const res = await fetch('/api/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          finalTranscript = data.transcript ?? null
        } catch { /* optional */ }
      }

      // 3. Save memory record
      const { data: memory, error: memErr } = await supabase
        .from('memories')
        .insert({
          person_id: personId,
          added_by_user_id: user.id,
          type: 'audio',
          file_url: publicUrl,
          title: title || 'Аудио воспоминание',
          transcript: finalTranscript,
          language,
          visibility: 'family',
          is_ai_dataset: isAiDataset,
          duration_seconds: duration,
          moderation_status: 'approved',
        })
        .select()
        .single()

      if (memErr) throw memErr

      setState('done')
      toast.success('Аудио сохранено!')
      onUploaded?.(memory.id, publicUrl)
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка загрузки')
      setState('recorded')
    }
  }

  const reset = () => {
    setState('idle')
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setTranscript(null)
    setTitle('')
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="bg-white border border-gold/15 rounded-2xl p-6">
      <h3 className="font-display font-bold text-ink text-lg mb-5 flex items-center gap-2">
        🎙️ Записать голосовое воспоминание
      </h3>

      {/* Language selector */}
      <div className="flex gap-2 mb-5">
        {([['kk', '🇰🇿 Қазақша'], ['ru', '🇷🇺 Русский'], ['en', '🌐 English']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setLanguage(val)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-widest border transition-all',
                    language === val
                      ? 'bg-gold/15 border-gold text-ink'
                      : 'border-gold/15 text-ink/40 hover:border-gold/30'
                  )}>
            {label}
          </button>
        ))}
      </div>

      {/* Title input */}
      <div className="mb-5">
        <label className="label text-ink/50">Название записи</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
               className="input-field" placeholder="Рассказ о детстве в ауле..." />
      </div>

      {/* Recorder */}
      <div className="flex flex-col items-center gap-4 py-6">

        {/* State: idle */}
        {state === 'idle' && (
          <button onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-gold flex items-center justify-center
                             text-3xl text-ink shadow-[0_0_32px_rgba(200,151,42,0.4)]
                             hover:scale-105 transition-transform animate-pulse-gold">
            🎙️
          </button>
        )}

        {/* State: recording */}
        {state === 'recording' && (
          <>
            <div className="relative">
              <button onClick={stopRecording}
                      className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center
                                 text-white text-2xl shadow-[0_0_32px_rgba(239,68,68,0.4)]
                                 hover:scale-105 transition-transform">
                ⏹
              </button>
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
              <div className="absolute inset-[-8px] rounded-full border border-red-300 animate-ping opacity-20"
                   style={{ animationDelay: '0.3s' }} />
            </div>
            <div className="font-mono text-2xl text-red-500 tracking-widest">{fmt(duration)}</div>
            <div className="font-mono text-[10px] text-ink/30 tracking-widest uppercase animate-pulse">
              ● Запись...
            </div>
          </>
        )}

        {/* State: recorded */}
        {state === 'recorded' && audioUrl && (
          <div className="w-full space-y-4">
            <audio src={audioUrl} controls className="w-full rounded-xl" />
            <div className="font-mono text-[10px] text-ink/40 tracking-widest text-center">
              Длительность: {fmt(duration)}
            </div>

            {/* Transcript preview */}
            {transcribing && (
              <div className="bg-parchment rounded-lg p-3 border-l-4 border-gold animate-pulse">
                <div className="font-mono text-[9px] text-ink/30 tracking-widest mb-1">
                  🤖 Транскрибируем...
                </div>
              </div>
            )}
            {transcript && (
              <div className="bg-parchment rounded-lg p-4 border-l-4 border-gold">
                <div className="font-mono text-[9px] text-ink/30 tracking-widest mb-2">
                  🤖 ИИ-транскрипция:
                </div>
                <p className="font-body italic text-ink/70 text-sm leading-relaxed">{transcript}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={uploadAudio}
                      className="btn-primary flex-1">
                ⬆️ Сохранить
              </button>
              <button onClick={reset} className="btn-secondary">
                🔄 Перезаписать
              </button>
            </div>
          </div>
        )}

        {/* State: uploading */}
        {state === 'uploading' && (
          <div className="text-center space-y-3">
            <div className="text-4xl animate-spin">⏳</div>
            <div className="font-mono text-[11px] text-ink/40 tracking-widest">
              Загружаем и транскрибируем...
            </div>
          </div>
        )}

        {/* State: done */}
        {state === 'done' && (
          <div className="text-center space-y-3">
            <div className="text-5xl">✅</div>
            <div className="font-display font-bold text-ink text-lg">Сохранено!</div>
            <button onClick={reset} className="btn-secondary text-sm">
              Записать ещё
            </button>
          </div>
        )}
      </div>

      {/* AI dataset opt-in */}
      {state !== 'done' && (
        <label className="flex items-start gap-3 cursor-pointer mt-2 p-3 rounded-xl
                           border border-parchment/50 hover:border-gold/20 transition-colors">
          <input type="checkbox" checked={isAiDataset}
                 onChange={e => setIsAiDataset(e.target.checked)}
                 className="mt-1 accent-amber-500 flex-shrink-0" />
          <span className="font-body text-ink/50 text-sm leading-relaxed">
            🤖 Разрешить анонимно использовать для обучения казахского ИИ
            <span className="text-ink/30"> (помогает сохранить казахский язык)</span>
          </span>
        </label>
      )}
    </div>
  )
}
