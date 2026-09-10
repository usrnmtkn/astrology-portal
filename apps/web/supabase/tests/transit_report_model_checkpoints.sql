-- Disposable database only; all fixtures are rolled back.
begin;
do $$
declare
  member_id uuid := gen_random_uuid();
  entitlement uuid;
  job uuid;
  checkpoint uuid;
  role_name text;
  operation text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.transit_report_model_checkpoints'::regclass) then
    raise exception 'Checkpoint RLS must be enabled';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if has_table_privilege(role_name, 'public.transit_report_model_checkpoints', operation) then
        raise exception 'Browser role % must not % intermediate model responses', role_name, operation;
      end if;
    end loop;
  end loop;
  foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
    if not has_table_privilege('service_role', 'public.transit_report_model_checkpoints', operation) then
      raise exception 'Worker needs checkpoint privilege %', operation;
    end if;
  end loop;
  insert into auth.users(id) values(member_id);
  insert into public.you_report_entitlements(user_id, report_window, target_date, period_end, content_key, product_key, source, status)
    values(member_id, 'day', '2026-09-10', '2026-09-10', 'checkpoint-fixture', 'you_transit_day', 'free_test', 'active') returning id into entitlement;
  insert into public.you_report_jobs(entitlement_id, user_id, report_window, target_date, period_end, content_key, facts)
    values(entitlement, member_id, 'day', '2026-09-10', '2026-09-10', 'checkpoint-fixture', '{}') returning id into job;
  insert into public.transit_report_model_checkpoints(you_job_id, attempt, step, request_hash, state, provider, model, schema_name)
    values(job, 1, 0, 'fixture-hash', 'started', 'fixture', 'fixture', 'fixture') returning id into checkpoint;
  begin
    insert into public.transit_report_model_checkpoints(you_job_id, attempt, step, request_hash, state, provider, model, schema_name)
      values(job, 1, 0, 'fixture-hash', 'started', 'fixture', 'fixture', 'fixture');
    raise exception 'Duplicate billing reservation was accepted';
  exception when unique_violation then null;
  end;
  update public.transit_report_model_checkpoints set state='complete', response='{"value":{"body":"fixture"}}' where id=checkpoint;
  if not exists(select 1 from public.transit_report_model_checkpoints where id=checkpoint and response->'value'->>'body'='fixture') then
    raise exception 'Checkpoint response did not round trip';
  end if;
  -- Stale claims may increment attempt but must retain logical checkpoint identity.
  update public.you_report_jobs set state='running', locked_at=now()-interval '11 minutes', attempt=1 where id=job;
  perform public.claim_you_report_jobs('checkpoint-fixture', 1, job);
  if not exists(select 1 from public.you_report_jobs where id=job and attempt=2 and checkpoint_attempt=1) then
    raise exception 'Stale claim lost checkpoint identity';
  end if;
  delete from public.you_report_jobs where id=job;
  if exists(select 1 from public.transit_report_model_checkpoints where id=checkpoint) then
    raise exception 'Deleted jobs must not leave private report drafts behind';
  end if;
end;
$$;
rollback;
