-- Large Weekly histories must not become repeated SQL planner constants.
-- Keep the complete document and immutable history; only its write plan changes.
-- Extend the service-only Weekly draft checkpoint to rejection and preparation.
-- Retain complete history in Postgres; review metadata can only be cleared.
-- Existing callers and exact-version concurrency behavior remain unchanged.
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
  document=jsonb_build_object('source_snapshot',saved.source_snapshot,'sections',saved.sections,'body',saved.body,
    'facts',saved.facts,'review_state',saved.review_state,'reviewed_at',saved.reviewed_at);
  for change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(change->'path') is distinct from 'array' then raise exception 'Invalid checkpoint path'; end if;
    select array_agg(value order by ordinal) into path from jsonb_array_elements_text(change->'path') with ordinality as p(value,ordinal);
    if coalesce(array_length(path,1),0)=0 or path[1] not in ('source_snapshot','sections','body','facts','review_state','reviewed_at')
      or (path[1] in ('body','review_state','reviewed_at') and array_length(path,1)<>1) then raise exception 'Invalid checkpoint field'; end if;
    if path[1] in ('review_state','reviewed_at') and
      (change->>'op' is distinct from 'set' or change->'value' is distinct from 'null'::jsonb) then
      raise exception 'Checkpoint cannot approve review';
    end if;
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
    or jsonb_typeof(document->'facts') is distinct from 'object'
    or jsonb_typeof(document->'sections') is distinct from 'object'
    or jsonb_typeof(document->'body') is distinct from 'string'
    or document#>>'{sections,horoscopeEdition,window,period}' is distinct from 'weekly' then
    raise exception 'Invalid checkpoint document';
  end if;
  -- Separate field parameters keep the SQL planner from copying the entire
  -- retained document for every SET expression during a checkpoint.
  saved.source_snapshot=document->'source_snapshot';
  saved.sections=document->'sections';
  saved.body=document->>'body';
  saved.facts=document->'facts';
  if document->'review_state'='null'::jsonb then saved.review_state=null; end if;
  if document->'reviewed_at'='null'::jsonb then saved.reviewed_at=null; end if;
  document=null;
  return query update public.generated_interpretations g
    set source_snapshot=saved.source_snapshot,sections=saved.sections,body=saved.body,
      facts=saved.facts,review_state=saved.review_state,reviewed_at=saved.reviewed_at
    where g.id=p_id and g.updated_at=p_expected_updated_at
    returning g.id,g.updated_at;
end;
$$;
revoke all on function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb) to service_role;
alter function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb) set statement_timeout='25s';
alter function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb) set default_toast_compression='lz4';
alter function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb) set plan_cache_mode='force_generic_plan';

-- Avoid TOAST-writing a full duplicate snapshot before ON CONFLICT discards it.
-- Weekly checkpoints can retain tens of MB of history. Their OLD row normally
-- already exists in the archive; inserting it again consumes I/O and deadline.
-- Preserve the exact snapshots, hash format, append-only guard and privileges.
create or replace function project_privacy.capture_studio_row_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare snapshot jsonb; snapshot_hash text;
begin
  if tg_op <> 'INSERT' then
    snapshot := to_jsonb(old);
    snapshot_hash := encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
    if not exists(select 1 from project_privacy.studio_row_versions v
      where v.row_id=old.id and v.row_sha256=snapshot_hash) then
      insert into project_privacy.studio_row_versions(row_id,row_updated_at,row_sha256,original_row)
        values(old.id,old.updated_at,snapshot_hash,snapshot)
        on conflict(row_id,row_sha256) do nothing;
    end if;
  end if;
  -- The OLD version is already captured; release its full JSON before NEW.
  snapshot=null; snapshot_hash=null;
  if tg_op <> 'DELETE' then
    snapshot := to_jsonb(new);
    snapshot_hash := encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
    if not exists(select 1 from project_privacy.studio_row_versions v
      where v.row_id=new.id and v.row_sha256=snapshot_hash) then
      insert into project_privacy.studio_row_versions(row_id,row_updated_at,row_sha256,original_row)
        values(new.id,new.updated_at,snapshot_hash,snapshot)
        on conflict(row_id,row_sha256) do nothing;
    end if;
  end if;
  return null;
end;
$$;
revoke all on function project_privacy.capture_studio_row_version() from public, anon, authenticated, service_role;
