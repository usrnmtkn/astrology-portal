-- Explicit owner decisions are separate from approved before/after corrections.
-- No capture trigger, historical backfill, replacement or reader approval.
create function public.valid_studio_writing_feedback(
  k text, targets text[], rejected text, roles jsonb, reason text, provenance text
) returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb;
begin
  if k not in ('rejection','source_roles') or k is null
    or coalesce(cardinality(targets),0) not between 1 and 100 or coalesce(array_ndims(targets),0)<>1
    or exists(select 1 from unnest(targets) t where t is null or length(t)>512 or t !~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$')
    or cardinality(targets) <> (select count(distinct t) from unnest(targets) t)
    or reason is null or btrim(reason) = '' or length(reason) > 10000
    or provenance is null or provenance !~* '^thread:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then return false; end if;
  if k = 'rejection' then return rejected is not null and btrim(rejected) <> '' and length(rejected) <= 262144 and roles is null; end if;
  if rejected is not null or jsonb_typeof(roles) is distinct from 'array' or jsonb_array_length(roles) not between 1 and 30 then return false; end if;
  for item in select value from jsonb_array_elements(roles) loop
    if jsonb_typeof(item) <> 'object'
      or exists(select 1 from jsonb_object_keys(item) name where name not in ('source_uri','role','sha256'))
      or jsonb_typeof(item->'source_uri') is distinct from 'string'
      or length(item->>'source_uri') > 2000 or (item->>'source_uri') !~ '^(https://|private:)' or (item->>'source_uri') ~ '[[:space:]]'
      or coalesce(item->>'role','') not in ('knowledge','voice')
      or (item ? 'sha256' and (jsonb_typeof(item->'sha256') is distinct from 'string' or (item->>'sha256') !~ '^[0-9a-f]{64}$'))
    then return false; end if;
  end loop;
  return jsonb_array_length(roles) = (select count(distinct value->>'source_uri') from jsonb_array_elements(roles));
exception when others then return false;
end;
$$;
revoke all on function public.valid_studio_writing_feedback(text,text[],text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.valid_studio_writing_feedback(text,text[],text,jsonb,text,text) to service_role;

create table public.studio_writing_feedback (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  kind text not null,
  target_keys text[] not null,
  rejected_text text,
  source_roles jsonb,
  owner_reason text not null,
  source_uri text not null,
  source_date timestamptz not null check (isfinite(source_date)),
  status text not null default 'active' check (status in ('active','retired')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (public.valid_studio_writing_feedback(kind,target_keys,rejected_text,source_roles,owner_reason,source_uri))
);
alter table public.studio_writing_feedback enable row level security;
revoke all on public.studio_writing_feedback from public, anon, authenticated;
grant select,insert,update on public.studio_writing_feedback to service_role;
create index studio_writing_feedback_active on public.studio_writing_feedback(status,created_at,id);

create table public.studio_writing_feedback_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  feedback_id uuid not null references public.studio_writing_feedback(id),
  base_version integer not null,
  version integer not null,
  status text not null check (status in ('active','retired')),
  reason text not null,
  source_uri text not null,
  decided_at timestamptz not null default clock_timestamp(),
  unique(feedback_id,version)
);
alter table public.studio_writing_feedback_decisions enable row level security;
revoke all on public.studio_writing_feedback_decisions from public, anon, authenticated;
grant select,insert on public.studio_writing_feedback_decisions to service_role;

create function public.record_studio_writing_feedback(
  p_request_id uuid, p_kind text, p_target_keys text[], p_rejected_text text,
  p_source_roles jsonb, p_owner_reason text, p_source_uri text, p_source_date timestamptz
) returns setof public.studio_writing_feedback
language plpgsql security invoker set search_path = '' as $$
declare evidence public.studio_writing_feedback; inserted_count integer; decision public.studio_writing_feedback_decisions;
begin
  if p_request_id is null or p_source_date is null or not isfinite(p_source_date) or not public.valid_studio_writing_feedback(p_kind,p_target_keys,p_rejected_text,p_source_roles,p_owner_reason,p_source_uri)
  then raise exception 'Invalid explicit owner feedback' using errcode='22023'; end if;
  insert into public.studio_writing_feedback(request_id,kind,target_keys,rejected_text,source_roles,owner_reason,source_uri,source_date)
    values(p_request_id,p_kind,p_target_keys,p_rejected_text,p_source_roles,p_owner_reason,p_source_uri,p_source_date)
    on conflict(request_id) do nothing;
  get diagnostics inserted_count = row_count;
  select * into evidence from public.studio_writing_feedback where request_id=p_request_id for update;
  if evidence.kind is distinct from p_kind or evidence.target_keys is distinct from p_target_keys
    or evidence.rejected_text is distinct from p_rejected_text or evidence.source_roles is distinct from p_source_roles
    or evidence.owner_reason is distinct from p_owner_reason or evidence.source_uri is distinct from p_source_uri
    or evidence.source_date is distinct from p_source_date
  then raise exception 'Feedback request was already used with different content' using errcode='40001'; end if;
  if inserted_count=1 then
    -- Reusing a retirement request must roll back the new record, never silently
    -- skip its audit. The unique decision ID also protects concurrent retries.
    insert into public.studio_writing_feedback_decisions(request_id,feedback_id,base_version,version,status,reason,source_uri)
      values(p_request_id,evidence.id,0,1,'active',p_owner_reason,p_source_uri);
  else
    select * into decision from public.studio_writing_feedback_decisions where request_id=p_request_id;
    if decision.feedback_id is distinct from evidence.id or decision.base_version is distinct from 0
    then raise exception 'Feedback audit does not match the capture request' using errcode='40001'; end if;
  end if;
  -- A retry after retirement returns the retired record; it never reactivates it.
  return next evidence;
exception when unique_violation then
  raise exception 'Feedback decision request already used' using errcode='40001';
end;
$$;

create function public.retire_studio_writing_feedback(
  p_id uuid, p_version integer, p_request_id uuid, p_reason text, p_source_uri text
) returns setof public.studio_writing_feedback
language plpgsql security invoker set search_path = '' as $$
declare evidence public.studio_writing_feedback; decision public.studio_writing_feedback_decisions;
begin
  if p_id is null or p_version is null or p_version<1 or p_request_id is null or p_reason is null or btrim(p_reason)='' or length(p_reason)>10000
    or p_source_uri is null or p_source_uri !~* '^thread:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then raise exception 'Invalid owner retirement decision' using errcode='22023'; end if;
  select * into evidence from public.studio_writing_feedback where id=p_id for update;
  if not found then raise exception 'Feedback not found' using errcode='P0002'; end if;
  select * into decision from public.studio_writing_feedback_decisions where request_id=p_request_id;
  if found then
    if decision.feedback_id<>p_id or decision.base_version<>p_version or decision.status<>'retired'
      or decision.reason<>p_reason or decision.source_uri<>p_source_uri
    then raise exception 'Decision request already used' using errcode='40001'; end if;
    return next evidence; return;
  end if;
  if evidence.version<>p_version or evidence.status<>'active' then raise exception 'Feedback changed; reload' using errcode='40001'; end if;
  update public.studio_writing_feedback set status='retired',version=version+1,updated_at=clock_timestamp()
    where id=p_id returning * into evidence;
  insert into public.studio_writing_feedback_decisions(request_id,feedback_id,base_version,version,status,reason,source_uri)
    values(p_request_id,p_id,p_version,evidence.version,'retired',p_reason,p_source_uri);
  return next evidence;
exception when unique_violation then
  raise exception 'Feedback decision request already used' using errcode='40001';
end;
$$;
revoke all on function public.record_studio_writing_feedback(uuid,text,text[],text,jsonb,text,text,timestamptz), public.retire_studio_writing_feedback(uuid,integer,uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_studio_writing_feedback(uuid,text,text[],text,jsonb,text,text,timestamptz), public.retire_studio_writing_feedback(uuid,integer,uuid,text,text) to service_role;

-- Compatible envelope: old clients retain rows; explicit-feedback clients require
-- writingFeedback to exist, so a missing migration cannot look like empty memory.
create or replace function public.studio_memory_active_snapshot() returns table(snapshot jsonb)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (select count(*) from public.studio_memory_feedback where status='active')>5000
    or (select coalesce(sum(octet_length(before_text)+octet_length(after_text)+octet_length(reason)),0) from public.studio_memory_feedback where status='active')>4194304
    or (select count(*) from public.studio_writing_feedback where status='active')>5000
    or (select coalesce(sum(octet_length(to_jsonb(f)::text)),0) from public.studio_writing_feedback f where status='active')>4194304
  then raise exception 'Studio memory requires capacity maintenance' using errcode='54000'; end if;
  return query select jsonb_build_object(
    'rows', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc,f.id),'[]'::jsonb) from public.studio_memory_feedback f where status='active'),
    'writingFeedback', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc,f.id),'[]'::jsonb) from public.studio_writing_feedback f where status='active'));
end;
$$;
revoke all on function public.studio_memory_active_snapshot() from public, anon, authenticated;
grant execute on function public.studio_memory_active_snapshot() to service_role;
