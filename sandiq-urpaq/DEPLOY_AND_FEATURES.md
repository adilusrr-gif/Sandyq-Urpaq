# 🚀 САНДЫҚ ҰРПАҚ — Полный гайд деплоя и разработки

---

## ЧАСТЬ 1 — ДЕПЛОЙ НА VERCEL (10 минут)

### Шаг 1: GitHub

```bash
# В папке проекта
git init
git add .
git commit -m "🌳 Сандық Ұрпақ — initial commit"

# Создайте репо на github.com → New Repository → sandiq-urpaq
git remote add origin https://github.com/ВАШ_ЛОГИН/sandiq-urpaq.git
git push -u origin main
```

### Шаг 2: Vercel

1. Зайдите на **vercel.com** → Sign in with GitHub
2. **New Project** → Import `sandiq-urpaq`
3. Framework: **Next.js** (автоопределится)
4. **Environment Variables** — добавьте все:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJxxx...
SUPABASE_SERVICE_ROLE_KEY       = eyJxxx...
OPENAI_API_KEY                  = sk-...
NEXT_PUBLIC_APP_URL             = https://sandiq-urpaq.vercel.app
KASPI_MERCHANT_ID               = (получить у Kaspi)
KASPI_SECRET                    = (получить у Kaspi)
```

5. **Deploy** → через 2 минуты сайт онлайн 🎉

### Шаг 3: Свой домен (необязательно)

```
Vercel Dashboard → Project → Settings → Domains
→ Add: sandiq.kz
→ Добавьте DNS записи у регистратора домена
```

### Шаг 4: Обновить Supabase

В Supabase Dashboard → **Authentication → URL Configuration**:
```
Site URL:              https://sandiq-urpaq.vercel.app
Redirect URLs:         https://sandiq-urpaq.vercel.app/**
```

### Шаг 5: Telegram бот на Railway

```bash
# railway.app → New Project → Deploy from GitHub
# Или через CLI:
npm install -g @railway/cli
cd telegram-bot
railway login
railway init
railway up

# Добавьте env переменные в Railway Dashboard
```

---

## ЧАСТЬ 2 — АУДИО ЗАГРУЗКА В БРАУЗЕРЕ

Добавьте этот компонент в `src/components/ancestor/AudioRecorder.tsx`

```tsx
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  personId: string
  onUploaded?: (memoryId: string) => void
}

