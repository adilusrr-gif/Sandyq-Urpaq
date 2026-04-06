import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

interface BioRequest {
  personId: string
  answers: Record<string, string>  // question_id → answer
  language: 'kk' | 'ru'
}

const SYSTEM_PROMPT = `Ты — опытный биограф и историк, специализирующийся на истории казахских семей.
Твоя задача — написать живую, тёплую, детальную биографию реального человека на основе ответов его потомков.

Правила:
- Пиши от третьего лица, уважительно и тепло
- Используй исторический контекст эпохи (советский период, война, степь)
- Добавляй детали быта, традиций, природы Казахстана
- Длина: 300-500 слов
- Структура: детство → молодость → семья → достижения → наследие
- Заканчивай вдохновляющим выводом о вкладе человека в семью
- Не выдумывай факты — работай только с предоставленными данными
- Если данных мало — пиши о типичной жизни той эпохи с оговоркой`

const SYSTEM_PROMPT_KK = `Сен — қазақ отбасыларының тарихына маманданған тәжірибелі өмірбаяншы және тарихшысын.
Міндетің — ұрпақтарының жауаптары негізінде нақты адамның жылы, мәнерлі өмірбаянын жазу.

Ережелер:
- Үшінші жақтан, құрметпен және жылылықпен жаз
- Дәуірдің тарихи контекстін қолдан (кеңес кезеңі, соғыс, дала)
- Қазақстан тұрмысы мен дәстүрлерін қос
- Көлемі: 300-500 сөз
- Берілген мәліметтермен ғана жұмыс жаса`

export async function POST(req: NextRequest) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: BioRequest = await req.json()
  const { personId, answers, language } = body

  // Fetch person data
  const { data: person } = await supabase
    .from('persons')
    .select('*')
    .eq('id', personId)
    .single()

  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 })

  // Build context from answers
  const answerText = Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([q, a]) => `${QUESTIONS.find(x => x.id === q)?.label ?? q}: ${a}`)
    .join('\n')

  const prompt = language === 'kk'
    ? `Адам туралы мәліметтер:
Аты-жөні: ${person.first_name} ${person.last_name}
Туылған жылы: ${person.birth_year ?? 'белгісіз'}
${person.death_year ? `Қайтыс болған жылы: ${person.death_year}` : ''}
Туған жері: ${person.location ?? 'белгісіз'}
Руы/жүзі: ${person.zhuz ?? 'белгісіз'}

Ұрпақтарының жауаптары:
${answerText || 'Мәліметтер жоқ'}

Осы мәліметтер негізінде өмірбаян жаз.`
    : `Данные о человеке:
Имя: ${person.first_name} ${person.last_name}
Год рождения: ${person.birth_year ?? 'неизвестно'}
${person.death_year ? `Год смерти: ${person.death_year}` : ''}
Место рождения: ${person.location ?? 'неизвестно'}
Жуз/племя: ${person.zhuz ?? 'неизвестно'}

Ответы потомков:
${answerText || 'Данных нет'}

Напиши биографию на основе этих данных.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: language === 'kk' ? SYSTEM_PROMPT_KK : SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.75,
      }),
    })

    const data = await response.json()
    const biography = data.choices?.[0]?.message?.content

    if (!biography) throw new Error('Empty response from AI')

    // Save as memory
    const { data: memory } = await supabase.from('memories').insert({
      person_id: personId,
      added_by_user_id: user.id,
      type: 'story',
      text_content: biography,
      title: `AI-биография · ${person.first_name} ${person.last_name}`,
      language,
      visibility: 'family',
      is_ai_dataset: false,
      moderation_status: 'approved',
    }).select().single()

    return NextResponse.json({ biography, memoryId: memory?.id })
  } catch (err: any) {
    console.error('AI bio error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Questions used by the AI assistant
const QUESTIONS = [
  { id: 'childhood', label: 'Расскажите о детстве этого человека', placeholder: 'Где вырос, как прошло детство, в какой семье...' },
  { id: 'work', label: 'Чем занимался в жизни, какая была профессия', placeholder: 'Пастух, учитель, колхозник, военный...' },
  { id: 'family', label: 'Расскажите о его/её семье', placeholder: 'Сколько детей, как звали супруга(у), жили дружно...' },
  { id: 'character', label: 'Каким человеком был? Черты характера', placeholder: 'Добрый, строгий, весёлый, мудрый...' },
  { id: 'hardship', label: 'Какие трудности пережил в жизни', placeholder: 'Война, голод, переезды, болезни...' },
  { id: 'wisdom', label: 'Какую мудрость или слова вы помните', placeholder: 'Любимые пословицы, наставления детям...' },
  { id: 'legacy', label: 'Что он/она оставил(а) после себя', placeholder: 'Дом, сад, ремесло, традиции, воспитал детей...' },
]
