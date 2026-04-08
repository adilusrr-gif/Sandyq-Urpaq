-- Supabase Auth setup
-- Run after 001_initial.sql and 002_payments.sql

-- In Supabase Dashboard:
-- Authentication -> Providers -> Email -> Confirm email = OFF
-- Authentication -> URL Configuration -> add your production URL and localhost

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, tribe_zhuz)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Хранитель'),
    nullif(new.raw_user_meta_data->>'tribe_zhuz', '')
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
