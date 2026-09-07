-- Durable paid/free-test lifecycle for Friends transit readings.
-- Friends subject ids are text because accepted social friends use `social:<uuid>`.

create table if not exists public.friend_report_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  target_date date not null,
  content_key text not null,
  product_key text not null default 'friend_transit_daily',
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
  constraint friend_report_entitlements_owner_target_unique unique (user_id, subject_id, target_date),
  constraint friend_report_entitlements_content_key_unique unique (user_id, content_key),
  constraint friend_report_entitlements_stripe_shape check (
    (source = 'stripe' and stripe_event_id is not null and stripe_checkout_session_id is not null)
    or (source in ('free_test', 'comp') and stripe_event_id is null and stripe_checkout_session_id is null)
  )
);

create index if not exists friend_report_entitlements_owner_idx
  on public.friend_report_entitlements (user_id, status, purchased_at desc);

create table if not exists public.friend_report_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  target_date date not null,
  content_key text not null,
  facts jsonb not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'converted', 'cancelled', 'expired')),
  stripe_checkout_session_id text unique,
  checkout_url text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists friend_report_checkout_intents_owner_idx
  on public.friend_report_checkout_intents (user_id, status, created_at desc);
create unique index if not exists friend_report_checkout_intents_pending_target_idx
  on public.friend_report_checkout_intents (user_id, subject_id, target_date)
  where status = 'pending';

create table if not exists public.friend_report_jobs (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.friend_report_entitlements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  target_date date not null,
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
  constraint friend_report_jobs_owner_target_unique unique (user_id, subject_id, target_date)
);

create index if not exists friend_report_jobs_runner_idx
  on public.friend_report_jobs (state, run_after, created_at);

alter table public.user_generated_interpretations
  add column if not exists friend_report_entitlement_id uuid
    references public.friend_report_entitlements(id) on delete set null;

create unique index if not exists user_generated_friend_report_entitlement_idx
  on public.user_generated_interpretations (friend_report_entitlement_id)
  where friend_report_entitlement_id is not null;

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

drop trigger if exists friend_report_checkout_intents_updated_at on public.friend_report_checkout_intents;
create trigger friend_report_checkout_intents_updated_at
before update on public.friend_report_checkout_intents
for each row execute function public.set_friend_report_updated_at();

drop trigger if exists friend_report_jobs_updated_at on public.friend_report_jobs;
create trigger friend_report_jobs_updated_at
before update on public.friend_report_jobs
for each row execute function public.set_friend_report_updated_at();

create or replace function public.claim_friend_report_jobs(
  worker_id text,
  batch_limit integer default 1,
  requested_job_id uuid default null
)
returns setof public.friend_report_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidates as (
    select id
    from public.friend_report_jobs
    where (
        (state in ('queued', 'retry') and run_after <= now())
        or (state = 'running' and locked_at < now() - interval '10 minutes')
      )
      and (requested_job_id is null or id = requested_job_id)
    order by run_after, created_at
    for update skip locked
    limit greatest(1, least(batch_limit, 5))
  )
  update public.friend_report_jobs jobs
  set state = 'running',
      locked_at = now(),
      locked_by = worker_id,
      attempt = jobs.attempt + 1
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

alter table public.friend_report_entitlements enable row level security;
alter table public.friend_report_checkout_intents enable row level security;
alter table public.friend_report_jobs enable row level security;

drop policy if exists "Users can view their Friends report entitlements" on public.friend_report_entitlements;
create policy "Users can view their Friends report entitlements"
  on public.friend_report_entitlements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their Friends report checkout intents" on public.friend_report_checkout_intents;
create policy "Users can view their Friends report checkout intents"
  on public.friend_report_checkout_intents for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their Friends report jobs" on public.friend_report_jobs;
create policy "Users can view their Friends report jobs"
  on public.friend_report_jobs for select
  using (auth.uid() = user_id);

-- Browsers may inspect their own lifecycle state. Minting entitlements, converting
-- Stripe checkout intents, queue mutations, retries, and cleanup remain server-only.
grant select on public.friend_report_entitlements to authenticated;
grant select on public.friend_report_checkout_intents to authenticated;
grant select on public.friend_report_jobs to authenticated;
