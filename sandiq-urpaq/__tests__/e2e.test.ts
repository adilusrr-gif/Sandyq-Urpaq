/**
 * Сандық Ұрпақ — E2E Tests
 * Запуск: npx jest __tests__/e2e.test.ts
 * Или: npx playwright test (если используете Playwright)
 *
 * Эти тесты покрывают критические пути пользователя
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── TEST UTILS ──────────────────────────────

const testUser = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  fullName: 'Тест Пользователь',
}

let userId: string
let treeId: string
let personId: string

// ── SUITE 1: AUTH ───────────────────────────

describe('Authentication', () => {
  test('Register new user', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: { data: { full_name: testUser.fullName } },
    })
    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
    userId = data.user!.id

    // Create profile
    await supabase.from('users').insert({
      id: userId,
      full_name: testUser.fullName,
      phone: '+77001234567',
    })
  })

  test('Login with credentials', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    })
    expect(error).toBeNull()
    expect(data.session).toBeTruthy()
  })

  test('Get user profile', async () => {
    const { data, error } = await supabase
      .from('users').select('*').eq('id', userId).single()
    expect(error).toBeNull()
    expect(data?.full_name).toBe(testUser.fullName)
  })
})

// ── SUITE 2: FAMILY TREE ────────────────────

describe('Family Tree', () => {
  test('Create family tree', async () => {
    const { data, error } = await supabase.from('family_trees').insert({
      owner_user_id: userId,
      name: 'Тестовое дерево',
      default_visibility: 'family',
      invite_code: 'TESTCODE1',
    }).select().single()

    expect(error).toBeNull()
    expect(data?.name).toBe('Тестовое дерево')
    treeId = data!.id

    // Add owner as member
    await supabase.from('tree_members').insert({
      tree_id: treeId,
      user_id: userId,
      role: 'owner',
      invited_by: userId,
    })
  })

  test('Add person to tree', async () => {
    const { data, error } = await supabase.from('persons').insert({
      first_name: 'Ахмет',
      last_name: 'Сейтов',
      birth_year: 1905,
      death_year: 1978,
      is_alive: false,
      is_historical: true,
      family_tree_id: treeId,
      added_by_user_id: userId,
      generation_num: -2,
      visibility: 'family',
      location: 'Семей, Казахстан',
    }).select().single()

    expect(error).toBeNull()
    expect(data?.first_name).toBe('Ахмет')
    personId = data!.id
  })

  test('Tree stats updated after adding person', async () => {
    // Wait for trigger
    await new Promise(r => setTimeout(r, 500))
    const { data } = await supabase
      .from('family_trees').select('total_persons').eq('id', treeId).single()
    expect(data?.total_persons).toBeGreaterThan(0)
  })

  test('Add relationship between persons', async () => {
    // Add self node first
    const { data: self } = await supabase.from('persons').insert({
      first_name: 'Тест',
      last_name: 'Тестов',
      birth_year: 1990,
      is_alive: true,
      family_tree_id: treeId,
      added_by_user_id: userId,
      generation_num: 0,
      visibility: 'family',
    }).select().single()

    const { error } = await supabase.from('relationships').insert({
      from_person_id: personId,
      to_person_id: self!.id,
      type: 'parent_of',
      status: 'confirmed',
      confirmed_by: userId,
    })
    expect(error).toBeNull()
  })
})

// ── SUITE 3: MEMORIES ───────────────────────

describe('Memories', () => {
  test('Add text memory', async () => {
    const { data, error } = await supabase.from('memories').insert({
      person_id: personId,
      added_by_user_id: userId,
      type: 'story',
      text_content: 'Это тестовая история о предке.',
      title: 'Тестовая история',
      language: 'ru',
      visibility: 'family',
      is_ai_dataset: false,
      moderation_status: 'approved',
    }).select().single()

    expect(error).toBeNull()
    expect(data?.type).toBe('story')
  })

  test('Fetch memories for person', async () => {
    const { data, error } = await supabase
      .from('memories').select('*').eq('person_id', personId)
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })
})

// ── SUITE 4: API ENDPOINTS ──────────────────

describe('API Endpoints', () => {
  test('Health check returns 200', async () => {
    const res = await fetch(`${APP_URL}/api/health`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('healthy')
  })

  test('Unauthorized requests return 401', async () => {
    const res = await fetch(`${APP_URL}/api/certificate`, { method: 'POST' })
    expect(res.status).toBe(401)
  })

  test('AI bio endpoint validates request', async () => {
    const res = await fetch(`${APP_URL}/api/ai-bio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401) // No auth
  })
})

// ── SUITE 5: RLS SECURITY ───────────────────

describe('Row Level Security', () => {
  test('Cannot access other users data', async () => {
    // Sign out current user
    await supabase.auth.signOut()

    // Try to read private data without auth
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('person_id', personId)

    // Should return empty or error due to RLS
    expect(data?.length ?? 0).toBe(0)
  })
})

// ── CLEANUP ─────────────────────────────────

afterAll(async () => {
  // Clean up test data
  if (userId) {
    const adminClient = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.from('family_trees').delete().eq('id', treeId)
    await adminClient.from('users').delete().eq('id', userId)
    await adminClient.auth.admin.deleteUser(userId)
  }
})
