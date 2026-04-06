-- ════════════════════════════════════════════
-- САНДЫҚ ҰРПАҚ — Database Schema
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── USERS ──────────────────────────────────
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           varchar(20) unique,
  telegram_id     varchar(50) unique,
  full_name       varchar(200) not null,
  avatar_url      text,
  birth_year      smallint,
  tribe_zhuz      varchar(100),
  paid_at         timestamptz,
  participant_num integer unique,
  created_at      timestamptz default now() not null
);

-- Auto-assign participant number on payment
create or replace function assign_participant_number()
returns trigger as $$
begin
  if new.paid_at is not null and old.paid_at is null then
    new.participant_num := (select coalesce(max(participant_num), 0) + 1 from public.users);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_payment_confirmed
  before update on public.users
  for each row execute function assign_participant_number();

-- ── FAMILY TREES ───────────────────────────
create table public.family_trees (
  id                  uuid primary key default uuid_generate_v4(),
  owner_user_id       uuid not null references public.users(id) on delete cascade,
  name                varchar(200) not null,
  default_visibility  varchar(10) default 'family' check (default_visibility in ('private','family','public')),
  invite_code         varchar(20) unique not null default upper(substr(md5(random()::text), 1, 8)),
  total_persons       integer default 0,
  generations_count   smallint default 0,
  created_at          timestamptz default now() not null
);

-- ── PERSONS ────────────────────────────────
create table public.persons (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.users(id) on delete set null,
  family_tree_id    uuid not null references public.family_trees(id) on delete cascade,
  first_name        varchar(100) not null,
  last_name         varchar(100) not null,
  birth_year        smallint,
  death_year        smallint,
  is_alive          boolean default true,
  is_historical     boolean default false,
  generation_num    smallint default 0,
  added_by_user_id  uuid not null references public.users(id),
  visibility        varchar(10) default 'family' check (visibility in ('private','family','public')),
  bio               text,
  location          varchar(200),
  zhuz              varchar(100),
  avatar_url        text,
  created_at        timestamptz default now() not null
);

create index idx_persons_tree on public.persons(family_tree_id);
create index idx_persons_gen on public.persons(generation_num);

-- Auto-update tree stats
create or replace function update_tree_stats()
returns trigger as $$
declare
  tree_id uuid;
  p_count integer;
  gen_range integer;
begin
  tree_id := coalesce(new.family_tree_id, old.family_tree_id);
  select count(*) into p_count from public.persons where family_tree_id = tree_id;
  select coalesce(max(generation_num) - min(generation_num) + 1, 0)
    into gen_range from public.persons where family_tree_id = tree_id;
  update public.family_trees
    set total_persons = p_count, generations_count = gen_range
    where id = tree_id;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger on_person_change
  after insert or update or delete on public.persons
  for each row execute function update_tree_stats();

-- ── RELATIONSHIPS ──────────────────────────
create table public.relationships (
  id              uuid primary key default uuid_generate_v4(),
  from_person_id  uuid not null references public.persons(id) on delete cascade,
  to_person_id    uuid not null references public.persons(id) on delete cascade,
  type            varchar(20) not null check (type in ('parent_of','spouse_of','sibling_of','adopted_by')),
  status          varchar(20) default 'pending' check (status in ('pending','confirmed','disputed')),
  confirmed_by    uuid references public.users(id),
  created_at      timestamptz default now() not null,
  unique(from_person_id, to_person_id, type)
);

create index idx_rels_from on public.relationships(from_person_id);
create index idx_rels_to on public.relationships(to_person_id);

-- ── MEMORIES ───────────────────────────────
create table public.memories (
  id                  uuid primary key default uuid_generate_v4(),
  person_id           uuid not null references public.persons(id) on delete cascade,
  added_by_user_id    uuid not null references public.users(id),
  type                varchar(20) not null check (type in ('audio','photo','video','story','tradition','recipe','document','location')),
  file_url            text,
  text_content        text,
  transcript          text,
  language            varchar(10) default 'kk',
  visibility          varchar(10) default 'family' check (visibility in ('private','family','public','ai_only')),
  is_ai_dataset       boolean default false,
  moderation_status   varchar(20) default 'pending' check (moderation_status in ('pending','approved','rejected')),
  title               varchar(200),
  duration_seconds    integer,
  created_at          timestamptz default now() not null
);

create index idx_memories_person on public.memories(person_id);
create index idx_memories_type on public.memories(type);
create index idx_memories_lang on public.memories(language);

-- ── TREE MEMBERS ───────────────────────────
create table public.tree_members (
  id                uuid primary key default uuid_generate_v4(),
  tree_id           uuid not null references public.family_trees(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  role              varchar(10) default 'viewer' check (role in ('owner','admin','editor','viewer')),
  linked_person_id  uuid references public.persons(id) on delete set null,
  invited_by        uuid not null references public.users(id),
  joined_at         timestamptz default now() not null,
  unique(tree_id, user_id)
);

create index idx_members_tree on public.tree_members(tree_id);
create index idx_members_user on public.tree_members(user_id);

-- ════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════

alter table public.users enable row level security;
alter table public.family_trees enable row level security;
alter table public.persons enable row level security;
alter table public.relationships enable row level security;
alter table public.memories enable row level security;
alter table public.tree_members enable row level security;

-- Users: see own profile + public info of others
create policy "Users can see their own profile"
  on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.users for update using (auth.uid() = id);
create policy "Users can insert their own profile"
  on public.users for insert with check (auth.uid() = id);

-- Trees: members can see
create policy "Tree members can view tree"
  on public.family_trees for select using (
    exists (select 1 from public.tree_members where tree_id = id and user_id = auth.uid())
    or owner_user_id = auth.uid()
  );
create policy "Owner can update tree"
  on public.family_trees for update using (owner_user_id = auth.uid());
create policy "Authenticated users can create trees"
  on public.family_trees for insert with check (auth.uid() = owner_user_id);

-- Persons: tree members can see family-visibility
create policy "Tree members can view persons"
  on public.persons for select using (
    exists (select 1 from public.tree_members where tree_id = family_tree_id and user_id = auth.uid())
  );
create policy "Editors can insert persons"
  on public.persons for insert with check (
    exists (
      select 1 from public.tree_members
      where tree_id = family_tree_id and user_id = auth.uid()
      and role in ('owner','admin','editor')
    )
  );
create policy "Editors can update persons"
  on public.persons for update using (
    exists (
      select 1 from public.tree_members
      where tree_id = family_tree_id and user_id = auth.uid()
      and role in ('owner','admin','editor')
    )
  );

-- Memories
create policy "Tree members can view memories"
  on public.memories for select using (
    exists (
      select 1 from public.persons p
      join public.tree_members tm on tm.tree_id = p.family_tree_id
      where p.id = person_id and tm.user_id = auth.uid()
    )
  );
create policy "Editors can add memories"
  on public.memories for insert with check (auth.uid() = added_by_user_id);

-- Tree members
create policy "Members can see other members of same tree"
  on public.tree_members for select using (
    exists (select 1 from public.tree_members tm2 where tm2.tree_id = tree_id and tm2.user_id = auth.uid())
  );

-- ════════════════════════════════════════════
-- STORAGE BUCKETS
-- Run separately in Supabase Dashboard > Storage
-- ════════════════════════════════════════════
-- insert into storage.buckets (id, name, public) values ('memories', 'memories', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('certificates', 'certificates', true);
