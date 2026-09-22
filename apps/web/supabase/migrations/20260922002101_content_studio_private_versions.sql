-- Additive phase: apply before deploying the reader endpoint. Source rows and
-- their existing inline originals/history are not rewritten or removed.
create schema if not exists project_privacy;
revoke all on schema project_privacy from public, anon, authenticated;
create table project_privacy.studio_row_versions (
  version_id bigint generated always as identity primary key,
  row_id uuid not null,
  row_updated_at timestamptz,
  row_sha256 text not null check (row_sha256 ~ '^[a-f0-9]{64}$'),
  original_row jsonb not null,
  captured_at timestamptz not null default clock_timestamp(),
  unique (row_id, row_sha256)
);
create index studio_row_versions_row_version_idx
  on project_privacy.studio_row_versions(row_id, version_id desc);
alter table project_privacy.studio_row_versions enable row level security;
revoke all on project_privacy.studio_row_versions from public, anon, authenticated, service_role;
revoke all on sequence project_privacy.studio_row_versions_version_id_seq from public, anon, authenticated, service_role;

create function project_privacy.capture_studio_row_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare snapshot jsonb;
begin
  -- The old version is captured even if this is the first edit after cutover.
  if tg_op <> 'INSERT' then
    snapshot := to_jsonb(old);
    insert into project_privacy.studio_row_versions(row_id,row_updated_at,row_sha256,original_row)
      values(old.id,old.updated_at,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),snapshot)
      on conflict(row_id,row_sha256) do nothing;
  end if;
  if tg_op <> 'DELETE' then
    snapshot := to_jsonb(new);
    insert into project_privacy.studio_row_versions(row_id,row_updated_at,row_sha256,original_row)
      values(new.id,new.updated_at,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),snapshot)
      on conflict(row_id,row_sha256) do nothing;
  end if;
  return null;
end;
$$;
revoke all on function project_privacy.capture_studio_row_version() from public, anon, authenticated, service_role;
create trigger capture_studio_row_version
after insert or update or delete on public.generated_interpretations
for each row execute function project_privacy.capture_studio_row_version();

-- Trigger installation and backfill share a transaction. Retain complete JSON,
-- including every available inline history entry, without changing source time.
insert into project_privacy.studio_row_versions(row_id,row_updated_at,row_sha256,original_row)
select row.id,row.updated_at,encode(sha256(convert_to(to_jsonb(row)::text,'UTF8')),'hex'),to_jsonb(row)
from public.generated_interpretations row
on conflict(row_id,row_sha256) do nothing;

create function project_privacy.reject_studio_version_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin raise exception 'Studio version history is append-only'; end;
$$;
revoke all on function project_privacy.reject_studio_version_change() from public, anon, authenticated, service_role;
create trigger studio_versions_immutable before update or delete on project_privacy.studio_row_versions
for each row execute function project_privacy.reject_studio_version_change();

-- Only the owner-authorized server route may call this bounded history reader.
-- No reader role receives schema/table grants or function execution permission.
create function public.content_studio_row_history(p_row_id uuid, p_before bigint default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'versionId', v.version_id::text, 'rowId', v.row_id,
    'rowUpdatedAt', v.row_updated_at, 'sha256', v.row_sha256,
    'capturedAt', v.captured_at, 'row', v.original_row) order by v.version_id desc),'[]'::jsonb)
  from (select * from project_privacy.studio_row_versions
    where row_id=p_row_id and (p_before is null or version_id<p_before)
    order by version_id desc limit 25) v;
$$;
revoke all on function public.content_studio_row_history(uuid,bigint) from public, anon, authenticated;
grant execute on function public.content_studio_row_history(uuid,bigint) to service_role;
