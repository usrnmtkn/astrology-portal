-- Separate logical generation attempts from scheduler claims (including stale claims).
alter table public.you_report_jobs add column checkpoint_attempt integer not null default 1 check (checkpoint_attempt > 0);
alter table public.friend_report_jobs add column checkpoint_attempt integer not null default 1 check (checkpoint_attempt > 0);

-- Intermediate model responses are server-only and never reader content.
create table public.transit_report_model_checkpoints (
  id uuid primary key default gen_random_uuid(),
  you_job_id uuid references public.you_report_jobs(id) on delete cascade,
  friend_job_id uuid references public.friend_report_jobs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  step integer not null check (step between 0 and 5),
  request_hash text not null,
  state text not null check (state in ('started', 'complete', 'failed')),
  provider text not null,
  model text not null,
  schema_name text not null,
  response jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (num_nonnulls(you_job_id, friend_job_id) = 1),
  check ((state = 'complete') = (response is not null)),
  unique (you_job_id, attempt, step),
  unique (friend_job_id, attempt, step)
);
alter table public.transit_report_model_checkpoints enable row level security;
revoke all on public.transit_report_model_checkpoints from public, anon, authenticated;
grant select, insert, update, delete on public.transit_report_model_checkpoints to service_role;
