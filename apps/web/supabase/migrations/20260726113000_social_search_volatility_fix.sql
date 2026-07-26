-- Friend discovery consumes a write-backed rate limit, so the public Sun-only
-- wrapper must remain VOLATILE (the PostgreSQL default) rather than STABLE.

create or replace function public.search_social_profiles_public(name_input text)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  relationship_status text,
  request_id uuid,
  sun_sign text
)
language sql
volatile
security definer
set search_path = public, auth, extensions
as $$
  select
    result.user_id,
    result.handle,
    result.display_name,
    result.avatar_url,
    result.relationship_status,
    result.request_id,
    (
      select nullif(position ->> 'sign', '')
      from jsonb_array_elements(
        coalesce(profile.natal_chart -> 'positions', '[]'::jsonb)
      ) position
      where lower(position ->> 'planet') = 'sun'
      limit 1
    )::text as sun_sign
  from public.search_social_profiles(name_input) result
  join public.social_profiles profile
    on profile.user_id = result.user_id;
$$;

revoke all on function public.search_social_profiles_public(text) from public;
grant execute on function public.search_social_profiles_public(text) to authenticated;

comment on function public.search_social_profiles_public(text) is
  'Rate-limited discovery result plus derived Sun sign only. VOLATILE because the protected search consumes a rate-limit counter.';

notify pgrst, 'reload schema';
