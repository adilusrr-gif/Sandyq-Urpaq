import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; detail?: string }> = {}

  // ── 1. Supabase DB ──
  try {
    const t = Date.now()
    const admin = createAdminClient() as any
    const { count, error } = await admin
      .from('users')
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    checks.database = { status: 'ok', latency: Date.now() - t, detail: `${count} users` }
  } catch (e: any) {
    checks.database = { status: 'error', detail: e.message }
  }

  // ── 2. Supabase Storage ──
  try {
    const t = Date.now()
    const admin = createAdminClient() as any
    const { data, error } = await admin.storage.listBuckets()
    if (error) throw error
    const buckets = data.map(b => b.name).join(', ')
    checks.storage = { status: 'ok', latency: Date.now() - t, detail: `Buckets: ${buckets}` }
  } catch (e: any) {
    checks.storage = { status: 'error', detail: e.message }
  }

  // ── 3. OpenAI ──
  try {
    const t = Date.now()
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    })
    checks.openai = res.ok
      ? { status: 'ok', latency: Date.now() - t }
      : { status: 'error', detail: `HTTP ${res.status}` }
  } catch (e: any) {
    checks.openai = { status: 'error', detail: e.message }
  }

  // ── 4. Env vars ──
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]
  const missingEnvs = requiredEnvs.filter(k => !process.env[k])
  checks.env = missingEnvs.length === 0
    ? { status: 'ok', detail: 'All required vars present' }
    : { status: 'error', detail: `Missing: ${missingEnvs.join(', ')}` }

  const allOk = Object.values(checks).every(c => c.status === 'ok')
  const totalLatency = Date.now() - start

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV,
      latency_ms: totalLatency,
      checks,
    },
    { status: allOk ? 200 : 503 }
  )
}
