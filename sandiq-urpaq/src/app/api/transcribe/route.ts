import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const memoryId = formData.get('memory_id') as string
    const language = (formData.get('language') as string) ?? 'kk'

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Send to OpenAI Whisper
    const whisperForm = new FormData()
    whisperForm.append('file', file)
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', language)
    whisperForm.append('response_format', 'verbose_json')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.text()
      throw new Error(`Whisper error: ${err}`)
    }

    const result = await whisperRes.json()
    const transcript = result.text

    // Save transcript to memory
    if (memoryId) {
      await supabase
        .from('memories')
        .update({ transcript, moderation_status: 'approved' })
        .eq('id', memoryId)
    }

    return NextResponse.json({ transcript, duration: result.duration })
  } catch (err: any) {
    console.error('Transcription error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
