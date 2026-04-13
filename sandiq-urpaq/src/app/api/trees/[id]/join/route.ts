import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Не настроен service role ключ Supabase.' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Требуется вход в аккаунт.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.toUpperCase() : null

    const admin = createAdminClient() as any
    const { data: tree } = await admin
      .from('family_trees')
      .select('id, owner_user_id, invite_code')
      .eq('id', params.id)
      .single()

    if (!tree) {
      return NextResponse.json({ error: 'Дерево не найдено.' }, { status: 404 })
    }

    if (inviteCode && tree.invite_code !== inviteCode) {
      return NextResponse.json({ error: 'Ссылка приглашения больше неактуальна.' }, { status: 403 })
    }

    const { data: existing } = await admin
      .from('tree_members')
      .select('id')
      .eq('tree_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: true, alreadyJoined: true })
    }

    const { error } = await admin
      .from('tree_members')
      .insert({
        tree_id: params.id,
        user_id: user.id,
        role: 'viewer',
        invited_by: tree.owner_user_id,
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ ok: true, alreadyJoined: false })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? 'Не удалось присоединиться к дереву.' },
      { status: 500 }
    )
  }
}
