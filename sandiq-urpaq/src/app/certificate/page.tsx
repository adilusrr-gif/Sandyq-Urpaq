import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CertificateClient from './CertificateClient'

export default async function CertificatePage() {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single()

  if (!profile?.paid_at) redirect('/dashboard')

  return <CertificateClient profile={profile} />
}
