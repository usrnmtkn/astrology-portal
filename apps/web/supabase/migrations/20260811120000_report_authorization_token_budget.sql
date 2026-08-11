-- Scope call and token budgets to each owner authorization while retaining a
-- separately owner-adjustable lifetime token backstop on the report.

alter table public.user_reports
  add column if not exists token_budget_lifetime bigint not null default 1450000;

alter table public.user_reports
  drop constraint if exists user_reports_token_budget_lifetime_check;
alter table public.user_reports
  add constraint user_reports_token_budget_lifetime_check
  check (token_budget_lifetime > 0);

alter table public.report_fulfillment_jobs
  add column if not exists authorization_call_count integer not null default 0,
  add column if not exists authorized_token_budget bigint,
  add column if not exists authorization_token_count bigint not null default 0;

alter table public.report_fulfillment_jobs
  drop constraint if exists report_fulfillment_jobs_call_count_check,
  drop constraint if exists report_fulfillment_jobs_authorization_call_count_check,
  drop constraint if exists report_fulfillment_jobs_authorized_token_budget_check,
  drop constraint if exists report_fulfillment_jobs_authorization_token_count_check;
alter table public.report_fulfillment_jobs
  add constraint report_fulfillment_jobs_call_count_check
    check (model_call_count >= 0),
  add constraint report_fulfillment_jobs_authorization_call_count_check
    check (authorization_call_count >= 0 and (authorized_call_budget is null or authorization_call_count <= authorized_call_budget)),
  add constraint report_fulfillment_jobs_authorized_token_budget_check
    check (authorized_token_budget is null or authorized_token_budget > 0),
  add constraint report_fulfillment_jobs_authorization_token_count_check
    check (authorization_token_count >= 0);

alter table public.report_model_calls
  add column if not exists authorization_token uuid;

create index if not exists report_model_calls_authorization_idx
  on public.report_model_calls (job_id, authorization_token, call_number);

-- Associate only calls made after the current token was first consumed. Older
-- authorizations remain immutable historical ledger rows with a null token.
update public.report_model_calls calls
set authorization_token = jobs.authorization_token
from public.report_fulfillment_jobs jobs
where calls.job_id = jobs.id
  and calls.authorization_token is null
  and jobs.authorization_token is not null
  and jobs.authorization_consumed_at is not null
  and calls.created_at >= jobs.authorization_consumed_at;

update public.report_fulfillment_jobs jobs
set authorization_call_count = scoped.call_count,
    authorization_token_count = scoped.token_count,
    authorized_token_budget = case
      when jobs.authorization_token is null then null
      else coalesce(jobs.authorized_token_budget, 1450000)
    end
from (
  select jobs_inner.id,
         count(calls.id)::integer as call_count,
         coalesce(sum(calls.total_tokens), 0)::bigint as token_count
  from public.report_fulfillment_jobs jobs_inner
  left join public.report_model_calls calls
    on calls.job_id = jobs_inner.id
   and calls.authorization_token = jobs_inner.authorization_token
  group by jobs_inner.id
) scoped
where jobs.id = scoped.id;

-- Owner ruling, 2026-08-11: this report retains all prior spend but receives a
-- 3M lifetime backstop and a fresh 55-call/1.45M-token authorization. Its
-- current authorization has already consumed calls 23-26 (249,787 tokens).
update public.user_reports
set token_budget_lifetime = 3000000
where id = '74951c07-64fe-461d-ac49-e81858af3296';

update public.report_fulfillment_jobs
set authorized_call_budget = 55,
    authorized_token_budget = 1450000
where report_id = '74951c07-64fe-461d-ac49-e81858af3296'
  and authorization_token is not null;

