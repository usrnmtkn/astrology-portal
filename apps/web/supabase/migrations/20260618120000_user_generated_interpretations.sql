-- Private AI-rendered interpretations generated from a user's own chart,
-- relationship, or timing facts. Unlike generated_interpretations, these rows
-- are scoped to one authenticated user and must never be public.

create table if not exists public.user_generated_interpretations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null,
  subject_id text not null,
  content_key text not null,
  surface text not null,
  mode text not null,
  status text not null default 'LIVE',
  event_type text,
  target_date date,
  facts jsonb not null default '{}'::jsonb,
  knowledge_ids text[] not null default '{}'::text[],
  source_snapshot jsonb not null default '{}'::jsonb,
  prompt_version text not null default 'tldr-astro-v4',
  provider text,
  model text,
  headline text,
  summary text,
  body text not null,
  sections jsonb not null default '{}'::jsonb,
  response_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_generated_interpretations_unique_target
    unique (user_id, subject_type, subject_id, content_key, target_date, mode),
  constraint user_generated_interpretations_status_check
    check (status in ('DRAFT', 'LIVE', 'ARCHIVED', 'ERROR')),
  constraint user_generated_interpretations_mode_check
    check (mode in ('feed', 'in_depth', 'article')),
  constraint user_generated_interpretations_surface_check
    check (surface in ('sky', 'you', 'natal', 'synastry', 'composite', 'relationship'))
);

create index if not exists user_generated_interpretations_owner_lookup_idx
  on public.user_generated_interpretations (user_id, subject_type, subject_id, target_date desc);

create or replace function public.set_user_generated_interpretations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_generated_interpretations_updated_at
  on public.user_generated_interpretations;

create trigger user_generated_interpretations_updated_at
before update on public.user_generated_interpretations
for each row execute function public.set_user_generated_interpretations_updated_at();

alter table public.user_generated_interpretations enable row level security;

drop policy if exists "Users can view their generated interpretations"
  on public.user_generated_interpretations;

create policy "Users can view their generated interpretations"
  on public.user_generated_interpretations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can archive their generated interpretations"
  on public.user_generated_interpretations;

create policy "Users can archive their generated interpretations"
  on public.user_generated_interpretations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts and generation updates stay server-side via the Supabase service role.
