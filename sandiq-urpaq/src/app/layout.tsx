import type { Metadata } from 'next'
import { Cormorant_Garamond, JetBrains_Mono, Unbounded } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const displayFont = Unbounded({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-unbounded',
  weight: ['300', '400', '700', '900'],
  display: 'swap',
})

const bodyFont = Cormorant_Garamond({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const monoFont = JetBrains_Mono({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-jetbrains',
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://sandiq-urpaq.vercel.app'),
  title: {
    default: 'SandyQ UrpaQ',
    template: '%s | SandyQ UrpaQ',
  },
  description: 'Платформа для семейной памяти: дерево рода, истории, голоса близких и цифровая шежіре в одном месте.',
  keywords: ['Казахстан', 'родословная', 'шежіре', 'генеалогия', 'история семьи', 'семейный архив'],
  applicationName: 'SandyQ UrpaQ',
  openGraph: {
    title: 'SandyQ UrpaQ',
    description: 'Соберите семейное дерево, сохраните воспоминания и передайте историю рода дальше.',
    locale: 'ru_KZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SandyQ UrpaQ',
    description: 'Цифровая шежіре для семьи, которая хочет сохранить свою историю красиво и бережно.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} bg-ink text-parchment antialiased`}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1A1610',
              color: '#F5EDD8',
              border: '1px solid rgba(200,151,42,0.3)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            },
            success: { iconTheme: { primary: '#C8972A', secondary: '#0C0A06' } },
            error: { iconTheme: { primary: '#FF5C7A', secondary: '#0C0A06' } },
          }}
        />
      </body>
    </html>
  )
}
