-- ════════════════════════════════════════════
-- PAYMENTS TABLE
-- Run after 001_initial.sql
-- ════════════════════════════════════════════

create table public.payments (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  order_id        varchar(100) unique not null,
  amount          integer not null default 500,
  status          varchar(20) default 'pending'
                  check (status in ('pending', 'completed', 'failed', 'refunded')),
  provider        varchar(20) default 'kaspi',
  created_at      timestamptz default now() not null,
  completed_at    timestamptz
);

create index idx_payments_user on public.payments(user_id);
create index idx_payments_order on public.payments(order_id);

-- RLS
alter table public.payments enable row level security;

create policy "Users can see own payments"
  on public.payments for select using (auth.uid() = user_id);
