import { z } from 'zod'

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Минимум 2 символа').max(100),
  phone: z.string().regex(/^\+7\d{10}$/, 'Формат: +77001234567'),
  birth_year: z.number().min(1900).max(new Date().getFullYear()).optional(),
  tribe_zhuz: z.string().max(100).optional(),
  password: z.string().min(8, 'Минимум 8 символов'),
})

export const loginSchema = z.object({
  phone: z.string().min(1, 'Введите номер телефона'),
  password: z.string().min(1, 'Введите пароль'),
})

export const personSchema = z.object({
  first_name: z.string().min(1, 'Введите имя').max(100),
  last_name: z.string().min(1, 'Введите фамилию').max(100),
  birth_year: z.number().min(1700).max(new Date().getFullYear()).optional().nullable(),
  death_year: z.number().min(1700).max(new Date().getFullYear()).optional().nullable(),
  is_alive: z.boolean().default(true),
  is_historical: z.boolean().default(false),
  visibility: z.enum(['private', 'family', 'public']).default('family'),
  bio: z.string().max(50000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  zhuz: z.string().max(100).optional().nullable(),
})

export const memorySchema = z.object({
  type: z.enum(['audio', 'photo', 'video', 'story', 'tradition', 'recipe', 'document', 'location']),
  title: z.string().max(200).optional().nullable(),
  text_content: z.string().max(50000).optional().nullable(),
  visibility: z.enum(['private', 'family', 'public', 'ai_only']).default('family'),
  is_ai_dataset: z.boolean().default(false),
  language: z.string().default('kk'),
})

export const treeSchema = z.object({
  name: z.string().min(2, 'Введите название').max(200),
  default_visibility: z.enum(['private', 'family', 'public']).default('family'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PersonInput = z.infer<typeof personSchema>
export type MemoryInput = z.infer<typeof memorySchema>
export type TreeInput = z.infer<typeof treeSchema>
