-- Privacy and abuse controls for social discovery.
--
-- Private accounts remain visible to accepted friends through list_social_friends,
-- but are omitted from discovery. Removing the canonical friendship row revokes
-- friend-chart access immediately because every read rechecks that row.

alter table public.social_profiles
  add column if not exists discoverable boolean not null default true;

create schema if not exists private;

create table if not exists private.social_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null,
  window_started_at timestamptz not null,
  attempt_count integer not null,
  primary key (user_id, action_key),
  constraint social_rate_limits_action_key_present
    check (length(btrim(action_key)) between 1 and 80),
  constraint social_rate_limits_attempt_count_positive
    check (attempt_count > 0)
);

alter table private.social_rate_limits enable row level security;

revoke all on table private.social_rate_limits from public, anon, authenticated;

create or replace function private.consume_social_rate_limit(
  action_key_input text,
  window_seconds_input integer,
  max_attempts_input integer
)
returns void
language plpgsql
security definer
set search_path = private, public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  rate_limit_now timestamptz := clock_timestamp();
  next_attempt_count integer;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if window_seconds_input < 1 or max_attempts_input < 1 then
    raise exception 'Invalid social rate limit.';
  end if;

  insert into private.social_rate_limits as rate_limit (
    user_id,
    action_key,
    window_started_at,
    attempt_count
  )
  values (
    current_user_id,
    action_key_input,
    rate_limit_now,
    1
  )
  on conflict (user_id, action_key) do update
  set
    window_started_at = case
      when rate_limit.window_started_at
        <= rate_limit_now - make_interval(secs => window_seconds_input)
        then rate_limit_now
      else rate_limit.window_started_at
    end,
    attempt_count = case
      when rate_limit.window_started_at
        <= rate_limit_now - make_interval(secs => window_seconds_input)
        then 1
      else rate_limit.attempt_count + 1
    end
  returning attempt_count into next_attempt_count;

  if next_attempt_count > max_attempts_input then
    raise exception 'Too many social actions. Try again later.';
  end if;
end;
$$;

revoke all on function private.consume_social_rate_limit(text, integer, integer) from public;

create or replace function private.enforce_social_friend_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth, extensions
as $$
begin
  perform private.consume_social_rate_limit('friend-request-minute', 60, 8);
  perform private.consume_social_rate_limit('friend-request-day', 86400, 40);
  return new;
end;
$$;

revoke all on function private.enforce_social_friend_request_rate_limit() from public;

drop trigger if exists social_friend_requests_rate_limit
  on public.social_friend_requests;
create trigger social_friend_requests_rate_limit
  before insert on public.social_friend_requests
  for each row
  execute function private.enforce_social_friend_request_rate_limit();

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

create or replace function public.lookup_social_profile(handle_input text)
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
  normalized_handle text := lower(regexp_replace(btrim(coalesce(handle_input, '')), '^@', ''));
  target_profile public.social_profiles%rowtype;
  pending_request public.social_friend_requests%rowtype;
  already_friends boolean := false;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if normalized_handle !~ '^[a-z][a-z0-9_]{2,23}$' then
    return;
  end if;

  select *
    into target_profile
  from public.social_profiles profile
  where lower(profile.handle) = normalized_handle
    and profile.handle is not null;

  if not found then
    return;
  end if;

  if target_profile.user_id <> current_user_id then
    select exists (
      select 1
      from public.social_friendships friendship
      where friendship.user_low_id = case
        when current_user_id < target_profile.user_id then current_user_id
        else target_profile.user_id
      end
        and friendship.user_high_id = case
          when current_user_id < target_profile.user_id then target_profile.user_id
          else current_user_id
        end
    )
    into already_friends;

    select *
      into pending_request
    from public.social_friend_requests request
    where request.status = 'pending'
      and (
        (
          request.requester_user_id = current_user_id
          and request.recipient_user_id = target_profile.user_id
        )
        or (
          request.requester_user_id = target_profile.user_id
          and request.recipient_user_id = current_user_id
        )
      )
    order by request.created_at desc
    limit 1;

    if not target_profile.discoverable
      and not already_friends
      and pending_request.id is null then
      return;
    end if;
  end if;

  return query
  select
    target_profile.user_id,
    target_profile.handle::text,
    target_profile.display_name,
    target_profile.avatar_url,
    case
      when target_profile.user_id = current_user_id then 'self'
      when already_friends then 'friends'
      when pending_request.id is null then 'none'
      when pending_request.requester_user_id = current_user_id then 'request_sent'
      else 'request_received'
    end::text,
    pending_request.id;
end;
$$;

revoke all on function public.search_social_profiles(text) from public;
revoke all on function public.lookup_social_profile(text) from public;
grant execute on function public.search_social_profiles(text) to authenticated;
grant execute on function public.lookup_social_profile(text) to authenticated;

comment on column public.social_profiles.discoverable is
  'When false, the member is omitted from social discovery; accepted friendships remain intact.';
