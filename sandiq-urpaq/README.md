# 🌳 Сандық Ұрпақ — Цифровое Поколение

Первая народная цифровая память Казахстана. Сохраните историю своей семьи.

---

## 🚀 Запуск за 5 минут

### 1. Установить зависимости
```bash
npm install
```

### 2. Настроить Supabase
1. Зайдите на [supabase.com](https://supabase.com) → New Project
2. Скопируйте `URL` и `anon key` из **Settings → API**
3. Запустите SQL-схему: **SQL Editor** → вставьте содержимое `supabase/migrations/001_initial.sql` → Run
4. Создайте Storage buckets: **Storage** → New bucket:
   - `memories` (private)
   - `avatars` (public)
   - `certificates` (public)

### 3. Переменные окружения
```bash
cp .env.local.example .env.local
```
Заполните `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Запустить
```bash
npm run dev
```
Откройте [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Структура проекта

```
src/
├── app/
│   ├── page.tsx                  # Лендинг
│   ├── (auth)/
│   │   ├── login/page.tsx        # Вход
│   │   └── register/page.tsx     # Регистрация
│   ├── dashboard/page.tsx        # Панель управления
│   ├── tree/[id]/page.tsx        # Семейное дерево
│   ├── ancestor/[id]/page.tsx    # Профиль предка
│   └── api/
│       ├── auth/logout/          # Выход
│       ├── transcribe/           # Whisper транскрипция
│       └── certificate/          # Генерация сертификата
├── components/
│   ├── tree/
│   │   ├── TreeCanvas.tsx        # Визуальное дерево
│   │   └── TreeSidebar.tsx       # Боковая панель
│   └── ancestor/
│       ├── MemoryTabs.tsx        # Вкладки воспоминаний
│       └── AddMemoryButton.tsx   # Добавление памяти
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Session refresh
│   ├── utils/                    # Утилиты
│   └── validations/              # Zod схемы
├── store/
│   ├── auth.store.ts             # Auth state (Zustand)
│   └── tree.store.ts             # Tree state (Zustand)
└── types/index.ts                # TypeScript типы
```

---

## 🗺️ Роадмап

### Фаза 1 — MVP (сейчас) ✅
- [x] Лендинг + регистрация
- [x] Семейное дерево (добавление предков)
- [x] Профиль предка + воспоминания
- [x] Аудио транскрипция (Whisper)
- [x] AI сертификат (DALL-E)
- [x] Row Level Security (приватность семьи)

### Фаза 2 — Рост
- [ ] Kaspi Pay интеграция
- [ ] Telegram бот
- [ ] Загрузка аудио/фото файлов
- [ ] ИИ-помощник написания биографий
- [ ] Приглашение родственников по ссылке

### Фаза 3 — Масштаб
- [ ] iOS/Android (React Native + Expo)
- [ ] Объединение деревьев через ИИ
- [ ] Интерактивная карта происхождения
- [ ] Fine-tuning казахского LLM
- [ ] Образовательная платформа для школ

---

## 🔑 Ключевые технологии

| Технология | Назначение |
|---|---|
| Next.js 14 | Frontend + API Routes |
| TypeScript | Типобезопасность |
| Supabase | БД + Auth + Storage + Realtime |
| Tailwind CSS | Стили |
| Zustand | Глобальный стейт |
| React Hook Form + Zod | Формы + валидация |
| OpenAI Whisper | Транскрипция аудио |
| OpenAI DALL-E 3 | Генерация сертификатов |
| Vercel | Деплой |

---

## 💰 Монетизация

| Продукт | Цена |
|---|---|
| Регистрация хранителя | **500 ₸** |
| Семейное дерево (Premium) | 2,000 ₸/мес |
| Печатная книга семьи | 25,000 ₸ |
| EDU лицензия для школ | от 500,000 ₸/год |

**Цель**: 1,000,000 участников × 500 ₸ = **$1,000,000**

---

## 📞 Деплой на Vercel

```bash
# Установите Vercel CLI
npm i -g vercel

# Деплой
vercel

# Добавьте env переменные в Vercel Dashboard
# Project Settings → Environment Variables
```

---

*Жеті атаңды біл — Знай своих семерых предков*
