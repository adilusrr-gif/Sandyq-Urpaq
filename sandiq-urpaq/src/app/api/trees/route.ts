import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils'
import { treeSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Не настроен service role ключ Supabase.' },
        { status: 500 }
      )
    }

    const supabase = createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Требуется вход в аккаунт.' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = treeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Некорректные данные дерева.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient() as any
    const invite_code = generateInviteCode()

    const { data: tree, error: treeError } = await admin
      .from('family_trees')
      .insert({
        owner_user_id: user.id,
        name: parsed.data.name.trim(),
        default_visibility: parsed.data.default_visibility,
        invite_code,
      })
      .select('*')
      .single()

    if (treeError || !tree) {
      throw treeError ?? new Error('Не удалось создать дерево.')
    }

    const { error: memberError } = await admin
      .from('tree_members')
      .insert({
        tree_id: tree.id,
        user_id: user.id,
        role: 'owner',
        invited_by: user.id,
      })

    if (memberError) {
      await admin.from('family_trees').delete().eq('id', tree.id)
      throw memberError
    }

    return NextResponse.json({ tree })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? 'Не удалось создать дерево.' },
      { status: 500 }
    )
  }
}
