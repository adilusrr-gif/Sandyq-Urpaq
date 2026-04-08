import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/supabase/profiles'

const AMOUNT = 500

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
}

function hasKaspiCredentials() {
  return Boolean(process.env.KASPI_MERCHANT_ID && process.env.KASPI_SECRET)
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl(request)

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.redirect(new URL('/dashboard?payment=error', appUrl))
  }

  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  const admin = createAdminClient() as any
  const profile = await ensureUserProfile(admin, user)

  if (profile?.paid_at) {
    return NextResponse.redirect(new URL('/dashboard?already_paid=true', appUrl))
  }

  const orderId = `sandiq_${crypto.randomUUID()}`
  const { error: paymentError } = await admin
    .from('payments')
    .insert({
      user_id: user.id,
      order_id: orderId,
      amount: AMOUNT,
      status: 'pending',
      provider: hasKaspiCredentials() ? 'kaspi' : 'demo',
    })

  if (paymentError) {
    return NextResponse.redirect(new URL('/dashboard?payment=error', appUrl))
  }

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
  url.searchParams.set('Service', 'РЎР°РЅРґС‹Т› Т°СЂРїР°Т› вЂ” СЃРµРјРµР№РЅС‹Р№ РєР°Р±РёРЅРµС‚')
  url.searchParams.set('ReturnUrl', `${appUrl}/api/payment/callback`)
  url.searchParams.set('FailUrl', `${appUrl}/dashboard?payment=failed`)
  url.searchParams.set('Comment', `РђРєС‚РёРІР°С†РёСЏ РєР°Р±РёРЅРµС‚Р° #${userId.slice(0, 8)}`)
  return url
}
