import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import TreeCanvas from '@/components/tree/TreeCanvas'
import TreeSidebar from '@/components/tree/TreeSidebar'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { TreeRole } from '@/types'

interface Props {
  params: { id: string }
  searchParams: { added?: string }
}

export default async function TreePage({ params, searchParams }: Props) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const source = (process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase) as any
  const { data: tree } = await source
    .from('family_trees')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!tree) notFound()

  const { data: membership } = await source
    .from('tree_members')
    .select('role')
    .eq('tree_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const userRole: TreeRole | null = membership?.role ?? (tree.owner_user_id === user.id ? 'owner' : null)
  if (!userRole) redirect('/dashboard')

  const { data: persons } = await source
    .from('persons')
    .select('*')
    .eq('family_tree_id', params.id)
    .order('generation_num', { ascending: true })
    .order('birth_year', { ascending: true })

  return (
    <div className="min-h-screen bg-parchment flex">
      <TreeSidebar
        tree={tree}
        persons={persons ?? []}
        userRole={userRole}
        userId={user.id}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        {searchParams.added === 'self' && (
          <div className="border-b border-gold/15 bg-gold/8 px-6 py-4 text-ink">
            <div className="font-mono text-[10px] tracking-[3px] uppercase text-gold mb-1">
              Отличное начало
            </div>
            <p className="font-body text-base text-ink/70">
              Вы добавили корневой профиль. Теперь можно продолжить с родителями и старшими поколениями.
            </p>
          </div>
        )}

        <TreeCanvas
          tree={tree}
          persons={persons ?? []}
          relationships={[]}
          userRole={userRole}
          userId={user.id}
        />

        <div className="border-t border-gold/10 bg-white/70 px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 mb-1">
                Совместная работа с семьёй
              </div>
              <p className="font-body text-base text-ink/60">
                Код приглашения: <span className="font-mono text-gold tracking-[0.25em]">{tree.invite_code}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/join/${tree.invite_code}`} className="btn-secondary text-xs px-5 py-3 text-center">
                Проверить invite-ссылку
              </Link>
              <Link href={`/tree/${tree.id}/map`} className="btn-primary text-xs px-5 py-3 text-center">
                Открыть карту происхождения
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
