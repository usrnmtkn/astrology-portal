-- Owner ruling, 2026-08-11: recover report 74951c07 from the observed Vercel
-- 300-second worker termination without changing its authorization identity or
-- 55-call ceiling. Call 37 never returned usage and is closed as interrupted.

do $$
declare
  target_report_id constant uuid := '74951c07-64fe-461d-ac49-e81858af3296';
  target_job_id constant uuid := '1e6633f3-7ac3-4326-ba35-ae21474b45dd';
begin
  if not exists (select 1 from public.user_reports where id = target_report_id) then
    -- Fresh and preview databases do not contain this Production report.
    return;
  end if;

  update public.report_model_calls
  set state = 'interrupted',
      error = 'VERCEL_RUNTIME_TIMEOUT: Task timed out after 300 seconds; no provider usage was recorded.',
      completed_at = now()
  where report_id = target_report_id
    and job_id = target_job_id
    and call_number = 37
    and state = 'authorized'
    and completed_at is null
    and total_tokens = 0;

  if not found and not exists (
    select 1 from public.report_model_calls
    where report_id = target_report_id
      and job_id = target_job_id
      and call_number = 37
      and state = 'interrupted'
      and total_tokens = 0
  ) then
    raise exception 'REPORT_RECOVERY_STATE_MISMATCH: call 37 is not the zero-token authorized timeout row';
  end if;

  update public.user_reports
  set token_budget_lifetime = 4500000
  where id = target_report_id
    and token_count_total = 2050321
    and token_budget_lifetime in (3000000, 4500000);

  if not found then
    raise exception 'REPORT_RECOVERY_STATE_MISMATCH: report lifetime ledger does not match 2050321 tokens';
  end if;

  update public.report_fulfillment_jobs
  set state = 'queued',
      step = 'writing',
      run_after = now(),
      locked_at = null,
      locked_by = null,
      last_error = null,
      authorized_token_budget = 2500000
  where id = target_job_id
    and report_id = target_report_id
    and state = 'running'
    and authorization_token is not null
    and model_call_count = 37
    and authorized_call_budget = 55
    and authorization_call_count = 15
    and authorized_token_budget = 1450000
    and authorization_token_count = 793038;

  if not found and not exists (
    select 1 from public.report_fulfillment_jobs
    where id = target_job_id
      and report_id = target_report_id
      and authorization_token is not null
      and model_call_count = 37
      and authorized_call_budget = 55
      and authorization_call_count = 15
      and authorized_token_budget = 2500000
      and authorization_token_count = 793038
  ) then
    raise exception 'REPORT_RECOVERY_STATE_MISMATCH: current authorization counters do not match the owner-approved recovery state';
  end if;
end;
$$;
