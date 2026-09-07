-- Durable lifecycle for in-depth You day/week transit reports.
-- Billing remains free-test only in this release; product keys and Stripe columns
-- are present so later checkout can activate the same entitlement rows.

create table if not exists public.you_report_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_window text not null check (report_window in ('day', 'week')),
  target_date date not null,
  period_end date not null,
  content_key text not null,
  product_key text not null check (product_key in ('you_transit_day', 'you_transit_week')),
  source text not null check (source in ('free_test', 'stripe', 'comp')),
  status text not null default 'active' check (status in ('active', 'revoked', 'refunded')),
  stripe_event_id text unique,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  purchased_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint you_report_entitlements_period_check check (period_end >= target_date),
  constraint you_report_entitlements_owner_target_unique unique (user_id, report_window, target_date),
  constraint you_report_entitlements_content_key_unique unique (user_id, content_key),
  constraint you_report_entitlements_stripe_shape check (
    (source = 'stripe' and stripe_event_id is not null and stripe_checkout_session_id is not null)
    or (source in ('free_test', 'comp') and stripe_event_id is null and stripe_checkout_session_id is null)
  )
);

create index if not exists you_report_entitlements_owner_idx
  on public.you_report_entitlements (user_id, status, purchased_at desc);

create table if not exists public.you_report_jobs (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.you_report_entitlements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  report_window text not null check (report_window in ('day', 'week')),
  target_date date not null,
  period_end date not null,
  content_key text not null,
  facts jsonb not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  state text not null default 'queued' check (state in ('queued', 'running', 'retry', 'complete', 'failed', 'cancelled')),
  attempt integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  result_id uuid references public.user_generated_interpretations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint you_report_jobs_owner_target_unique unique (user_id, report_window, target_date)
);

create index if not exists you_report_jobs_runner_idx
  on public.you_report_jobs (state, run_after, created_at);

alter table public.user_generated_interpretations
  add column if not exists you_report_entitlement_id uuid
    references public.you_report_entitlements(id) on delete set null;

create unique index if not exists user_generated_you_report_entitlement_idx
  on public.user_generated_interpretations (you_report_entitlement_id)
  where you_report_entitlement_id is not null;

create or replace function public.set_you_report_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists you_report_entitlements_updated_at on public.you_report_entitlements;
create trigger you_report_entitlements_updated_at
before update on public.you_report_entitlements
for each row execute function public.set_you_report_updated_at();

drop trigger if exists you_report_jobs_updated_at on public.you_report_jobs;
create trigger you_report_jobs_updated_at
before update on public.you_report_jobs
for each row execute function public.set_you_report_updated_at();

create or replace function public.claim_you_report_jobs(
  worker_id text,
  batch_limit integer default 1,
  requested_job_id uuid default null
)
returns setof public.you_report_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidates as (
    select id
    from public.you_report_jobs
    where (
        (state in ('queued', 'retry') and run_after <= now())
        or (state = 'running' and locked_at < now() - interval '10 minutes')
      )
      and (requested_job_id is null or id = requested_job_id)
    order by run_after, created_at
    for update skip locked
    limit greatest(1, least(batch_limit, 5))
  )
  update public.you_report_jobs jobs
  set state = 'running',
      locked_at = now(),
      locked_by = worker_id,
      attempt = jobs.attempt + 1
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

alter table public.you_report_entitlements enable row level security;
alter table public.you_report_jobs enable row level security;

drop policy if exists "Users can view their You report entitlements" on public.you_report_entitlements;
create policy "Users can view their You report entitlements"
  on public.you_report_entitlements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their You report jobs" on public.you_report_jobs;
create policy "Users can view their You report jobs"
  on public.you_report_jobs for select
  using (auth.uid() = user_id);

grant select on public.you_report_entitlements to authenticated;
grant select on public.you_report_jobs to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.you_report_entitlements
  from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.you_report_jobs
  from anon, authenticated;
revoke all on function public.claim_you_report_jobs(text, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_you_report_jobs(text, integer, uuid)
  to service_role;
