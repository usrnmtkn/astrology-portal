-- Preserve prior report generations as immutable review evidence while allowing
-- a separately authorized fresh envelope for the same entitlement and window.

alter table public.user_reports
  add column if not exists generation_number integer not null default 1,
  add column if not exists supersedes_report_id uuid references public.user_reports(id) on delete restrict;

alter table public.user_reports
  drop constraint if exists user_reports_generation_number_check;
alter table public.user_reports
  add constraint user_reports_generation_number_check check (generation_number > 0);

drop index if exists public.user_reports_unique_period_idx;
create unique index user_reports_unique_period_idx
  on public.user_reports (
    user_id, report_type, report_domain, report_horizon, subject_id, period_start, generation_number
  ) nulls not distinct;

drop index if exists public.user_reports_entitlement_idx;
create unique index user_reports_entitlement_generation_idx
  on public.user_reports (entitlement_id, generation_number)
  where entitlement_id is not null;

create or replace function public.create_fresh_report_generation(source_report_id uuid)
returns table (report_id uuid, job_id uuid, generation_number integer)
language plpgsql security definer set search_path = public as $$
declare
  source_report public.user_reports%rowtype;
  entitlement_status text;
  next_generation integer;
  created_report_id uuid;
  created_job_id uuid;
begin
  select * into source_report
  from public.user_reports
  where id = source_report_id
  for update;

  if not found or source_report.report_type <> 'report' then
    raise exception 'FRESH_REPORT_SOURCE_NOT_FOUND';
  end if;
  if source_report.entitlement_id is null then
    raise exception 'FRESH_REPORT_ENTITLEMENT_REQUIRED';
  end if;

  select status into entitlement_status
  from public.report_entitlements
  where id = source_report.entitlement_id;
  if entitlement_status is distinct from 'active' then
    raise exception 'FRESH_REPORT_ACTIVE_ENTITLEMENT_REQUIRED';
  end if;

  select coalesce(max(existing.generation_number), 0) + 1 into next_generation
  from public.user_reports existing
  where existing.user_id = source_report.user_id
    and existing.report_type = source_report.report_type
    and existing.report_domain is not distinct from source_report.report_domain
    and existing.report_horizon is not distinct from source_report.report_horizon
    and existing.subject_id is not distinct from source_report.subject_id
    and existing.period_start = source_report.period_start;

  insert into public.user_reports (
    user_id, report_type, report_domain, report_horizon, subject_id,
    period_start, period_end, facts, facts_engine, facts_hash,
    status, entitlement_id, fulfillment_status, fulfillment_timestamps,
    generation_number, supersedes_report_id
  ) values (
    source_report.user_id, source_report.report_type, source_report.report_domain,
    source_report.report_horizon, source_report.subject_id,
    source_report.period_start, source_report.period_end,
    source_report.facts, source_report.facts_engine, source_report.facts_hash,
    'draft', source_report.entitlement_id, 'awaiting_authorization',
    jsonb_build_object('awaiting_authorization', now()),
    next_generation, source_report.id
  ) returning id into created_report_id;

  insert into public.report_fulfillment_jobs (report_id, entitlement_id, state, step)
  values (created_report_id, source_report.entitlement_id, 'paused', 'calculating')
  returning id into created_job_id;

  return query select created_report_id, created_job_id, next_generation;
end;
$$;

revoke all on function public.create_fresh_report_generation(uuid) from public, anon, authenticated;
grant execute on function public.create_fresh_report_generation(uuid) to service_role;

comment on column public.user_reports.generation_number is
  'Immutable generation sequence for repeated owner-authorized report runs over one user/domain/window.';
comment on column public.user_reports.supersedes_report_id is
  'Prior report retained as review evidence when this envelope is a fresh generation.';
comment on function public.create_fresh_report_generation(uuid) is
  'Creates one clean, paused envelope from frozen facts without mutating or deleting its source report.';
