-- Execute isso no SQL Editor do Supabase (uma vez)

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  created_at timestamptz default now()
);

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('bible', 'book')) default 'bible',
  total_chapters int not null,
  start_date date,
  end_date date,
  active boolean default true,
  created_at timestamptz default now()
);

create table public.weekly_goals (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade,
  week_number int not null,
  chapter_start int not null,
  chapter_end int not null,
  due_date date not null,
  created_at timestamptz default now()
);

create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  project_id uuid references public.projects on delete cascade,
  current_chapter int not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, project_id)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.progress enable row level security;

-- Profiles: qualquer autenticado lê, só o próprio usuário escreve
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Projects: qualquer autenticado lê, sem restrição de escrita (admin é validado no front)
create policy "projects_select" on public.projects for select to authenticated using (true);
create policy "projects_all" on public.projects for all to authenticated using (true);

-- Weekly goals: qualquer autenticado lê/escreve (admin validado no front)
create policy "goals_select" on public.weekly_goals for select to authenticated using (true);
create policy "goals_all" on public.weekly_goals for all to authenticated using (true);

-- Progress: qualquer autenticado lê (para o ranking), só o próprio usuário escreve
create policy "progress_select" on public.progress for select to authenticated using (true);
create policy "progress_insert" on public.progress for insert to authenticated with check (auth.uid() = user_id);
create policy "progress_update" on public.progress for update to authenticated using (auth.uid() = user_id);
