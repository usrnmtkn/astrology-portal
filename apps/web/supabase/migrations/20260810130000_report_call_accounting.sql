-- Append-only model-call ledger and accepted-work versus all-attempt accounting.

alter table public.user_reports
  add column if not exists token_count_total bigint not null default 0,
  add column if not exists token_spend_usd_estimate numeric(12, 6) not null default 0;

create table if not exists public.report_model_calls (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.user_reports(id) on delete cascade,
  job_id uuid not null references public.report_fulfillment_jobs(id) on delete cascade,
  call_number integer not null check (call_number > 0),
  provider text not null,
  model text not null,
  schema_name text not null,
  state text not null default 'authorized' check (state in ('authorized', 'complete', 'error', 'interrupted')),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  cached_input_tokens bigint not null default 0 check (cached_input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  total_tokens bigint not null default 0 check (total_tokens >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0 check (estimated_cost_usd >= 0),
  response_id text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (job_id, call_number)
);

create index if not exists report_model_calls_report_idx
  on public.report_model_calls (report_id, call_number);

alter table public.report_model_calls enable row level security;

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
  consumed_count integer;
  target_report_id uuid;
  created_call_id uuid;
begin
  update public.report_fulfillment_jobs
  set model_call_count = model_call_count + 1,
      authorization_consumed_at = coalesce(authorization_consumed_at, now())
  where id = job_id
    and state = 'running'
    and authorization_token = call_authorization_token
    and authorized_call_budget is not null
    and model_call_count < authorized_call_budget
  returning model_call_count, report_id into consumed_count, target_report_id;

  if consumed_count is null then
    raise exception 'REPORT_CALL_AUTHORIZATION_REQUIRED: missing, invalid, inactive, or exhausted model-call authorization';
  end if;

  insert into public.report_model_calls (
    report_id, job_id, call_number, provider, model, schema_name
  ) values (
    target_report_id, job_id, consumed_count, call_provider, call_model, call_schema_name
  ) returning id into created_call_id;

  return jsonb_build_object('callId', created_call_id, 'callNumber', consumed_count);
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
  returning report_id into target_report_id;

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

  return true;
end;
$$;

revoke all on function public.begin_report_fulfillment_call(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.finish_report_fulfillment_call(uuid, text, bigint, bigint, bigint, bigint, numeric, text, text) from public, anon, authenticated;
grant execute on function public.begin_report_fulfillment_call(uuid, uuid, text, text, text) to service_role;
grant execute on function public.finish_report_fulfillment_call(uuid, text, bigint, bigint, bigint, bigint, numeric, text, text) to service_role;

comment on table public.report_model_calls is
  'Append-only identity ledger for every authorized provider attempt. Rows may transition once from authorized to a terminal state; completed rows are immutable through the finish RPC.';
comment on column public.user_reports.token_count is
  'Tokens for accepted report work only; rejected and interrupted attempts are excluded.';
comment on column public.user_reports.token_count_total is
  'All known tokens from the immutable provider-attempt ledger, including rejected attempts.';
comment on column public.user_reports.token_spend_usd_estimate is
  'Estimated all-attempt cost from the owner-editable pricing configuration; not a provider invoice.';
