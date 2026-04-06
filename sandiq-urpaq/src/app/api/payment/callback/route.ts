import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
}

async function completePayment(userId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Не настроен service role ключ Supabase.')
  }

  const admin = createAdminClient() as any
  const { data: user } = await admin
    .from('users')
    .select('paid_at, participant_num')
    .eq('id', userId)
    .single()

  if (!user) {
    throw new Error('Пользователь не найден.')
  }

  if (user.paid_at) {
    return { status: 'already' as const, participantNum: user.participant_num }
  }

  const { data: maxUser } = await admin
    .from('users')
    .select('participant_num')
    .not('participant_num', 'is', null)
    .order('participant_num', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNum = (maxUser?.participant_num ?? 0) + 1

  await admin
    .from('users')
    .update({
      paid_at: new Date().toISOString(),
      participant_num: nextNum,
    })
    .eq('id', userId)
    .is('paid_at', null)

  return { status: 'success' as const, participantNum: nextNum }
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request)
  const { searchParams } = request.nextUrl
  const orderId = searchParams.get('OrderId')
  const status = searchParams.get('Status')
  const userId = orderId?.split('_')[1]

  if (!orderId || !userId) {
    return NextResponse.redirect(new URL('/dashboard?payment=error', appUrl))
  }

  if (status !== 'SUCCESS') {
    return NextResponse.redirect(new URL('/dashboard?payment=failed', appUrl))
  }

  try {
    const result = await completePayment(userId)
    const target = result.status === 'already'
      ? '/dashboard?payment=already'
      : `/dashboard?payment=success&num=${result.participantNum}`

    return NextResponse.redirect(new URL(target, appUrl))
  } catch (error) {
    console.error('Payment callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?payment=error', appUrl))
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orderId = typeof body.OrderId === 'string' ? body.OrderId : null
    const status = typeof body.Status === 'string' ? body.Status : null
    const amount = Number(body.Amount)
    const userId = orderId?.split('_')[1]

    if (!orderId || !userId || status !== 'SUCCESS' || amount < 500) {
      return NextResponse.json({ code: 1, message: 'Invalid payment' })
    }

    await completePayment(userId)

    return NextResponse.json({ code: 0, message: 'OK' })
  } catch {
    return NextResponse.json({ code: 1, message: 'Server error' })
  }
}