export default function AudioRecorder({ personId, onUploaded }: Props) {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const supabase = createClient()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch {
      toast.error('Нет доступа к микрофону')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
  }

  const uploadAndTranscribe = async () => {
    if (!audioBlob) return
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileName = `memories/${user!.id}/${Date.now()}.webm`

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('memories')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('memories').getPublicUrl(fileName)

      // Save memory record
      const { data: memory, error: memErr } = await supabase
        .from('memories')
        .insert({
          person_id: personId,
          added_by_user_id: user!.id,
          type: 'audio',
          file_url: publicUrl,
          title: title || 'Аудио воспоминание',
          language: 'kk',
          visibility: 'family',
          is_ai_dataset: false,
          moderation_status: 'pending',
          duration_seconds: Math.round(audioBlob.size / 16000),
        })
        .select()
        .single()

      if (memErr) throw memErr

      setUploading(false)
      toast.success('Аудио загружено!')

      // Transcribe
      setTranscribing(true)
      const form = new FormData()
      form.append('file', audioBlob, 'audio.webm')
      form.append('memory_id', memory.id)
      form.append('language', 'kk')

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json()

      if (data.transcript) {
        setTranscript(data.transcript)
        toast.success('Транскрипция готова!')
      }

      onUploaded?.(memory.id)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      setTranscribing(false)
    }
  }

  const reset = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setTranscript(null)
    setTitle('')
  }

  return (
    <div className="bg-white border border-gold/10 rounded-2xl p-6">
      <h3 className="font-display font-bold text-ink text-lg mb-4">
        🎙️ Записать голосовое воспоминание
      </h3>

      {/* Title */}
      <div className="mb-4">
        <label className="label text-ink/50">Название записи</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input-field"
          placeholder="Рассказ о детстве в ауле..."
        />
      </div>

      {/* Recording controls */}
      {!audioUrl ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl
                        transition-all duration-300 ${
              recording
                ? 'bg-red-500 animate-pulse shadow-[0_0_32px_rgba(239,68,68,0.5)]'
                : 'bg-gold hover:scale-105 shadow-[0_4px_24px_rgba(200,151,42,0.4)]'
            }`}
          >
            {recording ? '⏹' : '🎙️'}
          </button>
          <p className="font-mono text-[10px] tracking-widest uppercase text-ink/40">
            {recording ? 'Запись... нажмите чтобы остановить' : 'Нажмите чтобы начать запись'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Playback */}
          <audio src={audioUrl} controls className="w-full" />

          {/* Transcript */}
          {transcript && (
            <div className="bg-parchment rounded-lg p-4 border-l-4 border-gold">
              <div className="font-mono text-[9px] tracking-widest uppercase text-ink/30 mb-2">
                ИИ-транскрипция:
              </div>
              <p className="font-body italic text-ink/70 text-base leading-relaxed">
                {transcript}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={uploadAndTranscribe}
              disabled={uploading || transcribing}
              className="btn-primary flex-1"
            >
              {uploading ? 'Загружаем...' :
               transcribing ? '🤖 Транскрибируем...' :
               '✅ Сохранить и транскрибировать'}
            </button>
            <button onClick={reset} className="btn-secondary px-4">
              🗑 Перезаписать
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## ЧАСТЬ 3 — КАРТА ПРОИСХОЖДЕНИЯ (Mapbox)

### Установка

```bash
npm install mapbox-gl @types/mapbox-gl react-map-gl
```

### Компонент `src/components/ancestor/OriginMap.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface LocationPoint {
  name: string
  coordinates: [number, number]  // [lng, lat]
  year?: number
  personName?: string
}

interface Props {
  locations: LocationPoint[]
  className?: string
}

export default function OriginMap({ locations, className = '' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [66.9237, 48.0196], // Kazakhstan center
      zoom: 4,
    })

    map.on('load', () => {
      // Add migration route line
      if (locations.length > 1) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: locations.map(l => l.coordinates),
            },
          },
        })

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#C8972A', 'line-width': 2, 'line-dasharray': [2, 2] },
        })
      }

      // Add markers
      locations.forEach((loc) => {
        const el = document.createElement('div')
        el.className = 'w-4 h-4 bg-gold rounded-full border-2 border-white shadow-lg cursor-pointer'
        el.style.cssText = `
          width: 16px; height: 16px;
          background: #C8972A;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(200,151,42,0.3);
          cursor: pointer;
        `

        new mapboxgl.Marker(el)
          .setLngLat(loc.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 16 }).setHTML(
              `<div style="font-family:sans-serif;padding:4px">
                <strong>${loc.name}</strong><br/>
                ${loc.personName ? `<span style="color:#888">${loc.personName}</span><br/>` : ''}
                ${loc.year ? `<span style="color:#C8972A">${loc.year}</span>` : ''}
              </div>`
            )
          )
          .addTo(map)
      })

      // Fit bounds to all locations
      if (locations.length > 1) {
        const bounds = locations.reduce(
          (b, l) => b.extend(l.coordinates as [number, number]),
          new mapboxgl.LngLatBounds(locations[0].coordinates, locations[0].coordinates)
        )
        map.fitBounds(bounds, { padding: 60 })
      }
    })

    mapInstance.current = map
    return () => map.remove()
  }, [locations])

  return (
    <div
      ref={mapRef}
      className={`rounded-2xl overflow-hidden border border-gold/15 ${className}`}
      style={{ height: '300px' }}
    />
  )
}
```

### Добавить в `.env.local`

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoixxxxxxxx
```

Получить токен: **mapbox.com** → Account → Access tokens (бесплатно до 50k запросов/мес)

