-- ════════════════════════════════════════════
-- SUPABASE AUTH НАСТРОЙКА
-- Выполните в Supabase Dashboard
-- ════════════════════════════════════════════

-- ── ВАЖНО: Отключите Email Confirmation ──
-- Supabase Dashboard → Authentication → Providers → Email
-- → "Confirm email" = OFF  (для быстрой регистрации без подтверждения)
-- → "Secure email change" = ON
-- → "Double confirm changes" = OFF

-- ── URL Configuration ──
-- Authentication → URL Configuration:
-- Site URL: https://YOUR_APP.vercel.app
-- Redirect URLs (добавьте все):
--   https://YOUR_APP.vercel.app/**
--   http://localhost:3000/**

-- ── Auto-create user profile on signup ──
-- Этот триггер создаёт запись в public.users автоматически
-- при регистрации через Supabase Auth

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Хранитель')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

select trigger_name, event_manipulation, event_object_table
from information_schema.triggers
where trigger_name = 'on_auth_user_created';
