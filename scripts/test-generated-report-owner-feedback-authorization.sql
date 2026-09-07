do $$
begin
  if to_regclass('public.generated_report_owner_feedback') is null then
    raise exception 'generated_report_owner_feedback table is missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'generated_report_owner_feedback'
      and c.relrowsecurity
  ) then
    raise exception 'generated_report_owner_feedback must have RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.generated_report_owner_feedback', 'SELECT')
    or has_table_privilege('anon', 'public.generated_report_owner_feedback', 'INSERT')
    or has_table_privilege('anon', 'public.generated_report_owner_feedback', 'UPDATE')
    or has_table_privilege('anon', 'public.generated_report_owner_feedback', 'DELETE') then
    raise exception 'anon must have no generated_report_owner_feedback access';
  end if;

  if has_table_privilege('authenticated', 'public.generated_report_owner_feedback', 'SELECT')
    or has_table_privilege('authenticated', 'public.generated_report_owner_feedback', 'INSERT')
    or has_table_privilege('authenticated', 'public.generated_report_owner_feedback', 'UPDATE')
    or has_table_privilege('authenticated', 'public.generated_report_owner_feedback', 'DELETE') then
    raise exception 'authenticated must have no generated_report_owner_feedback access';
  end if;

  if not has_table_privilege('service_role', 'public.generated_report_owner_feedback', 'SELECT')
    or not has_table_privilege('service_role', 'public.generated_report_owner_feedback', 'INSERT')
    or not has_table_privilege('service_role', 'public.generated_report_owner_feedback', 'UPDATE')
    or not has_table_privilege('service_role', 'public.generated_report_owner_feedback', 'DELETE') then
    raise exception 'service_role must own generated_report_owner_feedback CRUD';
  end if;
end
$$;
