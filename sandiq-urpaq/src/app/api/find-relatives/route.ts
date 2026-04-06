import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lastName, birthYear, location, zhuz } = await req.json()

  const admin = createAdminClient() as any

  // Build fuzzy search query
  let query = admin
    .from('persons')
    .select(`
      id, first_name, last_name, birth_year, death_year,
      is_alive, location, zhuz, generation_num,
      family_tree_id,
      family_trees!inner(id, name, default_visibility, owner_user_id)
    `)
    .eq('family_trees.default_visibility', 'public') // Only public trees
    .neq('family_trees.owner_user_id', user.id)      // Not own trees
    .limit(20)

  if (lastName) {
    query = query.ilike('last_name', `%${lastName}%`)
  }

  if (birthYear) {
    query = query.gte('birth_year', birthYear - 5).lte('birth_year', birthYear + 5)
  }

  if (location) {
    query = query.ilike('location', `%${location.split(',')[0]}%`)
  }

  if (zhuz) {
    query = query.ilike('zhuz', `%${zhuz}%`)
  }

  const { data: matches, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Score matches by similarity
  const scored = (matches ?? []).map(person => {
    let score = 0
    if (lastName && person.last_name?.toLowerCase().includes(lastName.toLowerCase())) score += 40
    if (birthYear && person.birth_year && Math.abs(person.birth_year - birthYear) <= 2) score += 30
    if (location && person.location?.toLowerCase().includes(location.split(',')[0].toLowerCase())) score += 20
    if (zhuz && person.zhuz?.toLowerCase().includes(zhuz.toLowerCase())) score += 10
    return { ...person, score }
  }).sort((a, b) => b.score - a.score)

  return NextResponse.json({ matches: scored })
}
