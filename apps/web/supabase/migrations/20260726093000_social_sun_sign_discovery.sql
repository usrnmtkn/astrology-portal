-- Sun-only public identity for friend discovery.
--
-- Search may reveal the member's Sun sign, matching the lightweight identity
-- approach used by social astrology apps. Moon, Rising/Ascendant, the complete
-- natal chart, and raw birth inputs remain outside this RPC's return contract.

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
security definer
stable
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
  'Returns the bounded social finder result plus only the derived Sun sign. Moon, Ascendant, chart data, and birth inputs remain private.';

notify pgrst, 'reload schema';
