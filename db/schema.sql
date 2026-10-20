-- SpeakDaily schema. Run in Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  transcript text not null,
  feedback text not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.practice_sessions to authenticated;
grant all on public.profiles to service_role;
grant all on public.practice_sessions to service_role;

alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "own sessions read" on public.practice_sessions for select to authenticated using (auth.uid() = user_id);
create policy "own sessions insert" on public.practice_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "own sessions delete" on public.practice_sessions for delete to authenticated using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