create or replace function public.begin_report_fulfillment_call(
  job_id uuid,
  call_authorization_token uuid,
  call_provider text,
  call_model text,
  call_schema_name text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  lifetime_count integer;
  scoped_count integer;
  target_report_id uuid;
  created_call_id uuid;
begin
  update public.report_fulfillment_jobs
  set model_call_count = model_call_count + 1,
      authorization_call_count = authorization_call_count + 1,
      authorization_consumed_at = coalesce(authorization_consumed_at, now())
  where id = job_id
    and state = 'running'
    and authorization_token = call_authorization_token
    and authorized_call_budget is not null
    and authorized_token_budget is not null
    and authorization_call_count < authorized_call_budget
    and authorization_token_count < authorized_token_budget
  returning model_call_count, authorization_call_count, report_id
  into lifetime_count, scoped_count, target_report_id;

  if lifetime_count is null then
    raise exception 'REPORT_CALL_AUTHORIZATION_REQUIRED: missing, invalid, inactive, or exhausted call/token authorization';
  end if;

  insert into public.report_model_calls (
    report_id, job_id, call_number, authorization_token, provider, model, schema_name
  ) values (
    target_report_id, job_id, lifetime_count, call_authorization_token, call_provider, call_model, call_schema_name
  ) returning id into created_call_id;

  return jsonb_build_object(
    'callId', created_call_id,
    'callNumber', lifetime_count,
    'authorizationCallNumber', scoped_count
  );
end;
$$;

create or replace function public.finish_report_fulfillment_call(
  call_id uuid,
  call_state text,
  call_input_tokens bigint default 0,
  call_cached_input_tokens bigint default 0,
  call_output_tokens bigint default 0,
  call_total_tokens bigint default 0,
  call_estimated_cost_usd numeric default 0,
  call_response_id text default null,
  call_error text default null
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  target_report_id uuid;
  target_job_id uuid;
  target_authorization_token uuid;
begin
  if call_state not in ('complete', 'error', 'interrupted') then
    raise exception 'Unsupported report call terminal state: %', call_state;
  end if;

  update public.report_model_calls
  set state = call_state,
      input_tokens = greatest(call_input_tokens, 0),
      cached_input_tokens = greatest(call_cached_input_tokens, 0),
      output_tokens = greatest(call_output_tokens, 0),
      total_tokens = greatest(call_total_tokens, 0),
      estimated_cost_usd = greatest(call_estimated_cost_usd, 0),
      response_id = call_response_id,
      error = call_error,
      completed_at = now()
  where id = call_id and completed_at is null
  returning report_id, job_id, authorization_token
  into target_report_id, target_job_id, target_authorization_token;

  if target_report_id is null then
    return false;
  end if;

  update public.user_reports
  set token_count_total = totals.token_total,
      token_spend_usd_estimate = totals.cost_total
  from (
    select coalesce(sum(total_tokens), 0)::bigint as token_total,
           coalesce(sum(estimated_cost_usd), 0)::numeric(12, 6) as cost_total
    from public.report_model_calls
    where report_id = target_report_id
  ) totals
  where id = target_report_id;

  if target_authorization_token is not null then
    update public.report_fulfillment_jobs jobs
    set authorization_token_count = scoped.token_total
    from (
      select coalesce(sum(total_tokens), 0)::bigint as token_total
      from public.report_model_calls
      where job_id = target_job_id
        and authorization_token = target_authorization_token
    ) scoped
    where jobs.id = target_job_id
      and jobs.authorization_token = target_authorization_token;
  end if;

  return true;
end;
$$;

revoke all on function public.begin_report_fulfillment_call(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.finish_report_fulfillment_call(uuid, text, bigint, bigint, bigint, bigint, numeric, text, text) from public, anon, authenticated;
grant execute on function public.begin_report_fulfillment_call(uuid, uuid, text, text, text) to service_role;
grant execute on function public.finish_report_fulfillment_call(uuid, text, bigint, bigint, bigint, bigint, numeric, text, text) to service_role;

comment on column public.user_reports.token_budget_lifetime is
  'Owner-adjustable lifetime token backstop across all authorizations for this report.';
comment on column public.report_fulfillment_jobs.authorization_call_count is
  'Provider calls consumed by the current one-use owner authorization only.';
comment on column public.report_fulfillment_jobs.authorized_token_budget is
  'Token budget granted by the current one-use owner authorization.';
comment on column public.report_fulfillment_jobs.authorization_token_count is
  'All ledger tokens consumed by the current one-use owner authorization only.';
comment on column public.report_model_calls.authorization_token is
  'Authorization identity under which this immutable provider call was made; historical calls may be null.';
