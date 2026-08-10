-- Purchased-report entitlements, resumable fulfillment, audits, and delivery controls.

create table if not exists public.report_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid,
  product_key text not null,
  report_domain text not null check (report_domain in ('general', 'work_money', 'love_connection')),
  report_horizon text not null check (report_horizon in ('1_month', '4_months', '6_months', '12_months')),
  window_anchor text not null check (window_anchor in ('purchase', 'selected', 'solar_return_display')),
  selected_start date,
  period_start date not null,
  period_end date not null,
  requires_birth_time boolean not null default false,
  status text not null check (status in ('awaiting_birth_data', 'active', 'revoked', 'refunded')),
  stripe_event_id text not null unique,
  stripe_checkout_session_id text not null unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  purchased_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_entitlements_period_check check (period_end >= period_start)
);

create index if not exists report_entitlements_owner_idx
  on public.report_entitlements (user_id, status, purchased_at desc);

create table if not exists public.report_stripe_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.report_facts_bundles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid,
  report_horizon text not null check (report_horizon in ('1_month', '4_months', '6_months', '12_months')),
  period_start date not null,
  period_end date not null,
  facts jsonb not null,
  facts_hash text not null,
  facts_engine text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists report_facts_bundles_window_idx
  on public.report_facts_bundles (user_id, subject_id, report_horizon, period_start, period_end)
  nulls not distinct;

create table if not exists public.report_facts_claims (
  window_key text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  locked_by text not null,
  locked_at timestamptz not null default now()
);

