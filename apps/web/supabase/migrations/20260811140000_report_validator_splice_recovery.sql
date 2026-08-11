-- Owner ruling, 2026-08-11: resume Marie's general 12-month report after the
-- Summer validator cap failure. Preserve the authorization identity and all
-- prior ledger/history rows while extending only this authorization and this
-- unit's validator-attempt allowance.

alter table public.report_fulfillment_jobs
  add column if not exists validator_attempt_overrides jsonb not null default '{}'::jsonb;

alter table public.report_fulfillment_jobs
  drop constraint if exists report_fulfillment_jobs_validator_attempt_overrides_object_check;

alter table public.report_fulfillment_jobs
  add constraint report_fulfillment_jobs_validator_attempt_overrides_object_check
  check (jsonb_typeof(validator_attempt_overrides) = 'object');

comment on column public.report_fulfillment_jobs.validator_attempt_overrides is
  'Owner-approved per-unit validator attempt caps. Missing unit keys use the governed global cap.';

do $$
declare
  target_report_id constant uuid := '74951c07-64fe-461d-ac49-e81858af3296';
  target_job_id constant uuid := '1e6633f3-7ac3-4326-ba35-ae21474b45dd';
  existing_authorization uuid;
begin
  select authorization_token into existing_authorization
  from public.report_fulfillment_jobs
  where id = target_job_id
    and report_id = target_report_id
    and state = 'exception'
    and step = 'validating'
    and attempt = 7
    and model_call_count = 65
    and authorized_call_budget = 55
    and authorization_call_count = 43
    and authorized_token_budget = 2500000
    and authorization_token_count = 2081764
    and authorization_token is not null;

  if existing_authorization is null then
    raise exception 'REPORT_VALIDATOR_RECOVERY_STATE_MISMATCH: job or authorization counters differ from the owner-reviewed exception state';
  end if;

  if not exists (
    select 1
    from public.user_reports
    where id = target_report_id
      and fulfillment_status = 'exception'
      and token_count = 879475
      and token_count_total = 3339047
      and token_budget_lifetime = 4500000
  ) then
    raise exception 'REPORT_VALIDATOR_RECOVERY_STATE_MISMATCH: report accounting differs from the owner-reviewed exception state';
  end if;

  if (
    select coalesce(array_agg(replace(content_key, 'report:' || target_report_id::text || ':', '') order by content_key), '{}'::text[])
    from public.user_generated_interpretations
    where subject_type = 'report_unit'
      and subject_id = target_report_id::text
      and source_snapshot->>'fulfillmentPassed' = 'true'
  ) <> array['domain:main', 'overview', 'spring', 'winter-current', 'year-theme']::text[] then
    raise exception 'REPORT_VALIDATOR_RECOVERY_STATE_MISMATCH: the five owner-reviewed persisted units changed';
  end if;

  update public.user_reports
  set fulfillment_status = 'writing',
      token_budget_lifetime = 6000000,
      updated_at = now()
  where id = target_report_id;

  update public.report_fulfillment_jobs
  set state = 'queued',
      step = 'writing',
      run_after = now(),
      locked_at = null,
      locked_by = null,
      last_error = null,
      authorized_call_budget = 85,
      authorized_token_budget = 4000000,
      validator_attempt_overrides = jsonb_set(validator_attempt_overrides, '{summer}', '5'::jsonb, true),
      updated_at = now()
  where id = target_job_id
    and authorization_token = existing_authorization;

  if not exists (
    select 1
    from public.report_fulfillment_jobs
    where id = target_job_id
      and report_id = target_report_id
      and state = 'queued'
      and step = 'writing'
      and attempt = 7
      and model_call_count = 65
      and authorization_token = existing_authorization
      and authorized_call_budget = 85
      and authorization_call_count = 43
      and authorized_token_budget = 4000000
      and authorization_token_count = 2081764
      and validator_attempt_overrides->>'summer' = '5'
  ) then
    raise exception 'REPORT_VALIDATOR_RECOVERY_STATE_MISMATCH: approved recovery values were not persisted';
  end if;
end;
$$;
