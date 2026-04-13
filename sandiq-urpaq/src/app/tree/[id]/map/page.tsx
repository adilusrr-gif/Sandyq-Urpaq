import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OriginMap from '@/components/tree/OriginMap'
import Link from 'next/link'

interface Props { params: { id: string } }

export default async function TreeMapPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tree } = await supabase
    .from('family_trees').select('*').eq('id', params.id).single()

  if (!tree) redirect('/dashboard')

  // Check membership
  const { data: member } = await supabase
    .from('tree_members').select('role')
    .eq('tree_id', params.id).eq('user_id', user.id).single()

  if (!member) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-parchment">
      {/* Nav */}
      <div className="bg-parchment border-b border-gold/10 px-8 py-4 flex items-center gap-4">
        <Link href={`/tree/${params.id}`}
              className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 hover:text-gold transition-colors">
          ← Дерево
        </Link>
        <div className="h-4 w-px bg-ink/10" />
        <div>
          <span className="font-mono text-[10px] text-ink/30 tracking-widest uppercase">Карта происхождения</span>
          <span className="font-body italic text-ink/40 text-sm ml-2">— {tree.name}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <OriginMap />
      </div>
    </div>
  )
}
