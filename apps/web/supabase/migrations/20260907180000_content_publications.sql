-- Lifecycle records outlive source rows and are included in offline exports.
create table public.content_publications (
  content_key text primary key,
  state text not null check (state in ('live', 'retired')),
  revision bigint generated always as identity,
  row_id uuid,
  row_updated_at timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.content_publications enable row level security;
revoke all on public.content_publications from anon, authenticated;
grant select on public.content_publications to anon, authenticated;
grant all on public.content_publications to service_role;
create policy content_publications_read on public.content_publications for select to anon, authenticated using (true);

create function public.record_content_publication() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_publication public.content_publications;
  explicit_publish boolean := (current_setting('role', true) = 'service_role' or coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->>'role' = 'service_role') and coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb->>'x-content-publication-action' = 'publish';
begin
  if tg_op = 'UPDATE' and old.content_key is distinct from new.content_key then
    -- Lock renamed keys in a fixed order and retain the old key's tombstone.
    perform pg_advisory_xact_lock(hashtextextended(least(old.content_key, new.content_key), 0));
    perform pg_advisory_xact_lock(hashtextextended(greatest(old.content_key, new.content_key), 0));
    update public.content_publications set state = 'retired', revision = default, updated_at = clock_timestamp()
      where content_key = old.content_key and row_id = old.id;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(new.content_key, old.content_key), 0));
  select * into current_publication from public.content_publications where content_key = coalesce(new.content_key, old.content_key) for update;
  if tg_op <> 'DELETE' and new.status = 'LIVE' and new.lane = 'serving' and new.review_state is null and new.target_date is null then
    -- Imports and ordinary saves must never silently undo an explicit retirement.
    if (current_publication.content_key is null or current_publication.state = 'retired' or (current_publication.row_id is not null and current_publication.row_id <> new.id))
      and not coalesce(explicit_publish, false) then return new; end if;
    insert into public.content_publications(content_key, state, row_id, row_updated_at)
      values(new.content_key, 'live', new.id, new.updated_at)
      on conflict(content_key) do update set state = 'live', row_id = excluded.row_id,
        row_updated_at = excluded.row_updated_at, revision = default, updated_at = clock_timestamp();
  elsif current_publication.row_id = old.id then
    update public.content_publications set state = 'retired', revision = default, updated_at = clock_timestamp()
      where content_key = old.content_key;
  end if;
  return coalesce(new, old);
end $$;
revoke all on function public.record_content_publication() from public, anon, authenticated;
create trigger record_content_publication after insert or update or delete on public.generated_interpretations
for each row execute function public.record_content_publication();

-- Seed existing identities with scripts/seed-content-publications.mts after checking
-- actual reader eligibility. Raw LIVE metadata alone does not identify serving copy.

create function public.retire_content_everywhere(p_content_key text, p_row_id uuid, p_expected_updated_at timestamptz)
returns public.content_publications
language plpgsql security definer set search_path = public, pg_temp as $$
declare source public.generated_interpretations; result public.content_publications;
begin
  if p_content_key is null or length(trim(p_content_key)) = 0 then raise exception 'Content key is required'; end if;
  select * into source from public.generated_interpretations where id = p_row_id for update;
  perform pg_advisory_xact_lock(hashtextextended(p_content_key, 0));
  if source.id is null or source.content_key <> p_content_key or source.updated_at is distinct from p_expected_updated_at then
    raise exception 'This source changed. Reload before retiring it.' using errcode = '40001';
  end if;
  if source.target_date is not null then raise exception 'Retirement is for reusable content keys, not a dated instance.' using errcode = '22023'; end if;
  insert into public.content_publications(content_key, state, row_id, row_updated_at)
    values(p_content_key, 'retired', source.id, source.updated_at)
    on conflict(content_key) do update set state = 'retired', revision = default, updated_at = clock_timestamp()
    returning * into result;
  return result;
end $$;
revoke all on function public.retire_content_everywhere(text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.retire_content_everywhere(text, uuid, timestamptz) to service_role;

-- Only an explicit owner publication may undo retirement. Imports cannot do so.
create function public.publish_content_publication(p_content_key text, p_row_id uuid, p_expected_updated_at timestamptz)
returns public.content_publications
language plpgsql security definer set search_path = public, pg_temp as $$
declare source public.generated_interpretations; result public.content_publications;
begin
  select * into source from public.generated_interpretations where id = p_row_id for update;
  perform pg_advisory_xact_lock(hashtextextended(p_content_key, 0));
  if source.id is null or source.content_key <> p_content_key or source.updated_at is distinct from p_expected_updated_at then
    raise exception 'This source changed. Reload before publishing it.' using errcode = '40001';
  end if;
  if source.target_date is not null or source.status is distinct from 'LIVE' or source.lane is distinct from 'serving' or source.review_state is not null
    or (source.sections->'packageDraft' is not null and source.sections->'packageDraft' <> 'null'::jsonb) then
    raise exception 'Publish the approved saved revision before restoring publication.' using errcode = '22023';
  end if;
  insert into public.content_publications(content_key, state, row_id, row_updated_at)
    values(p_content_key, 'live', source.id, source.updated_at)
    on conflict(content_key) do update set state = 'live', row_id = excluded.row_id,
      row_updated_at = excluded.row_updated_at, revision = default, updated_at = clock_timestamp()
    returning * into result;
  return result;
end $$;
revoke all on function public.publish_content_publication(text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.publish_content_publication(text, uuid, timestamptz) to service_role;
