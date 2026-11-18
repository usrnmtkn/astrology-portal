-- Explicit owner recovery only. Source bodies/history are retained, never deleted.
create table public.content_baseline_recoveries (
  operation_id uuid primary key,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.content_baseline_recoveries enable row level security;
revoke all on public.content_baseline_recoveries from public, anon, authenticated;
grant select, insert on public.content_baseline_recoveries to service_role;
grant usage on sequence public.content_publications_revision_seq to service_role;

create function public.restore_approved_content_sources(p_operation_id uuid, p_sources jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare item jsonb; source public.generated_interpretations;
  publication public.content_publications; previous public.content_baseline_recoveries;
  result jsonb := '[]'::jsonb; saved jsonb;
begin
  if p_operation_id is null or jsonb_typeof(p_sources) is distinct from 'array'
    or jsonb_array_length(p_sources) not between 1 and 2 then
    raise exception 'Select one approved source or its declared pair.' using errcode = '22023';
  end if;
  -- Serialize retries before touching either source. The receipt stores identities only.
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text, 1));
  select * into previous from public.content_baseline_recoveries where operation_id = p_operation_id;
  if found then
    if previous.request is distinct from p_sources then
      raise exception 'Recovery identity changed.' using errcode = '40001';
    end if;
    for saved in select value from jsonb_array_elements(previous.result) loop
      select * into publication from public.content_publications where content_key = saved->>'contentKey';
      select * into source from public.generated_interpretations where id = (saved->>'id')::uuid;
      if publication.revision is distinct from (saved->'publication'->>'revision')::bigint
        or source.updated_at is distinct from (saved->>'updatedAt')::timestamptz or source.status is distinct from 'ARCHIVED' then
        raise exception 'Recovered content changed. Reload before continuing.' using errcode = '40001';
      end if;
    end loop;
    return previous.result;
  end if;
  if (select count(distinct value->>'contentKey') from jsonb_array_elements(p_sources)) <> jsonb_array_length(p_sources)
    or (select count(distinct value->>'id') from jsonb_array_elements(p_sources)) <> jsonb_array_length(p_sources) then
    raise exception 'Select distinct source identities.' using errcode = '22023';
  end if;
  -- Match the established source-row then content-key publication lock order.
  perform 1 from public.generated_interpretations
    where id in (select (value->>'id')::uuid from jsonb_array_elements(p_sources)) order by id for update;
  for item in select value from jsonb_array_elements(p_sources) order by value->>'contentKey' loop
    if coalesce(item->>'contentKey', '') = '' or coalesce(item->>'baselineSHA256', '') !~ '^[a-f0-9]{64}$' then
      raise exception 'The installed approved source is required.' using errcode = '22023';
    end if;
    select * into source from public.generated_interpretations where id = (item->>'id')::uuid;
    perform pg_advisory_xact_lock(hashtextextended(item->>'contentKey', 0));
    select * into publication from public.content_publications where content_key = item->>'contentKey' for update;
    if source.id is null or source.content_key is distinct from item->>'contentKey'
      or source.updated_at is distinct from (item->>'expectedUpdatedAt')::timestamptz
      or publication.revision is distinct from (item->>'expectedPublicationRevision')::bigint
      or (publication.row_id is not null and publication.row_id <> source.id) then
      raise exception 'This source or its publication changed. Reload before restoring it.' using errcode = '40001';
    end if;
    if source.target_date is not null or source.status = 'ARCHIVED'
      or source.sections @? '$.** ? (@.state == "running" || @.state == "queued" || @.status == "running")'
      or source.source_snapshot @? '$.** ? (@.state == "running" || @.state == "queued" || @.status == "running")' then
      raise exception 'Finish the active writing request and select a reusable source.' using errcode = '22023';
    end if;
    -- Existing version-capture and publication triggers execute in this transaction.
    update public.generated_interpretations set status = 'ARCHIVED', updated_at = clock_timestamp()
      where id = source.id returning * into source;
    insert into public.content_publications(content_key, state, row_id, row_updated_at)
      values(source.content_key, 'live', null, null)
      on conflict(content_key) do update set state = 'live', row_id = null, row_updated_at = null,
        revision = default, updated_at = clock_timestamp() returning * into publication;
    result := result || jsonb_build_array(jsonb_build_object('id', source.id, 'contentKey', source.content_key,
      'updatedAt', source.updated_at, 'baselineSHA256', item->>'baselineSHA256', 'publication', to_jsonb(publication)));
  end loop;
  insert into public.content_baseline_recoveries(operation_id, request, result) values(p_operation_id, p_sources, result);
  return result;
end $$;
revoke all on function public.restore_approved_content_sources(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.restore_approved_content_sources(uuid, jsonb) to service_role;

-- A cancellation tombstone serializes with a delayed request. An absent receipt
-- alone is not evidence that a request cannot still arrive and commit later.
create function public.cancel_content_source_recovery(p_operation_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_operation_id is null then raise exception 'Recovery identity is required' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text, 1));
  insert into public.content_baseline_recoveries(operation_id, request, result)
    values(p_operation_id, '{}'::jsonb, '[]'::jsonb) on conflict(operation_id) do nothing;
end $$;
revoke all on function public.cancel_content_source_recovery(uuid) from public, anon, authenticated;
grant execute on function public.cancel_content_source_recovery(uuid) to service_role;
