import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile?.paid_at) return NextResponse.json({ error: 'Payment required' }, { status: 402 })

  try {
    // Generate certificate image via DALL-E
    const prompt = `
      A beautiful, ornate certificate in traditional Kazakh style.
      Featuring:
      - Intricate geometric patterns from Kazakh traditional art (шаршы, өрнек)
      - Warm gold and deep navy color palette on parchment background
      - Central circular seal with a golden sun symbol (Kazakh flag motif)
      - The number #${profile.participant_num} prominently displayed
      - Elegant calligraphy-style typography
      - No text, only decorative patterns and the number
      - Museum-quality illustration, highly detailed
    `

    const imageRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    })

    const imageData = await imageRes.json()
    const imageUrl = imageData.data?.[0]?.url

    // Download and store in Supabase Storage
    if (imageUrl) {
      const imgRes = await fetch(imageUrl)
      const imgBuffer = await imgRes.arrayBuffer()
      const admin = createAdminClient() as any
      const fileName = `certificates/${user.id}.png`
      await admin.storage.from('certificates').upload(fileName, imgBuffer, {
        contentType: 'image/png',
        upsert: true,
      })
      const { data: { publicUrl } } = admin.storage.from('certificates').getPublicUrl(fileName)
      return NextResponse.json({ imageUrl: publicUrl })
    }

    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
