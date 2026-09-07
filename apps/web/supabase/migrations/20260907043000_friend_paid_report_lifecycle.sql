-- Durable one-day Friends paid-reading purchase and generation lifecycle.
-- The one-day Friends writer has a different contract from long-form report
-- fulfillment and supports text subject ids such as social:<uuid>.

create table if not exists public.friend_report_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  content_key text not null,
  target_date date not null,
  friend_name text not null,
  brief jsonb not null,
  status text not null default 'active'
    check (status in ('pending_payment', 'active', 'revoked', 'refunded')),
  source text not null default 'free_test'
    check (source in ('free_test', 'stripe')),
  stripe_event_id text unique,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  purchased_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_report_entitlements_content_key_check
    check (content_key like 'friend-transit-reading/%'),
  constraint friend_report_entitlements_owner_content_unique
    unique (user_id, content_key)
);

create index if not exists friend_report_entitlements_owner_idx
  on public.friend_report_entitlements (user_id, status, target_date desc);
create index if not exists friend_report_entitlements_payment_intent_idx
  on public.friend_report_entitlements (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.friend_report_jobs (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.friend_report_entitlements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  content_key text not null,
  target_date date not null,
  friend_name text not null,
  brief jsonb not null,
  state text not null default 'queued'
    check (state in ('queued', 'running', 'retry', 'complete', 'failed', 'cancelled')),
  attempt integer not null default 0 check (attempt >= 0),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  result_id uuid references public.user_generated_interpretations(id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_report_jobs_owner_content_unique unique (user_id, content_key)
);

create index if not exists friend_report_jobs_runner_idx
  on public.friend_report_jobs (state, run_after, created_at);
create index if not exists friend_report_jobs_owner_idx
  on public.friend_report_jobs (user_id, target_date desc);

create or replace function public.set_friend_report_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists friend_report_entitlements_updated_at on public.friend_report_entitlements;
create trigger friend_report_entitlements_updated_at
before update on public.friend_report_entitlements
for each row execute function public.set_friend_report_updated_at();

drop trigger if exists friend_report_jobs_updated_at on public.friend_report_jobs;
create trigger friend_report_jobs_updated_at
before update on public.friend_report_jobs
for each row execute function public.set_friend_report_updated_at();

create or replace function public.claim_friend_report_job(worker_id text, target_job_id uuid)
returns setof public.friend_report_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidate as (
    select id
    from public.friend_report_jobs
    where id = target_job_id
      and (
        (state in ('queued', 'retry') and run_after <= now())
        or (
          state = 'running'
          and (locked_at is null or locked_at < now() - interval '6 minutes')
        )
      )
    for update skip locked
    limit 1
  )
  update public.friend_report_jobs jobs
  set state = 'running',
      locked_at = now(),
      locked_by = worker_id,
      attempt = jobs.attempt + 1,
      last_error = null
  from candidate
  where jobs.id = candidate.id
  returning jobs.*;
end;
$$;

create or replace function public.claim_friend_report_jobs(worker_id text, batch_limit integer default 3)
returns setof public.friend_report_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidates as (
    select id
    from public.friend_report_jobs
    where (
      (state in ('queued', 'retry') and run_after <= now())
      or (
        state = 'running'
        and (locked_at is null or locked_at < now() - interval '6 minutes')
      )
    )
    order by run_after, created_at
    for update skip locked
    limit greatest(1, least(batch_limit, 10))
  )
  update public.friend_report_jobs jobs
  set state = 'running',
      locked_at = now(),
      locked_by = worker_id,
      attempt = jobs.attempt + 1,
      last_error = null
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_friend_report_job(text, uuid) from public, anon, authenticated;
revoke all on function public.claim_friend_report_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_friend_report_job(text, uuid) to service_role;
grant execute on function public.claim_friend_report_jobs(text, integer) to service_role;

alter table public.friend_report_entitlements enable row level security;
alter table public.friend_report_jobs enable row level security;

drop policy if exists "Users can view their Friends report entitlements" on public.friend_report_entitlements;
create policy "Users can view their Friends report entitlements"
  on public.friend_report_entitlements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their Friends report jobs" on public.friend_report_jobs;
create policy "Users can view their Friends report jobs"
  on public.friend_report_jobs for select
  using (auth.uid() = user_id);

grant select on public.friend_report_entitlements to authenticated;
grant select on public.friend_report_jobs to authenticated;

comment on table public.friend_report_entitlements is
  'Server-written entitlement snapshot for one saved Friends transit reading. free_test preserves test-mode UX; stripe is the paid path.';
comment on table public.friend_report_jobs is
  'Durable short-reading queue. Generation may run inline for fast UX; the cron worker can reclaim a stale running lease after six minutes if a request terminates mid-generation.';
