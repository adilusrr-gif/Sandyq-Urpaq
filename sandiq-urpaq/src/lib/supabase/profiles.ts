import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from './database.types'

function getEmailName(email?: string | null) {
  return email?.split('@')[0]?.trim() || 'Хранитель'
}

export function buildUserProfileSeed(user: User): Database['public']['Tables']['users']['Insert'] {
  const fullName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : getEmailName(user.email)

  const tribe =
    typeof user.user_metadata?.tribe_zhuz === 'string' && user.user_metadata.tribe_zhuz.trim()
      ? user.user_metadata.tribe_zhuz.trim()
      : null

  return {
    id: user.id,
    full_name: fullName,
    tribe_zhuz: tribe,
  }
}

export async function ensureUserProfile(
  client: SupabaseClient<Database>,
  user: User
) {
  const payload = buildUserProfileSeed(user)

  const { error: upsertError } = await client
    .from('users')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })

  if (upsertError && upsertError.code !== '23505') {
    throw upsertError
  }

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  return profile
}
