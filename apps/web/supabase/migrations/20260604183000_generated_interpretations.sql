-- Stores AI-rendered interpretation drafts created from source-backed astrology data.
-- The browser should not write to this table directly. Server jobs use the service role key.

create table if not exists public.generated_interpretations (
  id uuid primary key default gen_random_uuid(),
  content_key text not null,
  surface text not null,
  mode text not null,
  status text not null default 'DRAFT',
  event_type text,
  target_date date,
  facts jsonb not null default '{}'::jsonb,
  knowledge_ids text[] not null default '{}'::text[],
  source_snapshot jsonb not null default '{}'::jsonb,
  prompt_version text not null default 'tldr-astro-v1',
  model text,
  headline text,
  summary text,
  body text not null,
  sections jsonb not null default '{}'::jsonb,
  reviewer_notes text,
  openai_response_id text,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_interpretations_unique_target unique (content_key, target_date, mode),
  constraint generated_interpretations_status_check check (status in ('DRAFT', 'REVIEWED', 'LIVE', 'ARCHIVED', 'ERROR')),
  constraint generated_interpretations_mode_check check (mode in ('feed', 'in_depth', 'article')),
  constraint generated_interpretations_surface_check check (surface in ('sky', 'you', 'natal', 'synastry', 'composite', 'relationship'))
);

create index if not exists generated_interpretations_surface_status_idx
  on public.generated_interpretations (surface, status, target_date desc);

create or replace function public.set_generated_interpretations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists generated_interpretations_updated_at on public.generated_interpretations;
create trigger generated_interpretations_updated_at
before update on public.generated_interpretations
for each row execute function public.set_generated_interpretations_updated_at();

alter table public.generated_interpretations enable row level security;

drop policy if exists "Generated interpretations are public when live"
  on public.generated_interpretations;

create policy "Generated interpretations are public when live"
  on public.generated_interpretations
  for select
  using (status = 'LIVE');

-- Draft, review, archive, and publish actions stay server-side.
-- Server-side jobs use the Supabase service role key, which bypasses RLS.
