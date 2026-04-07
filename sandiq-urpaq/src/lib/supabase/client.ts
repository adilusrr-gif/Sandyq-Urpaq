import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Return singleton instance to prevent multiple clients
  if (client) return client
  
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Enable session persistence across browser restarts
        persistSession: true,
        // Auto refresh tokens before they expire
        autoRefreshToken: true,
        // Detect session from URL (for OAuth flows)
        detectSessionInUrl: true,
        // Storage key for session
        storageKey: 'sandyq-auth',
      },
    }
  )
  
  return client
}
