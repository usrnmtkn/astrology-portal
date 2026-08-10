-- Owner-granted report entitlements and per-report model-call authorization.

alter table public.report_entitlements
  add column if not exists source text not null default 'stripe';

alter table public.report_entitlements
  drop constraint if exists report_entitlements_source_check;
alter table public.report_entitlements
  add constraint report_entitlements_source_check check (source in ('stripe', 'comp'));

alter table public.report_entitlements
  alter column stripe_event_id drop not null,
  alter column stripe_checkout_session_id drop not null;

alter table public.report_entitlements
  drop constraint if exists report_entitlements_stripe_reference_check;
alter table public.report_entitlements
  add constraint report_entitlements_stripe_reference_check check (
    (source = 'stripe' and stripe_event_id is not null and stripe_checkout_session_id is not null)
    or (source = 'comp' and stripe_event_id is null and stripe_checkout_session_id is null
      and stripe_customer_id is null and stripe_payment_intent_id is null and stripe_charge_id is null)
  );

create unique index if not exists report_entitlements_active_comp_window_idx
  on public.report_entitlements (user_id, subject_id, product_key, period_start)
  nulls not distinct
  where source = 'comp' and status in ('awaiting_birth_data', 'active');

alter table public.user_reports
  drop constraint if exists user_reports_fulfillment_status_check;
alter table public.user_reports
  add constraint user_reports_fulfillment_status_check check (
    fulfillment_status in (
      'awaiting_birth_data', 'awaiting_authorization', 'queued', 'calculating', 'writing', 'validating',
      'judging', 'needs_review', 'live', 'exception', 'revoked'
    )
  );

alter table public.report_fulfillment_jobs
  add column if not exists authorization_token uuid unique,
  add column if not exists authorized_call_budget integer,
  add column if not exists model_call_count integer not null default 0,
  add column if not exists authorization_consumed_at timestamptz;

alter table public.report_fulfillment_jobs
  drop constraint if exists report_fulfillment_jobs_call_budget_check,
  drop constraint if exists report_fulfillment_jobs_call_count_check;
alter table public.report_fulfillment_jobs
  add constraint report_fulfillment_jobs_call_budget_check check (
    authorized_call_budget is null or authorized_call_budget > 0
  ),
  add constraint report_fulfillment_jobs_call_count_check check (
    model_call_count >= 0
    and (authorized_call_budget is null or model_call_count <= authorized_call_budget)
  );

alter table public.report_delivery_events
  add column if not exists payload jsonb not null default '{}'::jsonb;

create or replace function public.consume_report_fulfillment_call(
  job_id uuid,
  call_authorization_token uuid
)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  consumed_count integer;
begin
  update public.report_fulfillment_jobs
  set model_call_count = model_call_count + 1,
      authorization_consumed_at = coalesce(authorization_consumed_at, now())
  where id = job_id
    and state = 'running'
    and authorization_token = call_authorization_token
    and authorized_call_budget is not null
    and model_call_count < authorized_call_budget
  returning model_call_count into consumed_count;

  if consumed_count is null then
    raise exception 'REPORT_CALL_AUTHORIZATION_REQUIRED: missing, invalid, inactive, or exhausted model-call authorization';
  end if;
  return consumed_count;
end;
$$;

create or replace function public.create_report_from_entitlement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  created_report_id uuid;
  initial_fulfillment_status text;
begin
  initial_fulfillment_status := case
    when new.status = 'awaiting_birth_data' then 'awaiting_birth_data'
    else 'awaiting_authorization'
  end;

  insert into public.user_reports (
    user_id, report_type, report_domain, report_horizon, subject_id,
    period_start, period_end, facts, facts_engine, status, entitlement_id, fulfillment_status,
    fulfillment_timestamps
  ) values (
    new.user_id, 'report', new.report_domain, new.report_horizon, new.subject_id,
    new.period_start, new.period_end, '{}'::jsonb, 'pending', 'draft', new.id,
    initial_fulfillment_status,
    jsonb_build_object(initial_fulfillment_status, now())
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
    insert into public.report_fulfillment_jobs (report_id, entitlement_id, state)
    values (created_report_id, new.id, 'paused')
    on conflict (report_id) do nothing;
  end if;
  return new;
end;
$$;

comment on column public.report_entitlements.source is
  'Origin of the entitlement. Comp grants deliberately carry no Stripe references.';
comment on column public.report_fulfillment_jobs.authorization_token is
  'Owner-issued, one-use fulfillment authorization. Each provider call atomically consumes its bound call budget.';
comment on column public.report_delivery_events.payload is
  'Provider-neutral delivery intent, retained when mail runs in log-only mode.';
