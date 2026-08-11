-- Make report-worker claims expiring leases. Vercel's hard ceiling is 300
-- seconds; the extra 90 seconds prevents another worker from reclaiming a job
-- that is still inside the platform termination window.

alter table public.report_fulfillment_jobs
  add column if not exists lease_expires_at timestamptz;

update public.report_fulfillment_jobs
set lease_expires_at = locked_at + interval '390 seconds'
where state = 'running'
  and locked_at is not null
  and lease_expires_at is null;

create index if not exists report_fulfillment_jobs_lease_idx
  on public.report_fulfillment_jobs (state, lease_expires_at);

create or replace function public.claim_report_fulfillment_jobs(worker_id text, batch_limit integer default 5)
returns setof public.report_fulfillment_jobs
language plpgsql security definer set search_path = public as $$
declare
  candidate_id uuid;
  candidate_was_stale boolean;
begin
  for candidate_id, candidate_was_stale in
    select jobs.id, jobs.state = 'running'
    from public.report_fulfillment_jobs jobs
    where (
      jobs.state in ('queued', 'retry')
      and jobs.run_after <= now()
    ) or (
      jobs.state = 'running'
      and coalesce(jobs.lease_expires_at, jobs.locked_at + interval '390 seconds') <= now()
    )
    order by jobs.run_after, jobs.created_at
    for update skip locked
    limit greatest(1, least(batch_limit, 25))
  loop
    if candidate_was_stale then
      update public.report_model_calls calls
      set state = 'interrupted',
          input_tokens = 0,
          cached_input_tokens = 0,
          output_tokens = 0,
          total_tokens = 0,
          estimated_cost_usd = 0,
          response_id = null,
          error = 'WORKER_LEASE_EXPIRED: orphaned provider call interrupted during stale job reclaim.',
          completed_at = now()
      where calls.job_id = candidate_id
        and calls.state = 'authorized'
        and calls.completed_at is null;
    end if;

    return query
    update public.report_fulfillment_jobs jobs
    set state = 'running',
        locked_at = now(),
        locked_by = worker_id,
        lease_expires_at = now() + interval '390 seconds',
        attempt = jobs.attempt + 1,
        last_error = null
    where jobs.id = candidate_id
    returning jobs.*;
  end loop;
end;
$$;

create or replace function public.claim_report_fulfillment_job(worker_id text, target_job_id uuid)
returns setof public.report_fulfillment_jobs
language plpgsql security definer set search_path = public as $$
declare
  candidate_id uuid;
  candidate_was_stale boolean;
begin
  select jobs.id, jobs.state = 'running'
  into candidate_id, candidate_was_stale
  from public.report_fulfillment_jobs jobs
  where jobs.id = target_job_id
    and (
      (jobs.state in ('queued', 'retry') and jobs.run_after <= now())
      or (
        jobs.state = 'running'
        and coalesce(jobs.lease_expires_at, jobs.locked_at + interval '390 seconds') <= now()
      )
    )
  for update skip locked;

  if candidate_id is null then return; end if;

  if candidate_was_stale then
    update public.report_model_calls calls
    set state = 'interrupted',
        input_tokens = 0,
        cached_input_tokens = 0,
        output_tokens = 0,
        total_tokens = 0,
        estimated_cost_usd = 0,
        response_id = null,
        error = 'WORKER_LEASE_EXPIRED: orphaned provider call interrupted during stale job reclaim.',
        completed_at = now()
    where calls.job_id = candidate_id
      and calls.state = 'authorized'
      and calls.completed_at is null;
  end if;

  return query
  update public.report_fulfillment_jobs jobs
  set state = 'running',
      locked_at = now(),
      locked_by = worker_id,
      lease_expires_at = now() + interval '390 seconds',
      attempt = jobs.attempt + 1,
      last_error = null
  where jobs.id = candidate_id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_report_fulfillment_jobs(text, integer) from public, anon, authenticated;
revoke all on function public.claim_report_fulfillment_job(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_report_fulfillment_jobs(text, integer) to service_role;
grant execute on function public.claim_report_fulfillment_job(text, uuid) to service_role;

comment on column public.report_fulfillment_jobs.lease_expires_at is
  'Exclusive worker lease. A scheduled worker may reclaim a running job only after this time, 90 seconds beyond the 300-second platform ceiling.';
comment on function public.claim_report_fulfillment_jobs(text, integer) is
  'Claims queued work or expired running leases; stale authorized calls close as zero-token interrupted ledger rows before reclaim.';
