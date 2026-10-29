-- 이 파일은 자동 실행되지 않습니다.
-- 마이페이지 DB 연동을 활성화할 때 Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  certificate_id text not null,
  completed_on date not null,
  total integer not null check (total > 0),
  correct integer not null check (correct >= 0 and correct <= total),
  rate integer not null check (rate >= 0 and rate <= 100),
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_completed_idx
  on public.quiz_attempts (user_id, completed_on desc, created_at desc);

alter table public.profiles enable row level security;
alter table public.quiz_attempts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can read own profile'
  ) then
    create policy "Users can read own profile"
      on public.profiles for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.profiles for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.profiles for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quiz_attempts' and policyname = 'Users can read own attempts'
  ) then
    create policy "Users can read own attempts"
      on public.quiz_attempts for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quiz_attempts' and policyname = 'Users can insert own attempts'
  ) then
    create policy "Users can insert own attempts"
      on public.quiz_attempts for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quiz_attempts' and policyname = 'Users can update own attempts'
  ) then
    create policy "Users can update own attempts"
      on public.quiz_attempts for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.quiz_attempts from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.quiz_attempts to authenticated;
