-- Service-only CAS for generation checkpoints. Preserve the complete document
-- in Postgres while transporting only changed fields and appended history.
create or replace function public.checkpoint_weekly_horoscope(
  p_id uuid, p_expected_updated_at timestamptz, p_changes jsonb
) returns table(id uuid, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare
  saved public.generated_interpretations%rowtype;
  document jsonb;
  change jsonb;
  path text[];
begin
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) > 512 then
    raise exception 'Invalid checkpoint changes';
  end if;
  select g.* into saved from public.generated_interpretations g
    where g.id=p_id and g.updated_at=p_expected_updated_at and g.status='DRAFT'
      and g.content_key like 'horoscope/%'
      and g.sections#>>'{horoscopeEdition,window,period}'='weekly'
    for update;
  if not found then return; end if;
  document=jsonb_build_object('source_snapshot',saved.source_snapshot,'sections',saved.sections,'body',saved.body);
  for change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(change->'path') is distinct from 'array' then raise exception 'Invalid checkpoint path'; end if;
    select array_agg(value order by ordinal) into path from jsonb_array_elements_text(change->'path') with ordinality as p(value,ordinal);
    if coalesce(array_length(path,1),0)=0 or path[1] not in ('source_snapshot','sections','body')
      or (path[1]='body' and array_length(path,1)<>1) then raise exception 'Invalid checkpoint field'; end if;
    if change->>'op'='delete' and array_length(path,1)>1 then
      document=document #- path;
    elsif change->>'op'='set' and change ? 'value' then
      if array_length(path,1)>1 and jsonb_typeof(document #> path[1:array_length(path,1)-1]) is distinct from 'object' then
        raise exception 'Checkpoint parent is missing';
      end if;
      document=jsonb_set(document,path,change->'value',true);
    elsif change->>'op'='append' and jsonb_typeof(document #> path)='array' and jsonb_typeof(change->'value')='array' then
      document=jsonb_set(document,path,(document #> path)||(change->'value'),false);
    else raise exception 'Invalid checkpoint operation';
    end if;
  end loop;
  if jsonb_typeof(document->'source_snapshot') is distinct from 'object'
    or jsonb_typeof(document->'sections') is distinct from 'object'
    or jsonb_typeof(document->'body') is distinct from 'string'
    or document#>>'{sections,horoscopeEdition,window,period}' is distinct from 'weekly' then
    raise exception 'Invalid checkpoint document';
  end if;
  return query update public.generated_interpretations g
    set source_snapshot=document->'source_snapshot',sections=document->'sections',body=document->>'body'
    where g.id=p_id and g.updated_at=p_expected_updated_at
    returning g.id,g.updated_at;
end;
$$;
revoke all on function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb) to service_role;
