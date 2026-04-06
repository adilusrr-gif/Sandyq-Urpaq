import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatYear(year: number | null): string {
  if (!year) return '?'
  return year.toString()
}

export function formatLifespan(birthYear: number | null, deathYear: number | null, isAlive: boolean): string {
  const birth = formatYear(birthYear)
  if (isAlive) return `${birth} — жив(а)`
  const death = formatYear(deathYear)
  return `${birth} — ${death}`
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function getVisibilityLabel(v: string): string {
  const map: Record<string, string> = {
    private: '🔴 Только Admin',
    family: '🔵 Только семья',
    public: '🟢 Публично',
    ai_only: '🟣 Только ИИ',
  }
  return map[v] ?? v
}

export function getGenerationLabel(num: number): string {
  if (num === 0) return 'Вы'
  if (num < 0) return `Поколение ${Math.abs(num)} назад`
  return `Поколение +${num}`
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}
