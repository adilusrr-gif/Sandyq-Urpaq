import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import JoinTreeClient from './JoinTreeClient'

interface Props { params: { code: string } }

export default async function JoinPage({ params }: Props) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  const source = (process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase) as any
  const { data: tree } = await source
    .from('family_trees')
    .select('id, name, total_persons, generations_count, owner_user_id, invite_code')
    .eq('invite_code', params.code.toUpperCase())
    .single()

  if (!tree) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-center px-4">
        <div>
          <div className="text-5xl mb-4">❌</div>
          <h1 className="font-display font-bold text-parchment text-3xl mb-3">
            Ссылка недействительна
          </h1>
          <p className="font-body italic text-parchment/40 text-lg">
            Попросите родственника прислать новую ссылку
          </p>
        </div>
      </div>
    )
  }

  const { data: owner } = await source
    .from('users')
    .select('full_name')
    .eq('id', tree.owner_user_id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <JoinTreeClient
        tree={{ ...tree, ownerName: owner?.full_name ?? 'Семья' }}
        user={user}
        inviteCode={params.code}
      />
    </div>
  )
}
