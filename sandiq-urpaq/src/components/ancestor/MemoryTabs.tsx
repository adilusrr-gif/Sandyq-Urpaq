'use client'

import { useState } from 'react'
import { Memory } from '@/types'
import { cn } from '@/lib/utils'

interface Props { memories: (Memory & { author: any })[] }

const TABS = [
  { key: 'all', label: 'Все' },
  { key: 'audio', label: '🎙️ Аудио' },
  { key: 'photo', label: '📸 Фото' },
  { key: 'story', label: '📖 Истории' },
  { key: 'tradition', label: '🍲 Традиции' },
]

export default function MemoryTabs({ memories }: Props) {
  const [activeTab, setActiveTab] = useState('all')

  const filtered = activeTab === 'all'
    ? memories
    : memories.filter((m) => m.type === activeTab)

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 border-b-2 border-gold/10 mb-6">
        {TABS.map((tab) => {
          const count = tab.key === 'all'
            ? memories.length
            : memories.filter((m) => m.type === tab.key).length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-3 font-mono text-[10px] tracking-widest uppercase transition-all',
                'border-b-2 -mb-0.5 flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'text-gold border-gold'
                  : 'text-ink/30 border-transparent hover:text-ink/60'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'text-[8px] px-1.5 py-0.5 rounded-full',
                  activeTab === tab.key ? 'bg-gold text-ink' : 'bg-ink/10 text-ink/40'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ink/30">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-body italic text-lg">Воспоминаний пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}
    </div>
  )
}

function MemoryCard({ memory }: { memory: Memory & { author: any } }) {
  if (memory.type === 'audio') return <AudioCard memory={memory} />
  if (memory.type === 'photo') return <PhotoCard memory={memory} />
  return <TextCard memory={memory} />
}

function AudioCard({ memory }: { memory: Memory & { author: any } }) {
  return (
    <div className="bg-white border border-gold/10 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <button className="w-12 h-12 rounded-full bg-gold flex items-center justify-center
                           text-ink text-xl hover:scale-105 transition-transform
                           shadow-[0_4px_16px_rgba(200,151,42,0.4)] flex-shrink-0">
          ▶
        </button>
        <div>
          <div className="font-display font-bold text-ink text-sm mb-1">
            {memory.title ?? 'Аудио запись'}
          </div>
          <div className="font-mono text-[9px] text-ink/30 tracking-widest">
            {memory.author?.full_name} · {memory.duration_seconds
              ? `${Math.floor(memory.duration_seconds / 60)} мин`
              : ''} · {memory.language.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Waveform placeholder */}
      <div className="h-10 rounded bg-gradient-to-r from-gold/20 via-gold/40 to-gold/20 mb-3 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gold/20 border-r-2 border-gold" />
      </div>

      {memory.transcript && (
        <div className="bg-parchment rounded-lg p-4 border-l-4 border-gold font-body italic text-ink/70
                        text-base leading-relaxed">
          <span className="font-mono text-[8px] tracking-widest uppercase text-ink/30 block mb-2 not-italic">
            ИИ-транскрипция:
          </span>
          {memory.transcript}
        </div>
      )}
    </div>
  )
}

function PhotoCard({ memory }: { memory: Memory & { author: any } }) {
  return (
    <div className="bg-white border border-gold/10 rounded-2xl overflow-hidden">
      {memory.file_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={memory.file_url} alt={memory.title ?? 'Фото'} className="w-full h-64 object-cover" />
      ) : (
        <div className="h-48 bg-parchment/50 flex items-center justify-center text-5xl">📷</div>
      )}
      {memory.title && (
        <div className="px-5 py-3 font-body italic text-ink/60 text-base border-t border-gold/10">
          {memory.title}
        </div>
      )}
    </div>
  )
}

function TextCard({ memory }: { memory: Memory & { author: any } }) {
  const icons: Record<string, string> = {
    story: '📖', tradition: '🏺', recipe: '🍲', document: '📜', location: '🗺️',
  }
  return (
    <div className="bg-white border border-gold/10 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icons[memory.type] ?? '📄'}</span>
        <span className="font-display font-bold text-ink text-sm">
          {memory.title ?? memory.type}
        </span>
      </div>
      {memory.text_content && (
        <p className="font-body text-ink/70 text-base leading-relaxed italic">
          {memory.text_content}
        </p>
      )}
      <div className="mt-3 font-mono text-[9px] text-ink/20 tracking-widest">
        Добавил: {memory.author?.full_name}
      </div>
    </div>
  )
}
