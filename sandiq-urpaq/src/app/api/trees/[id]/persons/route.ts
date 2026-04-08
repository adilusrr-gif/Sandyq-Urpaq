import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/supabase/profiles'
import { personSchema } from '@/lib/validations'

const createPersonSchema = personSchema.extend({
  generation_num: z.number().int().min(-32).max(32),
  link_self: z.boolean().optional(),
})

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

    const supabase = createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Требуется вход в аккаунт.' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createPersonSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Некорректные данные человека.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient() as any
    await ensureUserProfile(admin, user)
    const { data: tree } = await admin
      .from('family_trees')
      .select('id, owner_user_id')
      .eq('id', params.id)
      .single()

    if (!tree) {
      return NextResponse.json({ error: 'Дерево не найдено.' }, { status: 404 })
    }

    const { data: membership } = await admin
      .from('tree_members')
      .select('role')
      .eq('tree_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    const userRole = membership?.role ?? (tree.owner_user_id === user.id ? 'owner' : null)

    if (!userRole || !['owner', 'admin', 'editor'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для добавления человека в дерево.' },
        { status: 403 }
      )
    }

    const { generation_num, link_self = false, ...payload } = parsed.data
    const { data: person, error: personError } = await admin
      .from('persons')
      .insert({
        ...payload,
        family_tree_id: params.id,
        added_by_user_id: user.id,
        generation_num,
      })
      .select('*')
      .single()

    if (personError || !person) {
      throw personError ?? new Error('Не удалось сохранить человека.')
    }

    if (link_self) {
      await admin.from('persons').update({ user_id: user.id }).eq('id', person.id)

      if (membership) {
        await admin
          .from('tree_members')
          .update({ linked_person_id: person.id })
          .eq('tree_id', params.id)
          .eq('user_id', user.id)
      } else {
        await admin.from('tree_members').upsert({
          tree_id: params.id,
          user_id: user.id,
          role: 'owner',
          invited_by: user.id,
          linked_person_id: person.id,
        }, { onConflict: 'tree_id,user_id', ignoreDuplicates: true })
      }
    }

    return NextResponse.json({ person })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? 'Не удалось добавить человека.' },
      { status: 500 }
    )
  }
}
