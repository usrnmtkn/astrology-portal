-- Run against a migrated disposable database. All writes are rolled back.

begin;

do $you_report_auth_test$
declare
  member_a uuid := gen_random_uuid();
  created_entitlement_id uuid;
begin
  if to_regclass('public.you_report_entitlements') is null
    or to_regclass('public.you_report_jobs') is null then
    raise exception 'You report lifecycle tables are missing.';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('you_report_entitlements', 'you_report_jobs')
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Browser write RLS policy exists on You report lifecycle state.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('you_report_entitlements', 'you_report_jobs')
      and cmd = 'SELECT'
  ) <> 2 then
    raise exception 'Owner SELECT RLS policy is missing from You report lifecycle state.';
  end if;

  if has_table_privilege('authenticated', 'public.you_report_entitlements', 'INSERT')
    or has_table_privilege('authenticated', 'public.you_report_entitlements', 'UPDATE')
    or has_table_privilege('authenticated', 'public.you_report_entitlements', 'DELETE')
    or has_table_privilege('authenticated', 'public.you_report_jobs', 'INSERT')
    or has_table_privilege('authenticated', 'public.you_report_jobs', 'UPDATE')
    or has_table_privilege('authenticated', 'public.you_report_jobs', 'DELETE') then
    raise exception 'Authenticated browser role can mutate You report lifecycle tables.';
  end if;

  if has_function_privilege('authenticated', 'public.claim_you_report_jobs(text,integer,uuid)', 'EXECUTE') then
    raise exception 'Authenticated browser role can claim You report jobs.';
  end if;
  if not has_function_privilege('service_role', 'public.claim_you_report_jobs(text,integer,uuid)', 'EXECUTE') then
    raise exception 'Service role cannot claim You report jobs.';
  end if;

  insert into auth.users (id) values (member_a);
  insert into public.you_report_entitlements (
    user_id, report_window, target_date, period_end, content_key, product_key, source, status
  ) values (
    member_a,
    'week',
    date '2026-09-07',
    date '2026-09-13',
    'you-transit-reading/week/2026-09-07',
    'you_transit_week',
    'free_test',
    'active'
  ) returning id into created_entitlement_id;

  insert into public.you_report_jobs (
    entitlement_id, user_id, report_window, target_date, period_end, content_key, facts
  ) values (
    created_entitlement_id,
    member_a,
    'week',
    date '2026-09-07',
    date '2026-09-13',
    'you-transit-reading/week/2026-09-07',
    '{}'::jsonb
  );

  if not exists (
    select 1
    from public.you_report_jobs job
    where job.entitlement_id = created_entitlement_id
      and job.report_window = 'week'
  ) then
    raise exception 'A valid You week report job could not be persisted.';
  end if;
end;
$you_report_auth_test$;

rollback;
