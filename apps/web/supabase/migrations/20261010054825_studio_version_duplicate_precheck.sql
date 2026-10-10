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
