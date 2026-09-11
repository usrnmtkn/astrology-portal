-- Private correction evidence. No browser/Data API grants for visitors or members.
create table public.studio_memory_feedback (
  id uuid primary key default gen_random_uuid(),
  source_row_id uuid not null,
  content_key text not null,
  family text not null check (family in ('sky-placement','sky-aspect')),
  before_text text not null,
  after_text text not null,
  before_version timestamptz not null,
  after_version timestamptz not null,
  status text not null default 'pending' check (status in ('pending','active','retired')),
  scope text not null default 'passage' check (scope in ('passage','family','sky')),
  reason text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (source_row_id, after_version),
  check (before_text <> after_text)
);
alter table public.studio_memory_feedback enable row level security;
revoke all on public.studio_memory_feedback from public, anon, authenticated;
grant select, insert, update on public.studio_memory_feedback to service_role;
create index studio_memory_feedback_target on public.studio_memory_feedback (content_key, created_at desc, id);
create index studio_memory_feedback_active on public.studio_memory_feedback (status, family, scope);

create table public.studio_memory_feedback_decisions (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.studio_memory_feedback(id),
  version integer not null,
  status text not null,
  scope text not null,
  reason text not null,
  decided_at timestamptz not null default clock_timestamp(),
  unique(feedback_id, version)
);
alter table public.studio_memory_feedback_decisions enable row level security;
revoke all on public.studio_memory_feedback_decisions from public, anon, authenticated;
grant select, insert on public.studio_memory_feedback_decisions to service_role;

-- Same transaction as the edit: failed or stale writes cannot leave phantom memories.
-- Initial model generation starts with an empty body and is not a correction.
create function public.capture_studio_memory_feedback() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.surface = 'sky' and new.mode = 'feed' and new.target_date is null
    and new.content_key = old.content_key
    and (new.content_key ~ '^sky\.placement\.base\.[a-z_]+\.[a-z]+$'
      or new.content_key ~ '^sky\.aspect\.[a-z_]+\.[a-z]+\.[a-z_]+\.[a-z]+\.[a-z]+$')
    and coalesce(old.body, '') <> '' and coalesce(new.body, '') <> ''
    and new.body is distinct from old.body
  then
    insert into public.studio_memory_feedback
      (source_row_id, content_key, family, before_text, after_text, before_version, after_version)
    values (new.id, new.content_key,
      case when new.content_key like 'sky.placement.%' then 'sky-placement' else 'sky-aspect' end,
      old.body, new.body, old.updated_at, new.updated_at);
  end if;
  return new;
end;
$$;
revoke all on function public.capture_studio_memory_feedback() from public, anon, authenticated;
grant execute on function public.capture_studio_memory_feedback() to service_role;
create trigger capture_studio_memory_feedback after update on public.generated_interpretations
for each row execute function public.capture_studio_memory_feedback();

-- Explicit owner action through the protected server API. A row lock and version
-- comparison make concurrent review safe. Wider scope requires an explanation.
create function public.review_studio_memory_feedback(
  p_id uuid, p_version integer, p_status text, p_scope text, p_reason text
) returns setof public.studio_memory_feedback
language plpgsql security invoker set search_path = '' as $$
declare
  evidence public.studio_memory_feedback;
  source public.generated_interpretations;
begin
  -- Lock source before feedback, matching the edit trigger's lock order.
  select * into evidence from public.studio_memory_feedback where id = p_id;
  if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
  select * into source from public.generated_interpretations where id = evidence.source_row_id for update;
  select * into evidence from public.studio_memory_feedback where id = p_id for update;
  if evidence.version <> p_version then raise exception 'Feedback changed; reload' using errcode = '40001'; end if;
  if p_status not in ('active','retired') or p_scope not in ('passage','family','sky')
    or p_reason is null or length(p_reason) > 4000
    or (p_scope <> 'passage' and btrim(p_reason) = '')
  then raise exception 'Invalid feedback decision' using errcode = '22023'; end if;
  if p_status = 'active' and (source.id is null or source.content_key <> evidence.content_key
    or source.body is distinct from evidence.after_text or source.status not in ('REVIEWED','LIVE'))
  then raise exception 'Review the exact saved passage before activating its correction' using errcode = '23514'; end if;
  update public.studio_memory_feedback set status = p_status, scope = p_scope,
    reason = p_reason, version = version + 1, updated_at = clock_timestamp()
    where id = p_id returning * into evidence;
  insert into public.studio_memory_feedback_decisions(feedback_id, version, status, scope, reason)
    values (evidence.id, evidence.version, evidence.status, evidence.scope, evidence.reason);
  return next evidence;
end;
$$;
revoke all on function public.review_studio_memory_feedback(uuid,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.review_studio_memory_feedback(uuid,integer,text,text,text) to service_role;

-- One MVCC snapshot avoids mixed revisions across paginated writer/graph reads.
-- A JSON envelope also avoids silently truncating evidence at the Data API row cap.
create function public.studio_memory_active_snapshot() returns table(snapshot jsonb)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (select count(*) from public.studio_memory_feedback where status = 'active') > 5000
    or (select coalesce(sum(octet_length(before_text) + octet_length(after_text) + octet_length(reason)),0)
      from public.studio_memory_feedback where status = 'active') > 4194304
  then raise exception 'Studio memory requires capacity maintenance' using errcode = '54000'; end if;
  return query select jsonb_build_object('rows', coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc, f.id), '[]'::jsonb))
    from public.studio_memory_feedback f where f.status = 'active';
end;
$$;
revoke all on function public.studio_memory_active_snapshot() from public, anon, authenticated;
grant execute on function public.studio_memory_active_snapshot() to service_role;
