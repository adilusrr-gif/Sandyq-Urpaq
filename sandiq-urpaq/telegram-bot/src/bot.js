require('dotenv').config()
const { Bot, InlineKeyboard, Keyboard } = require('grammy')
const { createClient } = require('@supabase/supabase-js')

// ═══════════════════════════════════════════
// САНДЫҚ ҰРПАҚ — Telegram Bot
// Grammy.js + Supabase
// ═══════════════════════════════════════════

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.APP_URL ?? 'https://sandiq.kz'

// ── HELPERS ─────────────────────────────────

async function getOrCreateUser(ctx) {
  const tgId = ctx.from.id.toString()
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tgId)
    .single()
  return user
}

function mainKeyboard(isPaid = false) {
  return new Keyboard()
    .text('🌳 Моё дерево').text('👴 Предки').row()
    .text('🎙️ Записать голос').text('📸 Добавить фото').row()
    .text(isPaid ? '🏅 Мой сертификат' : '💳 Оплатить 500 ₸').text('❓ Помощь').row()
    .resized()
}

// ── /start ───────────────────────────────────

bot.command('start', async (ctx) => {
  const user = await getOrCreateUser(ctx)
  const inviteCode = ctx.match // /start INVITE_CODE

  if (!user) {
    await ctx.reply(
      `🌾 *Сәлеметсіз бе!*\n\nДобро пожаловать в *Сандық Ұрпақ* — первую народную цифровую память Казахстана.\n\n` +
      `Сохраните голос своего атасы. Создайте родословную семьи.\n\n` +
      `_«Жеті атаңды біл»_`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🌟 Зарегистрироваться', 'register')
          .row()
          .url('🌐 Открыть сайт', APP_URL),
      }
    )
    return
  }

  const isPaid = !!user.paid_at

  // Handle invite code
  if (inviteCode && inviteCode.length > 5) {
    await ctx.reply(
      `🌳 Вас пригласили в семейное дерево!\nПерейдите по ссылке: ${APP_URL}/join/${inviteCode}`
    )
    return
  }

  await ctx.reply(
    `🌾 С возвращением, *${user.full_name}*!\n\n` +
    (isPaid
      ? `🏅 Хранитель #${user.participant_num?.toLocaleString('ru')}`
      : `⚠️ Необходима оплата 500 ₸ для доступа ко всем функциям`),
    {
      parse_mode: 'Markdown',
      reply_markup: mainKeyboard(isPaid),
    }
  )
})

// ── REGISTRATION ─────────────────────────────

bot.callbackQuery('register', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.reply(
    `📝 *Регистрация*\n\nОтправьте ваше полное имя (ФИО):`,
    { parse_mode: 'Markdown' }
  )
  // Set state
  userStates.set(ctx.from.id, { step: 'awaiting_name' })
})

// ── STATE MACHINE ────────────────────────────

const userStates = new Map()

bot.on('message:text', async (ctx) => {
  const state = userStates.get(ctx.from.id)
  const tgId = ctx.from.id.toString()

  // ─ Step: awaiting name
  if (state?.step === 'awaiting_name') {
    const fullName = ctx.message.text.trim()
    if (fullName.length < 2) {
      await ctx.reply('Имя слишком короткое. Попробуйте ещё раз:')
      return
    }

    // Create user in Supabase
    const { data: newUser, error } = await supabase.from('users').insert({
      id: `tg_${tgId}_${Date.now()}`, // temp id until auth
      telegram_id: tgId,
      full_name: fullName,
    }).select().single()

    if (error) {
      await ctx.reply('Ошибка регистрации. Попробуйте позже.')
      userStates.delete(ctx.from.id)
      return
    }

    userStates.set(ctx.from.id, { step: 'awaiting_zhuz', userId: newUser.id })
    await ctx.reply(
      `✅ Имя сохранено!\n\nТеперь укажите ваш жуз или регион (необязательно, нажмите /skip):`,
    )
    return
  }

  // ─ Step: awaiting zhuz
  if (state?.step === 'awaiting_zhuz') {
    const zhuz = ctx.message.text.trim()
    await supabase.from('users').update({ tribe_zhuz: zhuz }).eq('id', state.userId)
    userStates.set(ctx.from.id, { step: 'awaiting_payment', userId: state.userId })
    await sendPaymentMessage(ctx)
    return
  }

  // ─ Step: adding ancestor name
  if (state?.step === 'adding_ancestor') {
    const name = ctx.message.text.trim().split(' ')
    const firstName = name[0]
    const lastName = name.slice(1).join(' ') || '—'

    userStates.set(ctx.from.id, {
      ...state,
      step: 'adding_ancestor_years',
      firstName,
      lastName,
    })

    await ctx.reply(`👴 *${firstName} ${lastName}*\n\nВведите годы жизни (например: 1905-1978)\nИли /skip если неизвестно:`,
      { parse_mode: 'Markdown' })
    return
  }

  // ─ Step: ancestor years
  if (state?.step === 'adding_ancestor_years') {
    let birthYear = null, deathYear = null
    const match = ctx.message.text.match(/(\d{4})\s*[-–]\s*(\d{4})?/)
    if (match) {
      birthYear = parseInt(match[1])
      if (match[2]) deathYear = parseInt(match[2])
    }

    const user = await getOrCreateUser(ctx)
    if (!user || !state.treeId) {
      await ctx.reply('Ошибка. Начните заново: /start')
      userStates.delete(ctx.from.id)
      return
    }

    await supabase.from('persons').insert({
      first_name: state.firstName,
      last_name: state.lastName,
      birth_year: birthYear,
      death_year: deathYear,
      is_alive: !deathYear,
      is_historical: true,
      family_tree_id: state.treeId,
      added_by_user_id: user.id,
      generation_num: state.generation ?? -1,
      visibility: 'family',
    })

    userStates.delete(ctx.from.id)
    await ctx.reply(
      `✅ *${state.firstName} ${state.lastName}* добавлен(а) в дерево!\n\nПолное дерево: ${APP_URL}/tree/${state.treeId}`,
      {
        parse_mode: 'Markdown',
        reply_markup: mainKeyboard(true),
      }
    )
    return
  }

  // ─ Default: handle menu buttons
  await handleMenuText(ctx, state)
})

