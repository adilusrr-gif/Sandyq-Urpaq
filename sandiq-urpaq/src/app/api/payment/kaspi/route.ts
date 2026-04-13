import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AMOUNT = 500

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
}

function hasKaspiCredentials() {
  return Boolean(process.env.KASPI_MERCHANT_ID && process.env.KASPI_SECRET)
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  const { data: profile } = await supabase
    .from('users')
    .select('paid_at')
    .eq('id', user.id)
    .single()

  if (profile?.paid_at) {
    return NextResponse.redirect(new URL('/dashboard?already_paid=true', appUrl))
  }

  const orderId = `sandiq_${user.id}_${Date.now()}`

  if (!hasKaspiCredentials()) {
    return NextResponse.redirect(
      new URL(`/api/payment/callback?OrderId=${orderId}&Status=SUCCESS&Mode=test`, appUrl)
    )
  }

  const kaspiUrl = buildKaspiUrl(orderId, user.id, appUrl)
  return NextResponse.redirect(kaspiUrl)
}

function buildKaspiUrl(orderId: string, userId: string, appUrl: string): URL {
  const url = new URL('https://pay.kaspi.kz/pay')
  url.searchParams.set('MerchantId', process.env.KASPI_MERCHANT_ID!)
  url.searchParams.set('OrderId', orderId)
  url.searchParams.set('Amount', AMOUNT.toString())
  url.searchParams.set('Service', 'SandyQ UrpaQ — семейный кабинет')
  url.searchParams.set('ReturnUrl', `${appUrl}/api/payment/callback`)
  url.searchParams.set('FailUrl', `${appUrl}/dashboard?payment=failed`)
  url.searchParams.set('Comment', `Активация кабинета #${userId.slice(0, 8)}`)
  return url
}