---

## ЧАСТЬ 4 — REACT NATIVE (Expo)

### Инициализация

```bash
npx create-expo-app sandiq-mobile --template blank-typescript
cd sandiq-mobile
npx expo install @supabase/supabase-js @supabase/storage-js
npx expo install expo-av expo-image-picker expo-file-system
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-safe-area-context react-native-screens
```

### Структура мобильного приложения

```
sandiq-mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # Главная / Моё дерево
│   │   ├── ancestors.tsx    # Список предков
│   │   ├── record.tsx       # Запись голоса
│   │   └── profile.tsx      # Профиль + сертификат
│   ├── tree/[id].tsx        # Визуальное дерево
│   ├── ancestor/[id].tsx    # Профиль предка
│   └── _layout.tsx
├── components/
│   ├── TreeNode.tsx
│   ├── AudioRecorder.tsx    # Нативная запись
│   └── CertificateCard.tsx
└── lib/
    └── supabase.ts
```

### `sandiq-mobile/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### Нативная запись аудио `sandiq-mobile/components/AudioRecorder.tsx`

```typescript
import { useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Audio } from 'expo-av'
import { supabase } from '../lib/supabase'
import * as FileSystem from 'expo-file-system'

export default function AudioRecorder({ personId }: { personId: string }) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [uploading, setUploading] = useState(false)

  const startRecording = async () => {
    await Audio.requestPermissionsAsync()
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )
    setRecording(recording)
  }

  const stopAndUpload = async () => {
    if (!recording) return
    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()!
    setRecording(null)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileName = `memories/${user!.id}/${Date.now()}.m4a`
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const audioData = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

      await supabase.storage.from('memories').upload(fileName, audioData, {
        contentType: 'audio/m4a',
      })

      const { data: { publicUrl } } = supabase.storage
        .from('memories').getPublicUrl(fileName)

      await supabase.from('memories').insert({
        person_id: personId,
        added_by_user_id: user!.id,
        type: 'audio',
        file_url: publicUrl,
        language: 'kk',
        visibility: 'family',
        is_ai_dataset: false,
        moderation_status: 'pending',
      })

      alert('✅ Аудио сохранено!')
    } catch (err) {
      alert('Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, recording && styles.btnRecording]}
        onPress={recording ? stopAndUpload : startRecording}
        disabled={uploading}
      >
        <Text style={styles.btnText}>
          {uploading ? '⏳' : recording ? '⏹ Стоп' : '🎙️ Запись'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16 },
  btn: {
    backgroundColor: '#C8972A',
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 50,
  },
  btnRecording: { backgroundColor: '#ef4444' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
})
```

### Запуск мобильного приложения

```bash
# iOS симулятор (нужен Mac + Xcode)
npx expo run:ios

# Android эмулятор
npx expo run:android

# На реальном телефоне через Expo Go
npx expo start
# → Сканируйте QR-код телефоном
```

---

## ЧЕКЛИСТ ПЕРЕД ЗАПУСКОМ

```
□ npm install && npm run build — убедитесь что нет ошибок
□ Supabase: запустили 001_initial.sql и 002_payments.sql
□ Supabase: создали 3 storage bucket (memories, avatars, certificates)
□ Supabase: настроили Auth redirect URLs
□ Vercel: добавили все env переменные
□ Vercel: задеплоили проект
□ Telegram: создали бота через @BotFather
□ Telegram: добавили TELEGRAM_BOT_TOKEN в Railway
□ Домен: настроили DNS на Vercel (если есть)
□ Kaspi Pay: подали заявку на partners.kaspi.kz
```

---

## КОМАНДЫ БЫСТРОГО ДЕПЛОЯ

```bash
# Установить Vercel CLI
npm i -g vercel

# Первый деплой
vercel

# Продакшн деплой
vercel --prod

# Посмотреть логи
vercel logs

# Переменные окружения
vercel env add OPENAI_API_KEY
```

---

*Жеті атаңды біл — Знай своих семерых предков* 🌾
