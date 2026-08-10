-- A natal chart is immutable for a given birth record. Treat a null sync as
-- "no fresh calculation available" instead of erasing the last verified,
-- friend-safe projection used by the Circle list.

create or replace function public.ensure_own_social_profile(
  display_name_input text,
  avatar_url_input text,
  natal_chart_input jsonb
)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  safe_display_name text := left(coalesce(nullif(btrim(display_name_input), ''), 'New stargazer'), 80);
  base_handle text;
  candidate_handle text;
  suffix_text text;
  candidate_index integer := 0;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  base_handle := trim(both '_' from regexp_replace(lower(safe_display_name), '[^a-z0-9]+', '_', 'g'));

  if base_handle = '' then
    base_handle := 'member';
  elsif base_handle !~ '^[a-z]' then
    base_handle := 'member_' || base_handle;
  end if;

  if length(base_handle) < 3 then
    base_handle := base_handle || '_astro';
  end if;

  base_handle := left(base_handle, 24);

  loop
    suffix_text := case
      when candidate_index = 0 then ''
      else '_' || (candidate_index + 1)::text
    end;
    candidate_handle := left(base_handle, 24 - length(suffix_text)) || suffix_text;

    begin
      return query
      insert into public.social_profiles as profile (
        user_id,
        handle,
        display_name,
        avatar_url,
        natal_chart
      )
      values (
        current_user_id,
        candidate_handle,
        safe_display_name,
        avatar_url_input,
        natal_chart_input
      )
      on conflict on constraint social_profiles_pkey do update
      set
        handle = coalesce(profile.handle, excluded.handle),
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        natal_chart = coalesce(excluded.natal_chart, profile.natal_chart)
      returning
        profile.user_id,
        profile.handle,
        profile.display_name,
        profile.avatar_url;

      return;
    exception
      when unique_violation then
        candidate_index := candidate_index + 1;

        if candidate_index >= 10000 then
          raise exception 'Could not assign a unique default handle.';
        end if;
    end;
  end loop;
end;
$$;

revoke all on function public.ensure_own_social_profile(text, text, jsonb) from public;
grant execute on function public.ensure_own_social_profile(text, text, jsonb) to authenticated;

comment on function public.ensure_own_social_profile(text, text, jsonb) is
  'Creates or synchronizes the caller social profile, preserves its last verified natal projection when no fresh chart is supplied, and atomically assigns a unique default handle when missing.';
