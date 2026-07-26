-- Let the single Friends finder accept either a display name or an exact
-- public handle. Handle matching stays exact to avoid directory enumeration.

create or replace function public.search_social_profiles(name_input text)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  relationship_status text,
  request_id uuid
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_query text := lower(
    regexp_replace(btrim(coalesce(name_input, '')), '\s+', ' ', 'g')
  );
  normalized_handle text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  normalized_handle := regexp_replace(normalized_query, '^@', '');

  if length(normalized_handle) < 2 then
    return;
  end if;

  perform private.consume_social_rate_limit('profile-search-minute', 60, 30);
  perform private.consume_social_rate_limit('profile-search-day', 86400, 250);

  return query
  select
    profile.user_id,
    profile.handle::text,
    profile.display_name,
    profile.avatar_url,
    case
      when profile.user_id = current_user_id then 'self'
      when friendship.id is not null then 'friends'
      when pending_request.id is null then 'none'
      when pending_request.requester_user_id = current_user_id then 'request_sent'
      else 'request_received'
    end::text as relationship_status,
    pending_request.id as request_id
  from public.social_profiles profile
  left join public.social_friendships friendship
    on friendship.user_low_id = case
      when current_user_id < profile.user_id then current_user_id
      else profile.user_id
    end
    and friendship.user_high_id = case
      when current_user_id < profile.user_id then profile.user_id
      else current_user_id
    end
  left join lateral (
    select
      request.id,
      request.requester_user_id
    from public.social_friend_requests request
    where request.status = 'pending'
      and (
        (
          request.requester_user_id = current_user_id
          and request.recipient_user_id = profile.user_id
        )
        or (
          request.requester_user_id = profile.user_id
          and request.recipient_user_id = current_user_id
        )
      )
    order by request.created_at desc
    limit 1
  ) pending_request on true
  where profile.handle is not null
    and (
      profile.user_id = current_user_id
      or profile.discoverable
    )
    and (
      lower(profile.handle) = normalized_handle
      or position(
        normalized_query in lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g'))
      ) > 0
      or not exists (
        select 1
        from regexp_split_to_table(normalized_query, '\s+') as query_token
        where not exists (
          select 1
          from regexp_split_to_table(
            lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g')),
            '\s+'
          ) as profile_token
          where profile_token like query_token || '%'
            or query_token like profile_token || '%'
        )
      )
    )
  order by
    (lower(profile.handle) = normalized_handle) desc,
    (
      lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g'))
      = normalized_query
    ) desc,
    (
      position(
        normalized_query in lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g'))
      ) > 0
    ) desc,
    profile.display_name,
    profile.handle
  limit 20;
end;
$$;

revoke all on function public.search_social_profiles(text) from public;
grant execute on function public.search_social_profiles(text) to authenticated;

comment on function public.search_social_profiles(text) is
  'Returns up to 20 discoverable profiles matching a normalized name or exact handle without exposing natal or contact data.';