create or replace function public.claim_report_facts_window(
  claim_window_key text,
  claim_user_id uuid,
  claim_worker_id text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  claimed_count integer := 0;
begin
  insert into public.report_facts_claims (window_key, user_id, locked_by)
  values (claim_window_key, claim_user_id, claim_worker_id)
  on conflict (window_key) do nothing;
  if found then return true; end if;

  update public.report_facts_claims
  set locked_by = claim_worker_id, locked_at = now()
  where window_key = claim_window_key
    and locked_at < now() - interval '15 minutes';
  get diagnostics claimed_count = row_count;
  return claimed_count > 0;
end;
$$;

alter table public.user_reports
  add column if not exists entitlement_id uuid references public.report_entitlements(id) on delete set null,
  add column if not exists fulfillment_status text not null default 'queued',
  add column if not exists fulfillment_timestamps jsonb not null default '{}'::jsonb,
  add column if not exists prompt_versions jsonb not null default '{}'::jsonb,
  add column if not exists facts_hash text,
  add column if not exists validator_results jsonb not null default '[]'::jsonb,
  add column if not exists judge_scores jsonb not null default '[]'::jsonb,
  add column if not exists attempt_counts jsonb not null default '{"validator":0,"judge":0}'::jsonb,
  add column if not exists failure_history jsonb not null default '[]'::jsonb,
  add column if not exists token_spend_usd numeric(12, 4) not null default 0,
  add column if not exists token_count integer not null default 0,
  add column if not exists delivered_at timestamptz,
  add column if not exists revoked_at timestamptz;

alter table public.user_reports
  drop constraint if exists user_reports_fulfillment_status_check;
alter table public.user_reports
  add constraint user_reports_fulfillment_status_check check (
    fulfillment_status in (
      'awaiting_birth_data', 'queued', 'calculating', 'writing', 'validating',
      'judging', 'needs_review', 'live', 'exception', 'revoked'
    )
  );

create unique index if not exists user_reports_entitlement_idx
  on public.user_reports (entitlement_id)
  where entitlement_id is not null;

create table if not exists public.report_fulfillment_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.user_reports(id) on delete cascade,
  entitlement_id uuid not null references public.report_entitlements(id) on delete cascade,
  state text not null default 'queued' check (state in ('queued', 'running', 'retry', 'complete', 'paused', 'exception', 'cancelled')),
  step text not null default 'calculating' check (step in ('calculating', 'writing', 'validating', 'judging', 'delivery', 'complete')),
  attempt integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists report_fulfillment_jobs_runner_idx
  on public.report_fulfillment_jobs (state, run_after, created_at);

create or replace function public.claim_report_fulfillment_jobs(worker_id text, batch_limit integer default 5)
returns setof public.report_fulfillment_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidates as (
    select id
    from public.report_fulfillment_jobs
    where state in ('queued', 'retry')
      and run_after <= now()
    order by run_after, created_at
    for update skip locked
    limit greatest(1, least(batch_limit, 25))
  )
  update public.report_fulfillment_jobs jobs
  set state = 'running', locked_at = now(), locked_by = worker_id, attempt = jobs.attempt + 1
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

create table if not exists public.report_audit_samples (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.user_reports(id) on delete cascade,
  combination_key text not null,
  reason text not null check (reason in ('random_sample', 'new_combination')),
  prompt_versions jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'rule_change_recorded')),
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.report_delivery_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.user_reports(id) on delete cascade,
  channel text not null check (channel in ('email')),
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('queued', 'sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.report_fulfillment_controls (
  id boolean primary key default true check (id),
  worker_paused boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.report_fulfillment_controls (id) values (true) on conflict (id) do nothing;

create or replace function public.set_report_fulfillment_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_report_fulfillment_transition()
returns trigger language plpgsql as $$
begin
  if new.fulfillment_status is distinct from old.fulfillment_status then
    new.fulfillment_timestamps = coalesce(old.fulfillment_timestamps, '{}'::jsonb)
      || coalesce(new.fulfillment_timestamps, '{}'::jsonb)
      || jsonb_build_object(new.fulfillment_status, now());
  end if;
  return new;
end;
$$;

drop trigger if exists user_reports_fulfillment_transition on public.user_reports;
create trigger user_reports_fulfillment_transition
before update of fulfillment_status on public.user_reports
for each row execute function public.record_report_fulfillment_transition();

drop trigger if exists report_entitlements_updated_at on public.report_entitlements;
create trigger report_entitlements_updated_at before update on public.report_entitlements
for each row execute function public.set_report_fulfillment_updated_at();

drop trigger if exists report_fulfillment_jobs_updated_at on public.report_fulfillment_jobs;
create trigger report_fulfillment_jobs_updated_at before update on public.report_fulfillment_jobs
for each row execute function public.set_report_fulfillment_updated_at();

create or replace function public.create_report_from_entitlement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  created_report_id uuid;
begin
  insert into public.user_reports (
    user_id, report_type, report_domain, report_horizon, subject_id,
    period_start, period_end, facts, facts_engine, status, entitlement_id, fulfillment_status,
    fulfillment_timestamps
  ) values (
    new.user_id, 'report', new.report_domain, new.report_horizon, new.subject_id,
    new.period_start, new.period_end, '{}'::jsonb, 'pending', 'draft', new.id,
    case when new.status = 'awaiting_birth_data' then 'awaiting_birth_data' else 'queued' end,
    jsonb_build_object(
      case when new.status = 'awaiting_birth_data' then 'awaiting_birth_data' else 'queued' end,
      now()
    )
  )
  on conflict do nothing
  returning id into created_report_id;

  if created_report_id is null then
    select id into created_report_id
    from public.user_reports
    where user_id = new.user_id
      and report_type = 'report'
      and report_domain = new.report_domain
      and report_horizon = new.report_horizon
      and subject_id is not distinct from new.subject_id
      and period_start = new.period_start;
    update public.user_reports set entitlement_id = coalesce(entitlement_id, new.id)
    where id = created_report_id;
  end if;

  if new.status = 'active' then
    insert into public.report_fulfillment_jobs (report_id, entitlement_id)
    values (created_report_id, new.id)
    on conflict (report_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists report_entitlement_create_report on public.report_entitlements;
create trigger report_entitlement_create_report after insert on public.report_entitlements
for each row execute function public.create_report_from_entitlement();

alter table public.report_entitlements enable row level security;
alter table public.report_stripe_events enable row level security;
alter table public.report_facts_bundles enable row level security;
alter table public.report_facts_claims enable row level security;
alter table public.report_fulfillment_jobs enable row level security;
alter table public.report_audit_samples enable row level security;
alter table public.report_delivery_events enable row level security;
alter table public.report_fulfillment_controls enable row level security;

drop policy if exists "Users can view their report entitlements" on public.report_entitlements;
create policy "Users can view their report entitlements" on public.report_entitlements
for select using (auth.uid() = user_id);

drop policy if exists "Users can view their report facts bundles" on public.report_facts_bundles;
create policy "Users can view their report facts bundles" on public.report_facts_bundles
for select using (auth.uid() = user_id);

comment on table public.report_fulfillment_jobs is
  'Service-role queue. No prose-editing workflow is provided; terminal failures are rerun or refunded.';
comment on column public.user_reports.fulfillment_status is
  'Operational state separate from publication status. Auto-publish remains gated by the owner ruling flag.';
