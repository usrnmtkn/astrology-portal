-- Original content stays outside every client-facing schema. Maintenance only.
create schema if not exists project_privacy;
revoke all on schema project_privacy from public, anon, authenticated;
create table if not exists project_privacy.content_archive (
  row_id uuid primary key,
  original_row jsonb not null,
  captured_at timestamptz not null default now()
);
alter table project_privacy.content_archive enable row level security;
revoke all on project_privacy.content_archive from public, anon, authenticated;

-- Policies are supplied privately during maintenance, never committed to Git.
create or replace function project_privacy.redact_json(value jsonb, patterns jsonb)
returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare result jsonb; entry record; rule jsonb; body text; safe_key text;
begin
  case jsonb_typeof(value)
    when 'string' then
      body := value #>> '{}';
      for rule in select * from jsonb_array_elements(patterns) loop
        body := regexp_replace(body, rule->>'regex', '[private]', 'gi');
      end loop;
      return to_jsonb(body);
    when 'array' then
      select coalesce(jsonb_agg(project_privacy.redact_json(item, patterns) order by position), '[]'::jsonb)
        into result from jsonb_array_elements(value) with ordinality as items(item,position);
      return result;
    when 'object' then
      result := '{}'::jsonb;
      for entry in select * from jsonb_each(value) loop
        safe_key := project_privacy.redact_json(to_jsonb(entry.key), patterns) #>> '{}';
        if result ? safe_key then raise exception 'Privacy redaction would merge distinct keys'; end if;
        result := result || jsonb_build_object(safe_key, project_privacy.redact_json(entry.value, patterns));
      end loop;
      return result;
    else return value;
  end case;
end;
$$;
revoke all on function project_privacy.redact_json(jsonb,jsonb) from public, anon, authenticated;

do $$
declare rules jsonb := '[{"regex":"Example[[:space:]]+Person"}]'; sample jsonb;
begin
  sample := '{"body":"Complete opening. Complete final sentence.","source":{"author":"Example Person"},"values":[null,1,true,"Example Person"]}';
  if project_privacy.redact_json(sample,rules)->>'body' <> sample->>'body'
    or project_privacy.redact_json(sample,rules)#>>'{source,author}' <> '[private]'
    or project_privacy.redact_json(sample,rules)#>'{values}' <> '[null,1,true,"[private]"]'::jsonb
    then raise exception 'Privacy redaction preservation check failed'; end if;
  if has_schema_privilege('anon','project_privacy','USAGE')
    or has_schema_privilege('authenticated','project_privacy','USAGE')
    or has_table_privilege('anon','project_privacy.content_archive','SELECT')
    or has_table_privilege('authenticated','project_privacy.content_archive','SELECT')
    then raise exception 'Private archive must not be readable by clients'; end if;
end;
$$;
