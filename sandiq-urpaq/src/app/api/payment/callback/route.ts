import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const AMOUNT = 500

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
}

function hasKaspiCredentials() {
  return Boolean(process.env.KASPI_MERCHANT_ID && process.env.KASPI_SECRET)
}

async function markPaymentStatus(orderId: string, status: 'completed' | 'failed') {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('РќРµ РЅР°СЃС‚СЂРѕРµРЅ service role РєР»СЋС‡ Supabase.')
  }

  const admin = createAdminClient() as any
  await admin
    .from('payments')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('order_id', orderId)
    .neq('status', 'completed')
}

async function completePayment(orderId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('РќРµ РЅР°СЃС‚СЂРѕРµРЅ service role РєР»СЋС‡ Supabase.')
  }

  const admin = createAdminClient() as any
  const { data: payment } = await admin
    .from('payments')
    .select('id, user_id, amount, status')
    .eq('order_id', orderId)
    .maybeSingle()

  if (!payment) {
    throw new Error('Платёж не найден.')
  }

  if (payment.amount < AMOUNT) {
    throw new Error('Недостаточная сумма платежа.')
  }

  const { data: user } = await admin
    .from('users')
    .select('paid_at, participant_num')
    .eq('id', payment.user_id)
    .single()

  if (!user) {
    throw new Error('РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ.')
  }

  if (user.paid_at) {
    await markPaymentStatus(orderId, 'completed')
    return { status: 'already' as const, participantNum: user.participant_num }
  }

  const paidAt = new Date().toISOString()
  const { data: updatedUser, error: updateError } = await admin
    .from('users')
    .update({ paid_at: paidAt })
    .eq('id', payment.user_id)
    .is('paid_at', null)
    .select('participant_num')
    .maybeSingle()

  if (updateError) {
    throw updateError
  }

  const { data: freshUser, error: freshUserError } = await admin
    .from('users')
    .select('participant_num, paid_at')
    .eq('id', payment.user_id)
    .single()

  if (freshUserError) {
    throw freshUserError
  }

  await markPaymentStatus(orderId, 'completed')

  return {
    status: updatedUser ? 'success' as const : 'already' as const,
    participantNum: updatedUser?.participant_num ?? freshUser?.participant_num ?? null,
  }
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request)
  const { searchParams } = request.nextUrl
  const orderId = searchParams.get('OrderId')
  const status = searchParams.get('Status')

  if (!orderId) {
    return NextResponse.redirect(new URL('/dashboard?payment=error', appUrl))
  }

  if (status !== 'SUCCESS') {
    await markPaymentStatus(orderId, 'failed').catch(() => null)
    return NextResponse.redirect(new URL('/dashboard?payment=failed', appUrl))
  }

  if (hasKaspiCredentials()) {
    return NextResponse.redirect(new URL('/dashboard?payment=processing', appUrl))
  }

  try {
    const result = await completePayment(orderId)
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

    if (!orderId || status !== 'SUCCESS' || amount < AMOUNT) {
      if (orderId) {
        await markPaymentStatus(orderId, 'failed').catch(() => null)
      }
      return NextResponse.json({ code: 1, message: 'Invalid payment' })
    }

    await completePayment(orderId)

    return NextResponse.json({ code: 0, message: 'OK' })
  } catch {
    return NextResponse.json({ code: 1, message: 'Server error' })
  }
}
