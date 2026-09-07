do $$
begin
  if has_table_privilege('anon', 'public.you_report_entitlements', 'select') then
    raise exception 'anon must not select You report entitlements';
  end if;
  if has_table_privilege('anon', 'public.you_report_jobs', 'select') then
    raise exception 'anon must not select You report jobs';
  end if;
  if not has_table_privilege('authenticated', 'public.you_report_entitlements', 'select') then
    raise exception 'authenticated must be able to select own You report entitlements';
  end if;
  if not has_table_privilege('authenticated', 'public.you_report_jobs', 'select') then
    raise exception 'authenticated must be able to select own You report jobs';
  end if;
  if has_function_privilege('anon', 'public.claim_you_report_jobs(text,integer,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.claim_you_report_jobs(text,integer,uuid)', 'execute') then
    raise exception 'You report job claim must remain server-only';
  end if;
  if not has_function_privilege('service_role', 'public.claim_you_report_jobs(text,integer,uuid)', 'execute') then
    raise exception 'service_role must be able to claim You report jobs';
  end if;
end
$$;