async function handleMenuText(ctx, state) {
  const text = ctx.message.text
  const user = await getOrCreateUser(ctx)
  const isPaid = !!user?.paid_at

  if (text === '🌳 Моё дерево') {
    if (!isPaid) { await sendPaymentMessage(ctx); return }
    const { data: trees } = await supabase
      .from('family_trees')
      .select('*')
      .eq('owner_user_id', user.id)
      .limit(5)

    if (!trees?.length) {
      await ctx.reply(
        '🌱 У вас ещё нет деревьев.\n\nСоздайте первое на сайте:',
        {
          reply_markup: new InlineKeyboard()
            .url('🌳 Создать дерево', `${APP_URL}/tree/new`),
        }
      )
      return
    }

    const keyboard = new InlineKeyboard()
    trees.forEach(t => keyboard.url(`🌳 ${t.name}`, `${APP_URL}/tree/${t.id}`).row())

    await ctx.reply(
      `*Ваши деревья:*\n\n${trees.map(t =>
        `🌳 *${t.name}*\n${t.total_persons} предков · ${t.generations_count} поколений`
      ).join('\n\n')}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    )
    return
  }

  if (text === '👴 Предки') {
    if (!isPaid) { await sendPaymentMessage(ctx); return }
    await ctx.reply(
      '👴 Для управления предками перейдите на сайт:',
      {
        reply_markup: new InlineKeyboard()
          .url('🌳 Открыть дерево', `${APP_URL}/dashboard`),
      }
    )
    return
  }

  if (text === '🎙️ Записать голос') {
    if (!isPaid) { await sendPaymentMessage(ctx); return }
    await ctx.reply(
      '🎙️ *Записать голосовое воспоминание*\n\n' +
      'Отправьте голосовое сообщение прямо сейчас.\n' +
      'ИИ автоматически транскрибирует его на казахском языке.\n\n' +
      '_Расскажите историю своего предка..._',
      { parse_mode: 'Markdown' }
    )
    userStates.set(ctx.from.id, { step: 'awaiting_voice', userId: user.id })
    return
  }

  if (text === '📸 Добавить фото') {
    if (!isPaid) { await sendPaymentMessage(ctx); return }
    await ctx.reply(
      '📸 Отправьте фото предка прямо сейчас.\n\n' +
      'После загрузки вы сможете привязать его к конкретному человеку в дереве.',
    )
    userStates.set(ctx.from.id, { step: 'awaiting_photo', userId: user.id })
    return
  }

  if (text === '🏅 Мой сертификат') {
    await ctx.reply(
      `🏅 *Хранитель #${user.participant_num?.toLocaleString('ru')}*\n\n*${user.full_name}*\n\nСкачайте сертификат:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .url('🏅 Открыть сертификат', `${APP_URL}/certificate`),
      }
    )
    return
  }

  if (text === '💳 Оплатить 500 ₸') {
    await sendPaymentMessage(ctx)
    return
  }

  if (text === '❓ Помощь') {
    await ctx.reply(
      '*Сандық Ұрпақ — Справка*\n\n' +
      '🌳 *Моё дерево* — создать и управлять родословной\n' +
      '👴 *Предки* — список предков в дереве\n' +
      '🎙️ *Записать голос* — добавить аудио воспоминание\n' +
      '📸 *Фото* — загрузить историческое фото\n' +
      '🏅 *Сертификат* — ваш уникальный номер хранителя\n\n' +
      `Поддержка: @sandiq_support\nСайт: ${APP_URL}`,
      { parse_mode: 'Markdown' }
    )
    return
  }
}

// ── VOICE MESSAGES ───────────────────────────

