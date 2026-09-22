-- Install before enabling the atomic owner publication route. Both receipts and
-- saved target payloads are private; readers use /api/content-reader only.
create table project_privacy.studio_publication_operations (
  operation_id text primary key check(operation_id ~ '^[a-f0-9]{64}$'),
  actor text not null,
  request_sha256 text not null,
  payload_sha256 text not null,
  validation_context jsonb not null,
  proposal_id uuid not null,
  proposal_version timestamptz not null,
  target_id uuid not null,
  target_version timestamptz not null,
  action text not null,
  receipt jsonb not null,
  committed_at timestamptz not null default clock_timestamp()
);
alter table project_privacy.studio_publication_operations enable row level security;
revoke all on project_privacy.studio_publication_operations from public, anon, authenticated, service_role;
create trigger studio_publication_operations_immutable
before update or delete on project_privacy.studio_publication_operations
for each row execute function project_privacy.reject_studio_version_change();

create function public.content_studio_publication_receipt(p_operation_id text, p_actor text, p_request_sha256 text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare operation project_privacy.studio_publication_operations%rowtype;
begin
  select * into operation from project_privacy.studio_publication_operations where operation_id=p_operation_id;
  if not found then return null; end if;
  if operation.actor is distinct from p_actor or operation.request_sha256 is distinct from p_request_sha256 then
    raise sqlstate '40001' using message='Publication operation identity conflicts';
  end if;
  return operation.receipt;
end;
$$;
revoke all on function public.content_studio_publication_receipt(text,text,text) from public, anon, authenticated;
grant execute on function public.content_studio_publication_receipt(text,text,text) to service_role;

create function public.content_studio_publish_revision(
  p_operation_id text, p_actor text, p_request_sha256 text, p_action text,
  p_proposal_id uuid, p_proposal_version timestamptz,
  p_target_id uuid, p_target_version timestamptz, p_patch jsonb,
  p_validation_context jsonb default '{}'::jsonb, p_dependencies jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  operation project_privacy.studio_publication_operations%rowtype;
  target public.generated_interpretations%rowtype;
  proposal public.generated_interpretations%rowtype;
  next_row public.generated_interpretations%rowtype;
  dependency jsonb;
  dependency_row public.generated_interpretations%rowtype;
  current_publication jsonb;
  payload_hash text;
  result jsonb;
begin
  if p_operation_id is null or p_operation_id !~ '^[a-f0-9]{64}$'
    or p_actor is null or length(p_actor) not between 1 and 256
    or p_request_sha256 is null or p_request_sha256 !~ '^[a-f0-9]{64}$'
    or p_proposal_id is null or p_target_id is null or p_proposal_version is null or p_target_version is null
    or p_action is null or p_action not in ('approve-package-revision','publish-sky-article-edition-revision')
    or jsonb_typeof(p_patch) is distinct from 'object'
    or jsonb_typeof(p_dependencies) is distinct from 'array' or jsonb_array_length(p_dependencies)>200
    or jsonb_typeof(p_validation_context) is distinct from 'object' then
    raise sqlstate '22023' using message='Invalid versioned publication request';
  end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where k not in (
    'headline','summary','body','sections','facts','source_snapshot','mode','event_type',
    'status','lane','review_state','reviewed_at','published_at','updated_at',
    'judge_score','judge_gate','judge_verdict','judge_why','reviewer_notes')) then
    raise sqlstate '22023' using message='Unsupported publication fields';
  end if;
  payload_hash:=encode(sha256(convert_to(jsonb_build_object('patch',p_patch,'dependencies',p_dependencies,'validation',p_validation_context)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(p_operation_id,1));
  select * into operation from project_privacy.studio_publication_operations where operation_id=p_operation_id;
  if found then
    if operation.actor is distinct from p_actor or operation.request_sha256 is distinct from p_request_sha256
      or operation.payload_sha256 is distinct from payload_hash or operation.action is distinct from p_action
      or operation.proposal_id is distinct from p_proposal_id or operation.proposal_version is distinct from p_proposal_version
      or operation.target_id is distinct from p_target_id or operation.target_version is distinct from p_target_version then
      raise sqlstate '40001' using message='Publication operation identity conflicts';
    end if;
    return operation.receipt;
  end if;

  -- Existing publish/retire paths lock the target before the publication key.
  -- The completion trigger also follows target -> proposal, so retain that order.
  select * into target from public.generated_interpretations where id=p_target_id for update;
  if not found or target.updated_at is distinct from p_target_version then
    raise sqlstate '40001' using message='The publication target changed';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target.content_key,0));
  select jsonb_build_object('content_key',content_key,'state',state,'revision',revision,'row_id',row_id,'row_updated_at',row_updated_at)
    into current_publication from public.content_publications where content_key=target.content_key for update;
  if not (p_validation_context ? 'targetPublication') or (
    coalesce(current_publication,'null'::jsonb) is distinct from coalesce(p_validation_context->'targetPublication','null'::jsonb)
    and (current_publication->>'revision' is distinct from p_validation_context->'targetPublication'->>'revision'
      or current_publication->>'state' is distinct from p_validation_context->'targetPublication'->>'state'
      or current_publication->>'row_id' is distinct from p_validation_context->'targetPublication'->>'row_id'
      or (current_publication->>'row_updated_at')::timestamptz is distinct from (p_validation_context->'targetPublication'->>'row_updated_at')::timestamptz)) then
    raise sqlstate '40001' using message='Publication state changed during validation';
  end if;
  select * into proposal from public.generated_interpretations where id=p_proposal_id for update;
  if not found or proposal.updated_at is distinct from p_proposal_version then
    raise sqlstate '40001' using message='The saved proposal changed';
  end if;
  if p_proposal_id<>p_target_id and (
    proposal.status <> 'DRAFT' or proposal.source_snapshot->>'targetRowId' is distinct from p_target_id::text
    or (proposal.source_snapshot->>'targetRowUpdatedAt')::timestamptz is distinct from p_target_version
    or (proposal.content_key is distinct from target.content_key
      and proposal.source_snapshot->>'targetContentKey' is distinct from target.content_key)) then
    raise sqlstate '40001' using message='Reopen the source and save a current proposal before publishing';
  end if;

  -- Validation reads happen before dispatch. Lock and compare every dynamic
  -- dependency before applying that validation result. Deadlocks/conflicts abort
  -- the transaction; callers must recover/check the same operation, never replay.
  for dependency in select value from jsonb_array_elements(p_dependencies) order by value->>'id' loop
    select * into dependency_row from public.generated_interpretations where id=(dependency->>'id')::uuid for share;
    if not found or dependency_row.updated_at is distinct from (dependency->>'updatedAt')::timestamptz then
      raise sqlstate '40001' using message='Referenced writing changed during publication';
    end if;
    if dependency ? 'publicationRevision' then
      perform 1 from public.content_publications where content_key=dependency_row.content_key
        and state='live' and row_id=dependency_row.id and row_updated_at=dependency_row.updated_at
        and revision=(dependency->>'publicationRevision')::bigint for share;
      if not found then raise sqlstate '40001' using message='Referenced publication changed'; end if;
    end if;
  end loop;

  select * into next_row from jsonb_populate_record(target,p_patch);
  if next_row.status <> 'LIVE' or next_row.lane <> 'serving' or next_row.review_state is not null
    or jsonb_typeof(next_row.sections->'packageDraft')='object' then
    raise sqlstate '22023' using message='Publication requires a completed reader-eligible revision';
  end if;
  next_row.updated_at:=greatest(clock_timestamp(),target.updated_at+interval '1 microsecond');
  perform set_config('request.headers',
    (coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb || '{"x-content-publication-action":"publish"}'::jsonb)::text,true);
  -- The restricted function is the authenticated server publication boundary.
  -- Existing ledger trigger additionally requires the service-role JWT claim.
  update public.generated_interpretations set
    headline=next_row.headline,summary=next_row.summary,body=next_row.body,sections=next_row.sections,
    facts=next_row.facts,source_snapshot=next_row.source_snapshot,mode=next_row.mode,event_type=next_row.event_type,
    status=next_row.status,lane=next_row.lane,review_state=next_row.review_state,
    reviewed_at=next_row.reviewed_at,published_at=next_row.published_at,updated_at=next_row.updated_at,
    judge_score=next_row.judge_score,judge_gate=next_row.judge_gate,judge_verdict=next_row.judge_verdict,
    judge_why=next_row.judge_why,reviewer_notes=next_row.reviewer_notes
  where id=p_target_id;
  if p_proposal_id<>p_target_id then
    update public.generated_interpretations set status='ARCHIVED',lane='reference',review_state='published-revision',
      updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond') where id=p_proposal_id;
  end if;
  -- Read back after all copy-mirror/completion/version-capture triggers.
  select * into next_row from public.generated_interpretations where id=p_target_id;
  result:=jsonb_build_object('schema','content-studio-publication-receipt-v1',
    'operationId',p_operation_id,'requestSha256',p_request_sha256,'action',p_action,
    'proposalId',p_proposal_id,'proposalVersion',p_proposal_version,
    'targetId',p_target_id,'targetVersion',next_row.updated_at,'contentKey',next_row.content_key,
    'copySha256',encode(sha256(convert_to(jsonb_build_object('headline',next_row.headline,'summary',next_row.summary,'body',next_row.body,'sections',next_row.sections)::text,'UTF8')),'hex'),
    'row',to_jsonb(next_row),'committedAt',clock_timestamp());
  insert into project_privacy.studio_publication_operations(operation_id,actor,request_sha256,payload_sha256,validation_context,
    proposal_id,proposal_version,target_id,target_version,action,receipt)
  values(p_operation_id,p_actor,p_request_sha256,payload_hash,p_validation_context,
    p_proposal_id,p_proposal_version,p_target_id,p_target_version,p_action,result);
  return result;
end;
$$;
revoke all on function public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb) to service_role;
