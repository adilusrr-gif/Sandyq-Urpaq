'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const phone = formData.get('phone') as string
  const password = formData.get('password') as string
  
  const cleanPhone = phone?.replace(/\D/g, '') || ''
  
  if (cleanPhone.length < 10) {
    return { error: 'Введите корректный номер телефона' }
  }
  
  if (!password || password.length < 6) {
    return { error: 'Пароль должен быть не менее 6 символов' }
  }

  const email = `${cleanPhone}@example.com`

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Неверный телефон или пароль' }
    }
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const phone = formData.get('phone') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const birthYear = formData.get('birth_year') as string
  const tribeZhuz = formData.get('tribe_zhuz') as string
  
  const cleanPhone = phone?.replace(/\D/g, '') || ''
  
  if (!fullName || fullName.length < 2) {
    return { error: 'Введите ваше имя' }
  }
  
  if (cleanPhone.length < 10) {
    return { error: 'Введите корректный номер телефона' }
  }
  
  if (!password || password.length < 6) {
    return { error: 'Пароль должен быть не менее 6 символов' }
  }

  const email = `${cleanPhone}@example.com`

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: 'Этот номер телефона уже зарегистрирован' }
    }
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Не удалось создать аккаунт' }
  }

  // 2. Create profile
  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    full_name: fullName,
    phone,
    birth_year: birthYear ? parseInt(birthYear) : null,
    tribe_zhuz: tribeZhuz || null,
    paid_at: new Date().toISOString(), // Payment disabled
  })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    // Don't fail - profile might be created by trigger
  }

  redirect('/dashboard')
}
