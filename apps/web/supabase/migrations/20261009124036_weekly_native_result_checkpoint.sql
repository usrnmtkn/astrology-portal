-- Capture the original provider response without reading or transferring the
-- edition's history. Operation identity is the compare-and-set boundary.
create or replace function public.checkpoint_weekly_provider_result(
  p_id uuid, p_operation_id text, p_request_hash text,
  p_provider text, p_response_id text, p_result jsonb
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  active jsonb;
begin
  if p_provider not in ('gemini','anthropic') or p_provider is null
    or coalesce(p_operation_id,'')='' or coalesce(p_request_hash,'')=''
    or coalesce(p_response_id,'')='' or jsonb_typeof(p_result) is distinct from 'object'
    or p_result->>'id' is distinct from p_response_id then
    raise exception 'Invalid provider checkpoint';
  end if;
  select g.source_snapshot#>'{horoscopeGeneration,active}' into active
    from public.generated_interpretations g
    where g.id=p_id and g.status='DRAFT' and g.content_key like 'horoscope/%'
      and g.sections#>>'{horoscopeEdition,window,period}'='weekly'
    for update;
  if not found or active->>'id' is distinct from p_operation_id
    or active->>'requestHash' is distinct from p_request_hash
    or active#>>'{config,provider}' is distinct from p_provider
    or active->>'responseId' is distinct from p_response_id
    or active->>'state' is distinct from 'running' then return 'obsolete'; end if;
  if active->'providerResult' is not null and active->'providerResult'<>'null'::jsonb then
    return 'already_saved';
  end if;
  update public.generated_interpretations g
    set source_snapshot=jsonb_set(g.source_snapshot,'{horoscopeGeneration,active,providerResult}',p_result,true)
    where g.id=p_id;
  return 'saved';
end;
$$;
revoke all on function public.checkpoint_weekly_provider_result(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.checkpoint_weekly_provider_result(uuid,text,text,text,text,jsonb) to service_role;
