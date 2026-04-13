import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatLifespan, getVisibilityLabel } from '@/lib/utils'
import MemoryTabs from '@/components/ancestor/MemoryTabs'
import AddMemoryButton from '@/components/ancestor/AddMemoryButton'

interface Props { params: { id: string } }

export default async function AncestorPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: person } = await supabase
    .from('persons')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!person) notFound()

  // Check tree access
  const { data: membership } = await supabase
    .from('tree_members')
    .select('role')
    .eq('tree_id', person.family_tree_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Fetch memories
  const { data: memories } = await supabase
    .from('memories')
    .select('*, author:users(full_name, avatar_url)')
    .eq('person_id', params.id)
    .order('created_at', { ascending: false })

  const canEdit = ['owner', 'admin', 'editor'].includes(membership.role)
  const emoji = !person.is_alive ? '👴' : person.user_id === user.id ? '⭐' : '👤'

  return (
    <div className="min-h-screen bg-parchment">
      {/* Back */}
      <div className="bg-parchment border-b border-gold/10 px-8 py-4">
        <a href={`/tree/${person.family_tree_id}`}
           className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30
                      hover:text-gold transition-colors flex items-center gap-2">
          ← Вернуться к дереву
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Profile header */}
        <div className="flex gap-8 items-start mb-10 pb-10 border-b border-gold/15">
          <div className="w-28 h-28 rounded-full flex items-center justify-center text-5xl flex-shrink-0
                          bg-gradient-to-br from-gold to-amber-400
                          shadow-[0_8px_32px_rgba(200,151,42,0.3)] border-4 border-parchment">
            {person.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.avatar_url} alt={person.first_name}
                   className="w-full h-full object-cover rounded-full" />
            ) : emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] tracking-[4px] uppercase text-gold mb-2">
              ✦ Поколение {person.generation_num < 0 ? `${Math.abs(person.generation_num)} назад` : `+${person.generation_num}`}
              {person.is_historical ? ' · Исторический' : ''}
            </div>
            <h1 className="font-display font-bold text-ink leading-tight mb-3"
                style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}>
              {person.first_name} {person.last_name}
            </h1>
            <p className="font-body italic text-ink/40 text-xl mb-4">
              {formatLifespan(person.birth_year, person.death_year, person.is_alive)}
            </p>

            <div className="flex flex-wrap gap-2">
              {person.location && (
                <span className="bg-white border border-gold/15 rounded-full px-3 py-1 font-body text-sm text-ink">
                  🗺️ {person.location}
                </span>
              )}
              {person.zhuz && (
                <span className="bg-white border border-gold/15 rounded-full px-3 py-1 font-body text-sm text-ink">
                  🏔️ {person.zhuz}
                </span>
              )}
              <span className="bg-white border border-gold/15 rounded-full px-3 py-1 font-body text-sm text-ink">
                🎙️ {memories?.filter(m => m.type === 'audio').length ?? 0} аудио
              </span>
              <span className="bg-white border border-gold/15 rounded-full px-3 py-1 font-body text-sm text-ink">
                📸 {memories?.filter(m => m.type === 'photo').length ?? 0} фото
              </span>
            </div>
          </div>
        </div>

        {/* Access level */}
        <div className="bg-gold/5 border border-gold/15 rounded-xl px-5 py-3 flex items-center
                        justify-between mb-8">
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase text-ink/30 mb-0.5">
              Уровень доступа
            </div>
            <div className="font-mono text-[11px] text-gold tracking-widest">
              {getVisibilityLabel(person.visibility)}
            </div>
          </div>
          {canEdit && (
            <button className="btn-secondary text-xs px-4 py-2">Изменить</button>
          )}
        </div>

        {/* Bio */}
        {person.bio && (
          <div className="mb-8">
            <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30 mb-4">
              История жизни
            </div>
            <div className="font-body text-ink text-xl leading-[2] italic">
              {person.bio}
            </div>
          </div>
        )}

        {/* Memories */}
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[10px] tracking-[3px] uppercase text-ink/30">
            Воспоминания ({memories?.length ?? 0})
          </div>
          {canEdit && <AddMemoryButton personId={person.id} />}
        </div>

        <MemoryTabs memories={memories ?? []} />
      </div>
    </div>
  )
}
