-- Search discoverable social profiles by display name while keeping handles as
-- the unique, immutable lookup key for friendship mutations.

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
stable
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := lower(
    regexp_replace(btrim(coalesce(name_input, '')), '\s+', ' ', 'g')
  );
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if length(normalized_name) < 2 then
    return;
  end if;

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
    and position(
      normalized_name in lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g'))
    ) > 0
  order by
    (
      lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g'))
      = normalized_name
    ) desc,
    (
      position(
        normalized_name in lower(regexp_replace(btrim(profile.display_name), '\s+', ' ', 'g'))
      ) = 1
    ) desc,
    profile.display_name,
    profile.handle
  limit 20;
end;
$$;

revoke all on function public.search_social_profiles(text) from public;
grant execute on function public.search_social_profiles(text) to authenticated;

comment on function public.search_social_profiles(text) is
  'Returns up to 20 social profiles matching a first-name, last-name, or full-name substring without exposing natal or contact data.';
