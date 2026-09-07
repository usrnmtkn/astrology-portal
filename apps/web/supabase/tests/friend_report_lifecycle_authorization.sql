-- Run against a migrated disposable database. All writes are rolled back.

begin;

do $friend_report_auth_test$
declare
  member_a uuid := gen_random_uuid();
  entitlement_id uuid;
begin
  if to_regclass('public.friend_report_entitlements') is null
    or to_regclass('public.friend_report_checkout_intents') is null
    or to_regclass('public.friend_report_jobs') is null then
    raise exception 'Friends report lifecycle tables are missing.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'friend_report_entitlements'
      and column_name = 'subject_id'
      and data_type = 'text'
  ) then
    raise exception 'Friends report subject_id must remain text for social:<uuid> subjects.';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('friend_report_entitlements', 'friend_report_checkout_intents', 'friend_report_jobs')
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Browser write RLS policy exists on Friends report lifecycle state.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('friend_report_entitlements', 'friend_report_checkout_intents', 'friend_report_jobs')
      and cmd = 'SELECT'
  ) <> 3 then
    raise exception 'Owner SELECT RLS policy is missing from Friends report lifecycle state.';
  end if;

  if has_table_privilege('authenticated', 'public.friend_report_entitlements', 'INSERT')
    or has_table_privilege('authenticated', 'public.friend_report_entitlements', 'UPDATE')
    or has_table_privilege('authenticated', 'public.friend_report_entitlements', 'DELETE')
    or has_table_privilege('authenticated', 'public.friend_report_checkout_intents', 'INSERT')
    or has_table_privilege('authenticated', 'public.friend_report_jobs', 'UPDATE') then
    raise exception 'Authenticated browser role can mutate Friends report lifecycle tables.';
  end if;

  if has_function_privilege('authenticated', 'public.claim_friend_report_jobs(text,integer,uuid)', 'EXECUTE') then
    raise exception 'Authenticated browser role can claim Friends report jobs.';
  end if;
  if not has_function_privilege('service_role', 'public.claim_friend_report_jobs(text,integer,uuid)', 'EXECUTE') then
    raise exception 'Service role cannot claim Friends report jobs.';
  end if;

  insert into auth.users (id) values (member_a);
  insert into public.friend_report_entitlements (
    user_id, subject_id, target_date, content_key, source, status
  ) values (
    member_a,
    'social:' || gen_random_uuid()::text,
    date '2026-09-07',
    'friend-transit-reading/social:test/2026-09-07',
    'free_test',
    'active'
  ) returning id into entitlement_id;

  insert into public.friend_report_jobs (
    entitlement_id, user_id, subject_id, target_date, content_key, facts
  )
  select
    entitlement_id,
    member_a,
    entitlement.subject_id,
    entitlement.target_date,
    entitlement.content_key,
    '{}'::jsonb
  from public.friend_report_entitlements entitlement
  where entitlement.id = entitlement_id;

  if not exists (
    select 1 from public.friend_report_jobs where entitlement_id = entitlement_id
  ) then
    raise exception 'A valid social-friend report job could not be persisted.';
  end if;
end;
$friend_report_auth_test$;

rollback;
