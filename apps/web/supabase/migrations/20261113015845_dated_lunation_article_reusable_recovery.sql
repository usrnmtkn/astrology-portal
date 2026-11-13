-- Extend the existing owner-only recovery to the reader article staged by the
-- dated writer. Its one calculated macro and the horoscope set's twelve source
-- keys remain distinct. Archived writing and reusable publications stay unchanged.
create or replace function public.restore_moon_reusable_readings(p_operation_id uuid, p_source jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare source public.generated_interpretations; reusable public.generated_interpretations; publication public.content_publications;
  previous public.content_baseline_recoveries; fallback jsonb; current_revision bigint;
  request jsonb := jsonb_build_object('kind','moon-reusable','source',p_source);
  result jsonb; saved jsonb; fallback_prefix text;
begin
  if p_operation_id is null or jsonb_typeof(p_source) is distinct from 'object'
    or coalesce(p_source->>'baselineSHA256','') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_source->'fallbacks') is distinct from 'array'
    or jsonb_array_length(p_source->'fallbacks') not in (1,12) then
    raise exception 'Select a verified Moon reusable-reading recovery.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text,1));
  select * into previous from public.content_baseline_recoveries where operation_id=p_operation_id;
  if found then
    if previous.request is distinct from request then
      raise exception 'Recovery identity changed.' using errcode = '40001';
    end if;
    saved := previous.result->0;
    select * into source from public.generated_interpretations where id=(p_source->>'id')::uuid;
    select * into publication from public.content_publications where content_key=p_source->>'contentKey';
    if source.status is distinct from 'ARCHIVED' or source.updated_at is distinct from (p_source->>'expectedUpdatedAt')::timestamptz
      or publication.revision is distinct from (saved->'publication'->>'revision')::bigint then
      raise exception 'Recovered content changed.' using errcode = '40001';
    end if;
    for fallback in select value from jsonb_array_elements(p_source->'fallbacks') loop
      select revision into current_revision from public.content_publications where content_key=fallback->>'contentKey';
      if current_revision is distinct from (fallback->>'expectedPublicationRevision')::bigint then
        raise exception 'Reusable publication changed.' using errcode = '40001';
      end if;
    end loop;
    return previous.result;
  end if;
  -- Match publication's established source-row then content-key lock order.
  select * into source from public.generated_interpretations where id=(p_source->>'id')::uuid for update;
  if source.id is null or source.content_key is distinct from p_source->>'contentKey'
    or source.updated_at is distinct from (p_source->>'expectedUpdatedAt')::timestamptz then
    raise exception 'The saved Moon readings changed.' using errcode = '40001';
  end if;
  if source.status is distinct from 'ARCHIVED' or source.mode is distinct from 'article' or source.surface is distinct from 'sky'
    or source.event_type not in ('lunation-horoscopes','lunation-article') or source.event_type is null or source.target_date is not null
    or coalesce(source.content_key,'') !~ '^cms/(lunation-horoscopes|lunation-article)/[0-9]{4}-[0-9]{2}-[0-9]{2}/(new-moon|full-moon)/(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$'
    or split_part(source.content_key,'/',2) is distinct from source.event_type
    or source.sections @? '$.** ? (@.state == "running" || @.state == "queued" || @.status == "running")'
    or source.source_snapshot @? '$.** ? (@.state == "running" || @.state == "queued" || @.status == "running")' then
    raise exception 'Select an idle archived dated Moon horoscope set.' using errcode = '22023';
  end if;
  if source.event_type='lunation-article' then
    if jsonb_array_length(p_source->'fallbacks')<>1 or p_source#>>'{fallbacks,0,contentKey}' is distinct from
      'authored/sky-lunation-macro/'||split_part(source.content_key,'/',4)||'/'||split_part(source.content_key,'/',5) then
      raise exception 'Select the matching independent reusable article.' using errcode = '22023';
    end if;
  else
    fallback_prefix := 'authored/book-ritual-and-the-moon/lunation-horoscope/'||split_part(source.content_key,'/',4)||'/'||split_part(source.content_key,'/',5)||'/';
    if jsonb_array_length(p_source->'fallbacks')<>12
      or (select count(distinct value->>'contentKey') from jsonb_array_elements(p_source->'fallbacks')) <> 12
      or exists(select 1 from jsonb_array_elements(p_source->'fallbacks') value where not starts_with(value->>'contentKey',fallback_prefix)) then
      raise exception 'Select the matching independent reusable readings.' using errcode = '22023';
    end if;
  end if;
  -- Published macro dependencies follow the same source-row-before-key lock order.
  if source.event_type='lunation-article' then
    fallback := p_source#>'{fallbacks,0}';
    if fallback ? 'expectedRowId' then
      select * into reusable from public.generated_interpretations where id=(fallback->>'expectedRowId')::uuid for update;
      if reusable.id is null or reusable.content_key is distinct from fallback->>'contentKey'
        or reusable.updated_at is distinct from (fallback->>'expectedRowUpdatedAt')::timestamptz
        or reusable.status is distinct from 'LIVE' or reusable.lane is distinct from 'serving'
        or reusable.review_state is not null or reusable.target_date is not null then
        raise exception 'Reusable source changed.' using errcode='40001';
      end if;
    end if;
  end if;
  -- Lock every dependent publication in deterministic order before checking CAS.
  for fallback in select value from jsonb_array_elements(p_source->'fallbacks') order by value->>'contentKey' loop
    perform pg_advisory_xact_lock(hashtextextended(fallback->>'contentKey',0));
    select revision into current_revision from public.content_publications where content_key=fallback->>'contentKey' for update;
    if current_revision is distinct from (fallback->>'expectedPublicationRevision')::bigint then
      raise exception 'Reusable publication changed.' using errcode = '40001';
    end if;
    if source.event_type='lunation-article' and exists(select 1 from public.content_publications p where p.content_key=fallback->>'contentKey' and (p.state<>'live' or p.row_id is not null and not (fallback ? 'expectedRowId'))) then
      raise exception 'Reusable publication changed.' using errcode='40001';
    end if;
    if source.event_type='lunation-article' and fallback ? 'expectedRowId' and not exists(
      select 1 from public.content_publications p where p.content_key=fallback->>'contentKey'
      and p.state='live' and p.row_id=(fallback->>'expectedRowId')::uuid
      and p.row_updated_at=(fallback->>'expectedRowUpdatedAt')::timestamptz) then
      raise exception 'Reusable publication changed.' using errcode='40001';
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(source.content_key,0));
  select * into publication from public.content_publications where content_key=source.content_key for update;
  if publication.revision is distinct from (p_source->>'expectedPublicationRevision')::bigint
    or publication.state is distinct from 'retired' or publication.row_id is not null and publication.row_id<>source.id then
    raise exception 'The dated Moon publication changed.' using errcode = '40001';
  end if;
  insert into public.content_publications(content_key,state,row_id,row_updated_at)
    values(source.content_key,'live',null,null)
    on conflict(content_key) do update set state='live',row_id=null,row_updated_at=null,revision=default,updated_at=clock_timestamp()
    returning * into publication;
  result := jsonb_build_array(jsonb_build_object('id',source.id,'contentKey',source.content_key,'updatedAt',source.updated_at,
    'baselineSHA256',p_source->>'baselineSHA256','publication',to_jsonb(publication)));
  insert into public.content_baseline_recoveries(operation_id,request,result) values(p_operation_id,request,result);
  return result;
end $$;
revoke all on function public.restore_moon_reusable_readings(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.restore_moon_reusable_readings(uuid,jsonb) to service_role;
