-- Career and North Node content import support.
-- Adds first-class review fields while preserving the existing generated_interpretations JSON workflow.

alter table public.generated_interpretations
  add column if not exists archetype_meaning text,
  add column if not exists workplace_translation text,
  add column if not exists role_examples text,
  add column if not exists growth_edge text,
  add column if not exists best_use text,
  add column if not exists stress_behavior text,
  add column if not exists unfinished_lesson text,
  add column if not exists flags text[] not null default '{}'::text[],
  add column if not exists source_support text;

create index if not exists generated_interpretations_flags_idx
  on public.generated_interpretations using gin (flags);

create index if not exists generated_interpretations_source_support_idx
  on public.generated_interpretations (source_support);

create table if not exists public.content_sources (
  source_id text primary key,
  title text not null,
  author text,
  year integer,
  type text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_rows (
  source_row_key text primary key,
  source_id text not null references public.content_sources(source_id) on delete cascade,
  layer text not null,
  placement text not null,
  core_need text,
  preferred_conditions text,
  contribution text,
  money_behavior text,
  authority_style text,
  coworker_pattern text,
  stress_behavior text,
  unfinished_lesson text,
  supported_archetypes text,
  source_support text,
  raw_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists source_rows_source_id_idx
  on public.source_rows (source_id);

create or replace function public.set_content_sources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_sources_updated_at on public.content_sources;
create trigger content_sources_updated_at
before update on public.content_sources
for each row execute function public.set_content_sources_updated_at();

create or replace function public.set_source_rows_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists source_rows_updated_at on public.source_rows;
create trigger source_rows_updated_at
before update on public.source_rows
for each row execute function public.set_source_rows_updated_at();

alter table public.content_sources enable row level security;
alter table public.source_rows enable row level security;

drop policy if exists "Content sources are public" on public.content_sources;
create policy "Content sources are public"
  on public.content_sources
  for select
  using (true);

drop policy if exists "Source rows are public" on public.source_rows;
create policy "Source rows are public"
  on public.source_rows
  for select
  using (true);

insert into public.content_sources (source_id, title, author, year, type, notes)
values
  (
    'lofthus-spiritual-approach-1983',
    'A Spiritual Approach to Astrology',
    'Myrna Lofthus',
    1983,
    'third_party',
    'Approved as career reference layer 2026-07-10; no verbatim reproduction.'
  ),
  (
    'career-north-node-master-source-2026',
    'Career and North Node Master Source Document',
    'TLDR Astro',
    2026,
    'synthesis',
    'Canonical career source layer, 73 rows, page-cited.'
  )
on conflict (source_id) do update set
  title = excluded.title,
  author = excluded.author,
  year = excluded.year,
  type = excluded.type,
  notes = excluded.notes;
