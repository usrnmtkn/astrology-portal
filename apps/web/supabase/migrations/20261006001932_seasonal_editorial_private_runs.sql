-- Private Seasonal run journal. No candidate/evidence bodies enter serving rows.
create table if not exists public.studio_editorial_runs (
  id uuid primary key,
  target_row_id uuid not null references public.generated_interpretations(id),
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null check (state->>'surface' = 'seasonal'),
  state_hash text not null check (state_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists studio_editorial_runs_target_idx on public.studio_editorial_runs(target_row_id);
alter table public.studio_editorial_runs enable row level security;
revoke all on public.studio_editorial_runs from public, anon, authenticated;
grant select, insert, update on public.studio_editorial_runs to service_role;
comment on table public.studio_editorial_runs is 'Service-only Seasonal evidence, candidate attempts and evaluation receipts. Model acceptance never authorizes publishing.';
