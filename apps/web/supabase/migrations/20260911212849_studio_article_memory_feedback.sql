-- Private, complete article corrections; no backfill and no inferred approval.
alter table public.studio_memory_feedback drop constraint studio_memory_feedback_family_check;
alter table public.studio_memory_feedback add constraint studio_memory_feedback_family_check
  check (family in ('sky-placement','sky-aspect','sky-article'));
alter table public.studio_memory_feedback add constraint studio_memory_feedback_article_scope_check
  check (family <> 'sky-article' or scope <> 'sky');

create function public.studio_article_memory_key(k text) returns text
language sql immutable security invoker set search_path = '' as $$
  select case
    when k ~ '^sky-article(-revision)?/[a-z_]+/[a-z]+/[0-9]{4}$'
      then replace(k, 'sky-article-revision/', 'sky-article/')
    when k ~ '^fallback-hook/sky-sign-copy/[a-z_]+/[a-z]+$' then k
    else null end;
$$;

-- Only reader fields. Never ingest source snapshots, prompt instructions, personal
-- reports, provenance documents, or a whole package record as correction text.
create function public.studio_article_memory_fields(r jsonb) returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare
  edition jsonb := r #> '{sections,skyArticleEdition}';
  fields jsonb;
  item jsonb;
  result jsonb := '{}'::jsonb;
  name text;
begin
  if jsonb_typeof(edition) = 'object' then
    foreach name in array array['headline','tldr','body'] loop
      if jsonb_typeof(edition->name) = 'string' then result := result || jsonb_build_object(name, edition->name); end if;
    end loop;
    for item in select value from jsonb_array_elements(coalesce(edition->'housePassages','[]'::jsonb)) loop
      result := result || jsonb_build_object('house:' || (item->>'house'), item->'body');
    end loop;
    for item in select value from jsonb_array_elements(coalesce(edition->'aspectPassages','[]'::jsonb)) loop
      result := result || jsonb_build_object('aspect:' || (item->>'contentKey'), item->'body');
    end loop;
    return result;
  end if;
  fields := coalesce(r #> '{sections,packageRecord}', r->'sections', '{}'::jsonb);
  if jsonb_typeof(r #> '{sections,packageDraft}') = 'object' then
    fields := fields || (r #> '{sections,packageDraft}');
  end if;
  foreach name in array array['headline','summary','body','opening','tension','development','era_layer','close',
    'try_this','preview_note','core_theme','sign_jurisdiction','lived_experience','rulership_twist',
    'history_echo','closing_charge','placementArticle'] loop
    if jsonb_typeof(fields->name) = 'string' then result := result || jsonb_build_object(name, fields->name);
    elsif name in ('headline','summary','body') and jsonb_typeof(r->name) = 'string' then
      result := result || jsonb_build_object(name, r->name);
    end if;
  end loop;
  return result;
end;
$$;
revoke all on function public.studio_article_memory_key(text), public.studio_article_memory_fields(jsonb) from public, anon, authenticated;
grant execute on function public.studio_article_memory_key(text), public.studio_article_memory_fields(jsonb) to service_role;

create function public.capture_studio_article_memory_feedback() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  previous public.generated_interpretations;
  before_fields jsonb;
  after_fields jsonb;
  target_key text := public.studio_article_memory_key(new.content_key);
begin
  if target_key is null or new.surface is distinct from 'sky' then return new; end if;
  if tg_op = 'INSERT' then
    -- Editing a LIVE edition forks a draft row. Its first edit still needs a
    -- genuine database baseline; initial imports/generations are not corrections.
    if new.event_type <> 'sky-article-edition-revision' then return new; end if;
    select * into previous from public.generated_interpretations
      where id::text = new.source_snapshot->>'targetRowId';
    if previous.id is null or previous.content_key <> target_key then return new; end if;
  else
    previous := old;
    if old.content_key <> new.content_key then return new; end if;
  end if;
  before_fields := public.studio_article_memory_fields(to_jsonb(previous));
  after_fields := public.studio_article_memory_fields(to_jsonb(new));
  -- Publication changes a target's reader copy but is not a second edit.
  if new.status is distinct from 'DRAFT' and jsonb_typeof(new.sections->'packageDraft') is distinct from 'object' then return new; end if;
  if before_fields = '{}'::jsonb or after_fields = '{}'::jsonb or before_fields = after_fields then return new; end if;
  insert into public.studio_memory_feedback
    (source_row_id, content_key, family, before_text, after_text, before_version, after_version)
    values (new.id, target_key, 'sky-article', before_fields::text, after_fields::text, previous.updated_at, new.updated_at);
  return new;
end;
$$;
revoke all on function public.capture_studio_article_memory_feedback() from public, anon, authenticated;
grant execute on function public.capture_studio_article_memory_feedback() to service_role;
create trigger capture_studio_article_memory_feedback after insert or update on public.generated_interpretations
for each row execute function public.capture_studio_article_memory_feedback();

create or replace function public.review_studio_memory_feedback(
  p_id uuid, p_version integer, p_status text, p_scope text, p_reason text
) returns setof public.studio_memory_feedback
language plpgsql security invoker set search_path = '' as $$
declare
  evidence public.studio_memory_feedback;
  source public.generated_interpretations;
  exact_reviewed boolean;
begin
  select * into evidence from public.studio_memory_feedback where id = p_id;
  if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
  select * into source from public.generated_interpretations where id = evidence.source_row_id for update;
  -- Compiled revisions are reviewed by publishing their exact fields to the
  -- original edition. A revision's own completion status is not that approval.
  if evidence.family = 'sky-article' and source.event_type = 'sky-article-edition-revision' then
    select * into source from public.generated_interpretations
      where id::text = source.source_snapshot->>'targetRowId' for update;
  end if;
  select * into evidence from public.studio_memory_feedback where id = p_id for update;
  if evidence.version <> p_version then raise exception 'Feedback changed; reload' using errcode = '40001'; end if;
  if p_status not in ('active','retired') or p_scope not in ('passage','family','sky')
    or p_reason is null or length(p_reason) > 4000
    or (p_scope <> 'passage' and btrim(p_reason) = '')
    or (evidence.family = 'sky-article' and p_scope = 'sky')
  then raise exception 'Invalid feedback decision' using errcode = '22023'; end if;
  if evidence.family = 'sky-article' then
    exact_reviewed := source.id is not null
      and public.studio_article_memory_key(source.content_key) = evidence.content_key
      and public.studio_article_memory_fields(to_jsonb(source))::text = evidence.after_text
      and source.status in ('REVIEWED','LIVE')
      and coalesce(source.review_state,'') = ''
      and jsonb_typeof(source.sections->'packageDraft') is distinct from 'object';
  else
    exact_reviewed := source.id is not null and source.content_key = evidence.content_key
      and source.body is not distinct from evidence.after_text and source.status in ('REVIEWED','LIVE');
  end if;
  if p_status = 'active' and not coalesce(exact_reviewed,false)
  then raise exception 'Review the exact saved passage before activating its correction' using errcode = '23514'; end if;
  update public.studio_memory_feedback set status = p_status, scope = p_scope,
    reason = p_reason, version = version + 1, updated_at = clock_timestamp()
    where id = p_id returning * into evidence;
  insert into public.studio_memory_feedback_decisions(feedback_id, version, status, scope, reason)
    values (evidence.id, evidence.version, evidence.status, evidence.scope, evidence.reason);
  return next evidence;
end;
$$;