bot.on('message:voice', async (ctx) => {
  const state = userStates.get(ctx.from.id)
  const user = await getOrCreateUser(ctx)

  if (!user?.paid_at) { await sendPaymentMessage(ctx); return }

  await ctx.reply('🎙️ Получено! Транскрибируем...')

  try {
    // Get file from Telegram
    const fileId = ctx.message.voice.file_id
    const file = await ctx.getFile()
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`

    // Download audio
    const audioRes = await fetch(fileUrl)
    const audioBuffer = await audioRes.arrayBuffer()

    // Upload to Supabase Storage
    const fileName = `memories/tg_${ctx.from.id}_${Date.now()}.ogg`
    const { data: uploaded } = await supabase.storage
      .from('memories')
      .upload(fileName, audioBuffer, { contentType: 'audio/ogg' })

    const { data: { publicUrl } } = supabase.storage
      .from('memories').getPublicUrl(fileName)

    // Get trees for user
    const { data: trees } = await supabase
      .from('family_trees')
      .select('id, name')
      .eq('owner_user_id', user.id)
      .limit(5)

    if (!trees?.length) {
      await ctx.reply(`✅ Аудио загружено! Создайте дерево чтобы привязать запись: ${APP_URL}/tree/new`)
      return
    }

    // Ask which person
    const keyboard = new InlineKeyboard()
    trees.forEach(t => keyboard.text(`🌳 ${t.name}`, `attach_audio:${t.id}:${fileName}`).row())

    userStates.set(ctx.from.id, { step: 'attaching_audio', audioUrl: publicUrl, userId: user.id })

    await ctx.reply(
      '✅ Аудио загружено!\n\nК какому дереву привязать запись?',
      { reply_markup: keyboard }
    )
  } catch (err) {
    await ctx.reply('Ошибка загрузки. Попробуйте ещё раз.')
    console.error(err)
  }
})

// ── PHOTOS ───────────────────────────────────

bot.on('message:photo', async (ctx) => {
  const user = await getOrCreateUser(ctx)
  if (!user?.paid_at) { await sendPaymentMessage(ctx); return }

  await ctx.reply('📸 Фото получено! Загружаем...')

  try {
    const photo = ctx.message.photo.at(-1) // highest quality
    const file = await ctx.getFile()
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`

    const photoRes = await fetch(fileUrl)
    const photoBuffer = await photoRes.arrayBuffer()

    const fileName = `memories/tg_photo_${ctx.from.id}_${Date.now()}.jpg`
    await supabase.storage.from('memories').upload(fileName, photoBuffer, {
      contentType: 'image/jpeg',
    })

    const { data: { publicUrl } } = supabase.storage.from('memories').getPublicUrl(fileName)

    await ctx.reply(
      `✅ Фото загружено!\n\nПривяжите его к предку на сайте: ${APP_URL}/dashboard`,
      {
        reply_markup: new InlineKeyboard()
          .url('📸 Привязать фото', `${APP_URL}/dashboard`),
      }
    )
  } catch (err) {
    await ctx.reply('Ошибка загрузки фото.')
    console.error(err)
  }
})

// ── /skip command ────────────────────────────

bot.command('skip', async (ctx) => {
  const state = userStates.get(ctx.from.id)
  if (state?.step === 'awaiting_zhuz') {
    userStates.set(ctx.from.id, { step: 'awaiting_payment', userId: state.userId })
    await sendPaymentMessage(ctx)
  } else if (state?.step === 'adding_ancestor_years') {
    // Skip years — save without dates
    const user = await getOrCreateUser(ctx)
    await supabase.from('persons').insert({
      first_name: state.firstName,
      last_name: state.lastName,
      is_alive: false,
      is_historical: true,
      family_tree_id: state.treeId,
      added_by_user_id: user.id,
      generation_num: state.generation ?? -1,
      visibility: 'family',
    })
    userStates.delete(ctx.from.id)
    await ctx.reply(`✅ *${state.firstName}* добавлен(а)!`, { parse_mode: 'Markdown', reply_markup: mainKeyboard(true) })
  }
})

// ── PAYMENT MESSAGE ──────────────────────────

async function sendPaymentMessage(ctx) {
  await ctx.reply(
    '💳 *Стать хранителем культуры*\n\n' +
    'Стоимость: *500 тенге* (один раз, навсегда)\n\n' +
    'После оплаты вы получите:\n' +
    '✅ Доступ ко всем функциям\n' +
    '✅ Уникальный AI-сертификат\n' +
    '✅ Номер хранителя в истории Казахстана\n' +
    '✅ Возможность создать родословную семьи',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .url('💳 Оплатить через Kaspi', `${process.env.APP_URL}/api/payment/kaspi`)
        .row()
        .url('🌐 Открыть сайт', process.env.APP_URL),
    }
  )
}

// ── START BOT ────────────────────────────────

bot.catch((err) => console.error('Bot error:', err))

bot.start({
  onStart: () => console.log('🤖 Сандық Ұрпақ bot started'),
})

console.log('Starting bot...')
