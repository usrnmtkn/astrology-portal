-- Keep generated_interpretations reader-facing mirrors aligned with the prose
-- fields declared by Content Studio package records.
--
-- Package schemas are not required to use one casing convention. In
-- particular, exact Calendar aspects declare `Summary` and `Body`, while many
-- fallback packages use `summary`, `body`, or `body_you`. The package's
-- `studio_editable_fields` contract is authoritative. Top-level columns are
-- mirrors for readers and must never win over a declared package field.

create or replace function public.content_studio_package_copy_value(
  package_record jsonb,
  copy_field text
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  editable_field jsonb;
  declared_path text;
  declared_value jsonb;
  normalized_tail text;
  alias_name text;
  aliases text[];
  accepted_tails text[];
begin
  if package_record is null or jsonb_typeof(package_record) <> 'object' then
    return null;
  end if;

  case lower(copy_field)
    when 'headline' then
      aliases := array['headline', 'Headline', 'title', 'Title'];
      accepted_tails := array['headline', 'title'];
    when 'summary' then
      aliases := array['summary', 'Summary', 'tldr', 'TLDR'];
      accepted_tails := array['summary', 'tldr'];
    when 'body' then
      aliases := array['body_you', 'body', 'Body', 'text'];
      accepted_tails := array['bodyyou', 'body', 'text'];
    else
      raise exception 'Unsupported Content Studio copy field: %', copy_field;
  end case;

  -- A declared editable field is the source of truth even when a stale alias
  -- also exists in the same package record. This is what prevents `Body` from
  -- silently losing to an older `body_you`, for example.
  if jsonb_typeof(package_record -> 'studio_editable_fields') = 'array' then
    for editable_field in
      select value
      from jsonb_array_elements(package_record -> 'studio_editable_fields')
    loop
      declared_path := nullif(btrim(editable_field ->> 'path'), '');
      if declared_path is null then
        continue;
      end if;

      normalized_tail := lower(regexp_replace(
        regexp_replace(declared_path, '^.*\.', ''),
        '[_-]',
        '',
        'g'
      ));

      if normalized_tail = any(accepted_tails) then
        declared_value := package_record #> string_to_array(declared_path, '.');
        if jsonb_typeof(declared_value) = 'string' then
          return package_record #>> string_to_array(declared_path, '.');
        end if;
      end if;
    end loop;
  end if;

  -- Legacy packages without studio_editable_fields keep their existing
  -- conventions. Lowercase aliases remain first so this migration does not
  -- change established fallback behavior; declared fields above always win.
  foreach alias_name in array aliases
  loop
    if package_record ? alias_name
      and jsonb_typeof(package_record -> alias_name) = 'string'
    then
      return package_record ->> alias_name;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.content_studio_sync_package_copy_mirrors()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  package_record jsonb;
  canonical_headline text;
  canonical_summary text;
  canonical_body text;
begin
  if new.sections is null
    or jsonb_typeof(new.sections) <> 'object'
    or jsonb_typeof(new.sections -> 'packageRecord') <> 'object'
  then
    return new;
  end if;

  -- A packageDraft is deliberately non-serving. Do not leak proposal copy into
  -- the top-level reader mirrors before the owner publishes the revision.
  if jsonb_typeof(new.sections -> 'packageDraft') = 'object' then
    return new;
  end if;

  package_record := new.sections -> 'packageRecord';
  canonical_headline := public.content_studio_package_copy_value(package_record, 'headline');
  canonical_summary := public.content_studio_package_copy_value(package_record, 'summary');
  canonical_body := public.content_studio_package_copy_value(package_record, 'body');

  if canonical_headline is not null then
    new.headline := canonical_headline;
  end if;
  if canonical_summary is not null then
    new.summary := canonical_summary;
  end if;
  if canonical_body is not null then
    new.body := canonical_body;
  end if;

  return new;
end;
$$;

drop trigger if exists generated_interpretations_content_studio_copy_mirrors
  on public.generated_interpretations;

create trigger generated_interpretations_content_studio_copy_mirrors
before insert or update of sections, headline, summary, body
on public.generated_interpretations
for each row
execute function public.content_studio_sync_package_copy_mirrors();

-- Repair already-published package rows that contain a correct packageRecord
-- but stale top-level mirrors. Setting sections to itself intentionally invokes
-- the trigger without rewriting package provenance or approval state.
update public.generated_interpretations as gi
set sections = gi.sections
where jsonb_typeof(gi.sections) = 'object'
  and jsonb_typeof(gi.sections -> 'packageRecord') = 'object'
  and coalesce(jsonb_typeof(gi.sections -> 'packageDraft'), 'null') <> 'object'
  and (
    (
      public.content_studio_package_copy_value(gi.sections -> 'packageRecord', 'headline') is not null
      and gi.headline is distinct from public.content_studio_package_copy_value(gi.sections -> 'packageRecord', 'headline')
    )
    or (
      public.content_studio_package_copy_value(gi.sections -> 'packageRecord', 'summary') is not null
      and gi.summary is distinct from public.content_studio_package_copy_value(gi.sections -> 'packageRecord', 'summary')
    )
    or (
      public.content_studio_package_copy_value(gi.sections -> 'packageRecord', 'body') is not null
      and gi.body is distinct from public.content_studio_package_copy_value(gi.sections -> 'packageRecord', 'body')
    )
  );
