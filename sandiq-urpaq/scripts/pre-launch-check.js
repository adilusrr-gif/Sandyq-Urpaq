#!/usr/bin/env node
/**
 * Сандық Ұрпақ — Pre-Launch Checklist
 * Запуск: node scripts/pre-launch-check.js
 */

const checks = []
let passed = 0
let failed = 0

const ok  = (msg) => { console.log(`  ✅ ${msg}`); passed++; checks.push({ ok: true, msg }) }
const err = (msg) => { console.log(`  ❌ ${msg}`); failed++; checks.push({ ok: false, msg }) }
const warn = (msg) => { console.log(`  ⚠️  ${msg}`) }
const section = (title) => console.log(`\n${'═'.repeat(50)}\n  ${title}\n${'═'.repeat(50)}`)

async function run() {
  console.log('\n🌾 САНДЫҚ ҰРПАҚ — Pre-Launch Checklist\n')

  // ── ENV VARIABLES ──
  section('1. Environment Variables')
  const REQUIRED_ENVS = [
    ['NEXT_PUBLIC_SUPABASE_URL', 'Supabase URL'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase Anon Key'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'Supabase Service Role'],
    ['OPENAI_API_KEY', 'OpenAI API Key'],
    ['NEXT_PUBLIC_APP_URL', 'App URL'],
  ]
  const OPTIONAL_ENVS = [
    ['NEXT_PUBLIC_MAPBOX_TOKEN', 'Mapbox Token (карта)'],
    ['KASPI_MERCHANT_ID', 'Kaspi Merchant ID (оплата)'],
    ['KASPI_SECRET', 'Kaspi Secret'],
    ['TELEGRAM_BOT_TOKEN', 'Telegram Bot Token'],
  ]

  require('dotenv').config({ path: '.env.local' })

  REQUIRED_ENVS.forEach(([key, label]) => {
    process.env[key] ? ok(`${label} задан`) : err(`${label} НЕ ЗАДАН (${key})`)
  })
  OPTIONAL_ENVS.forEach(([key, label]) => {
    process.env[key] ? ok(`${label} задан`) : warn(`${label} не задан — функция недоступна`)
  })

  // ── SUPABASE CONNECTION ──
  section('2. Supabase Connection')
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = require('@supabase/supabase-js')
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

      const { count, error } = await admin.from('users').select('*', { count: 'exact', head: true })
      if (error) throw error
      ok(`База данных доступна (${count ?? 0} пользователей)`)

      // Check tables exist
      const TABLES = ['users', 'family_trees', 'persons', 'relationships', 'memories', 'tree_members', 'payments']
      for (const table of TABLES) {
        const { error: tErr } = await admin.from(table).select('*', { head: true }).limit(1)
        tErr ? err(`Таблица '${table}' недоступна: ${tErr.message}`) : ok(`Таблица '${table}' существует`)
      }

      // Check buckets
      const { data: buckets } = await admin.storage.listBuckets()
      const bucketNames = (buckets ?? []).map(b => b.name)
      for (const bucket of ['memories', 'avatars', 'certificates']) {
        bucketNames.includes(bucket) ? ok(`Bucket '${bucket}' существует`) : err(`Bucket '${bucket}' НЕ СУЩЕСТВУЕТ`)
      }
    } catch (e) {
      err(`Supabase недоступен: ${e.message}`)
    }
  } else {
    warn('Пропуск проверки Supabase — нет ключей')
  }

  // ── OPENAI CONNECTION ──
  section('3. OpenAI Connection')
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(8000),
      })
      res.ok ? ok('OpenAI API доступен') : err(`OpenAI вернул ${res.status}`)
    } catch (e) {
      err(`OpenAI недоступен: ${e.message}`)
    }
  } else {
    warn('Пропуск проверки OpenAI')
  }

  // ── APP URL ──
  section('4. App Health Check')
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/health`, {
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const data = await res.json()
        ok(`Health check: ${data.status} (${data.latency_ms}ms)`)
        Object.entries(data.checks ?? {}).forEach(([k, v]) => {
          v.status === 'ok' ? ok(`  ${k}: OK`) : err(`  ${k}: ${v.detail}`)
        })
      } else {
        err(`Health check вернул ${res.status}`)
      }
    } catch (e) {
      warn(`Приложение недоступно по ${process.env.NEXT_PUBLIC_APP_URL} — запустите npm run dev`)
    }
  }

  // ── PACKAGE.JSON ──
  section('5. Build Configuration')
  try {
    const pkg = require('../package.json')
    ok(`package.json: ${pkg.name} v${pkg.version}`)
    const requiredDeps = ['next', '@supabase/supabase-js', 'zustand', 'react-hook-form', 'zod']
    requiredDeps.forEach(dep => {
      pkg.dependencies[dep] ? ok(`Зависимость '${dep}' установлена`) : err(`Зависимость '${dep}' ОТСУТСТВУЕТ`)
    })
  } catch (e) {
    err('package.json не найден')
  }

  // ── SECURITY ──
  section('6. Security Checklist')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  appUrl.startsWith('https') ? ok('HTTPS включён') : err('Используйте HTTPS в продакшне')
  process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SERVICE_ROLE
    ? ok('Service role key не экспонирован публично')
    : err('Никогда не используйте NEXT_PUBLIC_ для service role key!')

  // ── SUMMARY ──
  console.log('\n' + '═'.repeat(50))
  console.log(`\n📊 ИТОГ: ${passed} прошло, ${failed} провалено\n`)

  if (failed === 0) {
    console.log('🚀 Всё готово к продакшн запуску!\n')
    console.log('   Следующий шаг: vercel --prod\n')
  } else {
    console.log('⚠️  Исправьте ошибки перед запуском!\n')
    console.log('Проваленные проверки:')
    checks.filter(c => !c.ok).forEach(c => console.log(`  • ${c.msg}`))
    console.log()
  }

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error('Ошибка скрипта:', e); process.exit(1) })
