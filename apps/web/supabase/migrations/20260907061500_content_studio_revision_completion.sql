-- Ensure a successful Content Studio publish cannot leave its saved revision
-- looking like it still needs owner approval.
--
-- The API intentionally publishes the live target first, then retires the
-- non-serving revision row. Those are two HTTP writes. If the second request
-- fails after the first succeeds, readers get the new copy while Content
-- Studio still shows a pending revision. Retire an exact-matching revision in
-- the same database transaction as the live target update, while leaving its
-- updated_at unchanged so the API's normal second PATCH remains idempotent.

create or replace function public.content_studio_package_revision_matches_target(
  revision_sections jsonb,
  target_sections jsonb
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  package_draft jsonb;
  package_record jsonb;
  editable_field jsonb;
  editable_path text;
  compared_fields integer := 0;
begin
  if jsonb_typeof(revision_sections) <> 'object'
    or jsonb_typeof(target_sections) <> 'object'
  then
    return false;
  end if;

  package_draft := revision_sections -> 'packageDraft';
  package_record := target_sections -> 'packageRecord';

  if jsonb_typeof(package_draft) <> 'object'
    or jsonb_typeof(package_record) <> 'object'
    or jsonb_typeof(package_record -> 'studio_editable_fields') <> 'array'
  then
    return false;
  end if;

  for editable_field in
    select value
    from jsonb_array_elements(package_record -> 'studio_editable_fields')
  loop
    editable_path := nullif(btrim(editable_field ->> 'path'), '');
    if editable_path is null then
      continue;
    end if;

    compared_fields := compared_fields + 1;
    if (package_draft #> string_to_array(editable_path, '.'))
      is distinct from
      (package_record #> string_to_array(editable_path, '.'))
    then
      return false;
    end if;
  end loop;

  return compared_fields > 0;
end;
$$;

create or replace function public.content_studio_complete_matching_revisions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'LIVE' or coalesce(new.lane, '') <> 'serving' then
    return new;
  end if;

  update public.generated_interpretations as revision
  set
    status = 'ARCHIVED',
    lane = 'reference',
    review_state = 'published-revision'
  where revision.id <> new.id
    and revision.status = 'DRAFT'
    and coalesce(revision.lane, '') = 'reference'
    and revision.review_state = 'owner-review-required'
    and revision.source_snapshot ->> 'targetRowId' = new.id::text
    and (
      (
        revision.event_type = 'sky-v4-governed-aspect-draft'
        and public.content_studio_package_revision_matches_target(
          revision.sections,
          new.sections
        )
      )
      or (
        revision.event_type = 'sky-article-edition-revision'
        and jsonb_typeof(revision.sections -> 'skyArticleEdition') = 'object'
        and revision.sections -> 'skyArticleEdition'
          = new.sections -> 'skyArticleEdition'
      )
    );

  return new;
end;
$$;

drop trigger if exists generated_interpretations_content_studio_revision_completion
  on public.generated_interpretations;

create trigger generated_interpretations_content_studio_revision_completion
after insert or update of status, lane, sections, published_at
on public.generated_interpretations
for each row
execute function public.content_studio_complete_matching_revisions();

-- Clear any already-stuck revisions whose exact approved copy is already on
-- the live target. Do not change updated_at; this preserves optimistic
-- concurrency compatibility with any publish request still completing.
update public.generated_interpretations as revision
set
  status = 'ARCHIVED',
  lane = 'reference',
  review_state = 'published-revision'
from public.generated_interpretations as target
where revision.id <> target.id
  and revision.status = 'DRAFT'
  and coalesce(revision.lane, '') = 'reference'
  and revision.review_state = 'owner-review-required'
  and revision.source_snapshot ->> 'targetRowId' = target.id::text
  and target.status = 'LIVE'
  and coalesce(target.lane, '') = 'serving'
  and (
    (
      revision.event_type = 'sky-v4-governed-aspect-draft'
      and public.content_studio_package_revision_matches_target(
        revision.sections,
        target.sections
      )
    )
    or (
      revision.event_type = 'sky-article-edition-revision'
      and jsonb_typeof(revision.sections -> 'skyArticleEdition') = 'object'
      and revision.sections -> 'skyArticleEdition'
        = target.sections -> 'skyArticleEdition'
    )
  );
