-- Launch safety for social friends: bidirectional blocking and privacy-safe
-- social audit events. A block removes any existing friendship and pending
-- requests, then prevents discovery, new requests, acceptance, and chart reads.

create table if not exists public.social_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint social_blocks_not_self
    check (blocker_user_id <> blocked_user_id)
);

create index if not exists social_blocks_blocked_user_idx
  on public.social_blocks(blocked_user_id, blocker_user_id);

alter table public.social_blocks enable row level security;

drop policy if exists "Members can view accounts they blocked" on public.social_blocks;
create policy "Members can view accounts they blocked"
  on public.social_blocks
  for select
  using (auth.uid() = blocker_user_id);

revoke all on table public.social_blocks from public, anon, authenticated;
grant select on table public.social_blocks to authenticated;

create schema if not exists private;

create table if not exists private.social_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  outcome text not null default 'success',
  created_at timestamptz not null default now(),
  constraint social_audit_event_type_valid
    check (event_type in (
      'friend_request_sent',
      'friend_request_accepted',
      'friend_request_declined',
      'friend_removed',
      'member_blocked',
      'member_unblocked'
    )),
  constraint social_audit_outcome_valid
    check (outcome in ('success'))
);

create index if not exists social_audit_events_actor_created_idx
  on private.social_audit_events(actor_user_id, created_at desc);

alter table private.social_audit_events enable row level security;
revoke all on table private.social_audit_events from public, anon, authenticated;

create or replace function private.record_social_audit_event(
  event_type_input text,
  subject_user_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = private, public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  insert into private.social_audit_events (
    actor_user_id,
    subject_user_id,
    event_type
  )
  values (
    auth.uid(),
    subject_user_id_input,
    event_type_input
  );
end;
$$;

revoke all on function private.record_social_audit_event(text, uuid) from public;

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
    and not exists (
      select 1
      from public.social_blocks block
      where (
        block.blocker_user_id = current_user_id
        and block.blocked_user_id = profile.user_id
      )
      or (
        block.blocker_user_id = profile.user_id
        and block.blocked_user_id = current_user_id
      )
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

  if target_profile.user_id <> current_user_id and exists (
    select 1
    from public.social_blocks block
    where (
      block.blocker_user_id = current_user_id
      and block.blocked_user_id = target_profile.user_id
    )
    or (
      block.blocker_user_id = target_profile.user_id
      and block.blocked_user_id = current_user_id
    )
  ) then
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

create or replace function public.send_social_friend_request(handle_input text)
returns table (
  request_id uuid,
  request_status text
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_handle text := lower(regexp_replace(btrim(coalesce(handle_input, '')), '^@', ''));
  target_user_id uuid;
  existing_request public.social_friend_requests%rowtype;
  inserted_request_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (
    select 1 from public.social_profiles profile
    where profile.user_id = current_user_id and profile.handle is not null
  ) then
    raise exception 'Choose your handle before adding friends.';
  end if;

  select profile.user_id
    into target_user_id
  from public.social_profiles profile
  where lower(profile.handle) = normalized_handle
    and profile.handle is not null
    and profile.discoverable;

  if target_user_id is null then
    raise exception 'No profile found for that handle.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot add yourself as a friend.';
  end if;

  if exists (
    select 1
    from public.social_blocks block
    where (
      block.blocker_user_id = current_user_id
      and block.blocked_user_id = target_user_id
    )
    or (
      block.blocker_user_id = target_user_id
      and block.blocked_user_id = current_user_id
    )
  ) then
    raise exception 'This profile is not available.';
  end if;

  if exists (
    select 1
    from public.social_friendships friendship
    where friendship.user_low_id = case when current_user_id < target_user_id then current_user_id else target_user_id end
      and friendship.user_high_id = case when current_user_id < target_user_id then target_user_id else current_user_id end
  ) then
    return query select null::uuid, 'friends'::text;
    return;
  end if;

  select *
    into existing_request
  from public.social_friend_requests request
  where request.status = 'pending'
    and (
      (request.requester_user_id = current_user_id and request.recipient_user_id = target_user_id)
      or
      (request.requester_user_id = target_user_id and request.recipient_user_id = current_user_id)
    )
  order by request.created_at desc
  limit 1;

  if existing_request.id is not null then
    return query
    select
      existing_request.id,
      case
        when existing_request.requester_user_id = current_user_id then 'request_sent'::text
        else 'request_received'::text
      end;
    return;
  end if;

  insert into public.social_friend_requests (
    requester_user_id,
    recipient_user_id
  )
  values (
    current_user_id,
    target_user_id
  )
  returning id into inserted_request_id;

  perform private.record_social_audit_event('friend_request_sent', target_user_id);

  return query select inserted_request_id, 'request_sent'::text;
end;
$$;

create or replace function public.respond_social_friend_request(
  request_id_input uuid,
  accept_input boolean
)
returns table (
  request_id uuid,
  request_status text,
  friendship_id uuid
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  request_row public.social_friend_requests%rowtype;
  low_user_id uuid;
  high_user_id uuid;
  resolved_friendship_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select *
    into request_row
  from public.social_friend_requests request
  where request.id = request_id_input
    and request.recipient_user_id = current_user_id
    and request.status = 'pending'
  for update;

  if not found then
    raise exception 'This friend request is no longer available.';
  end if;

  if exists (
    select 1
    from public.social_blocks block
    where (
      block.blocker_user_id = request_row.requester_user_id
      and block.blocked_user_id = request_row.recipient_user_id
    )
    or (
      block.blocker_user_id = request_row.recipient_user_id
      and block.blocked_user_id = request_row.requester_user_id
    )
  ) then
    raise exception 'This friend request is no longer available.';
  end if;

  if not accept_input then
    update public.social_friend_requests
    set status = 'declined', responded_at = now()
    where id = request_row.id;

    perform private.record_social_audit_event(
      'friend_request_declined',
      request_row.requester_user_id
    );

    return query select request_row.id, 'declined'::text, null::uuid;
    return;
  end if;

  low_user_id := case
    when request_row.requester_user_id < request_row.recipient_user_id
      then request_row.requester_user_id
    else request_row.recipient_user_id
  end;
  high_user_id := case
    when request_row.requester_user_id < request_row.recipient_user_id
      then request_row.recipient_user_id
    else request_row.requester_user_id
  end;

  insert into public.social_friendships (
    user_low_id,
    user_high_id,
    created_from_request_id
  )
  values (
    low_user_id,
    high_user_id,
    request_row.id
  )
  on conflict (user_low_id, user_high_id)
  do update set created_from_request_id = coalesce(
    public.social_friendships.created_from_request_id,
    excluded.created_from_request_id
  )
  returning id into resolved_friendship_id;

  update public.social_friend_requests
  set status = 'accepted', responded_at = now()
  where id = request_row.id;

  update public.social_friend_requests
  set status = 'cancelled', responded_at = now()
  where status = 'pending'
    and id <> request_row.id
    and (
      (requester_user_id = low_user_id and recipient_user_id = high_user_id)
      or
      (requester_user_id = high_user_id and recipient_user_id = low_user_id)
    );

  perform private.record_social_audit_event(
    'friend_request_accepted',
    request_row.requester_user_id
  );

  return query
  select request_row.id, 'accepted'::text, resolved_friendship_id;
end;
$$;

create or replace function public.list_social_friend_requests()
returns table (
  request_id uuid,
  direction text,
  status text,
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select
    request.id,
    case when request.recipient_user_id = auth.uid() then 'incoming' else 'outgoing' end,
    request.status,
    other_profile.user_id,
    other_profile.handle::text,
    other_profile.display_name,
    other_profile.avatar_url,
    request.created_at
  from public.social_friend_requests request
  join public.social_profiles other_profile
    on other_profile.user_id = case
      when request.recipient_user_id = auth.uid() then request.requester_user_id
      else request.recipient_user_id
    end
  where auth.uid() is not null
    and auth.uid() in (request.requester_user_id, request.recipient_user_id)
    and request.status = 'pending'
    and not exists (
      select 1
      from public.social_blocks block
      where (
        block.blocker_user_id = request.requester_user_id
        and block.blocked_user_id = request.recipient_user_id
      )
      or (
        block.blocker_user_id = request.recipient_user_id
        and block.blocked_user_id = request.requester_user_id
      )
    )
  order by request.created_at desc;
$$;

create or replace function public.list_social_friends()
returns table (
  friendship_id uuid,
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  natal_chart jsonb,
  accepted_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select
    friendship.id,
    friend_profile.user_id,
    friend_profile.handle::text,
    friend_profile.display_name,
    friend_profile.avatar_url,
    friend_profile.natal_chart,
    friendship.accepted_at
  from public.social_friendships friendship
  join public.social_profiles friend_profile
    on friend_profile.user_id = case
      when friendship.user_low_id = auth.uid() then friendship.user_high_id
      else friendship.user_low_id
    end
  where auth.uid() is not null
    and auth.uid() in (friendship.user_low_id, friendship.user_high_id)
    and not exists (
      select 1
      from public.social_blocks block
      where (
        block.blocker_user_id = friendship.user_low_id
        and block.blocked_user_id = friendship.user_high_id
      )
      or (
        block.blocker_user_id = friendship.user_high_id
        and block.blocked_user_id = friendship.user_low_id
      )
    )
  order by friend_profile.display_name, friend_profile.handle;
$$;

create or replace function public.remove_social_friend(friendship_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  friend_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  delete from public.social_friendships friendship
  where friendship.id = friendship_id_input
    and auth.uid() in (friendship.user_low_id, friendship.user_high_id)
  returning case
    when friendship.user_low_id = auth.uid() then friendship.user_high_id
    else friendship.user_low_id
  end
  into friend_user_id;

  if friend_user_id is null then
    raise exception 'Friendship not found.';
  end if;

  perform private.record_social_audit_event('friend_removed', friend_user_id);
end;
$$;

create or replace function public.block_social_user(target_user_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  low_user_id uuid;
  high_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if target_user_id_input is null or target_user_id_input = current_user_id then
    raise exception 'You cannot block this account.';
  end if;

  if not exists (
    select 1
    from public.social_profiles profile
    where profile.user_id = target_user_id_input
  ) then
    raise exception 'This profile is not available.';
  end if;

  low_user_id := case
    when current_user_id < target_user_id_input then current_user_id
    else target_user_id_input
  end;
  high_user_id := case
    when current_user_id < target_user_id_input then target_user_id_input
    else current_user_id
  end;

  delete from public.social_friendships friendship
  where friendship.user_low_id = low_user_id
    and friendship.user_high_id = high_user_id;

  update public.social_friend_requests request
  set status = 'cancelled', responded_at = now()
  where request.status = 'pending'
    and (
      (
        request.requester_user_id = current_user_id
        and request.recipient_user_id = target_user_id_input
      )
      or (
        request.requester_user_id = target_user_id_input
        and request.recipient_user_id = current_user_id
      )
    );

  insert into public.social_blocks (blocker_user_id, blocked_user_id)
  values (current_user_id, target_user_id_input)
  on conflict (blocker_user_id, blocked_user_id) do nothing;

  perform private.record_social_audit_event('member_blocked', target_user_id_input);
end;
$$;

create or replace function public.unblock_social_user(target_user_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  delete from public.social_blocks block
  where block.blocker_user_id = auth.uid()
    and block.blocked_user_id = target_user_id_input;

  if not found then
    raise exception 'Blocked account not found.';
  end if;

  perform private.record_social_audit_event('member_unblocked', target_user_id_input);
end;
$$;

create or replace function public.list_social_blocks()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  blocked_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select
    profile.user_id,
    profile.handle::text,
    profile.display_name,
    profile.avatar_url,
    block.created_at
  from public.social_blocks block
  join public.social_profiles profile
    on profile.user_id = block.blocked_user_id
  where auth.uid() is not null
    and block.blocker_user_id = auth.uid()
  order by block.created_at desc;
$$;

revoke all on function public.search_social_profiles(text) from public;
revoke all on function public.lookup_social_profile(text) from public;
revoke all on function public.send_social_friend_request(text) from public;
revoke all on function public.respond_social_friend_request(uuid, boolean) from public;
revoke all on function public.list_social_friend_requests() from public;
revoke all on function public.list_social_friends() from public;
revoke all on function public.remove_social_friend(uuid) from public;
revoke all on function public.block_social_user(uuid) from public;
revoke all on function public.unblock_social_user(uuid) from public;
revoke all on function public.list_social_blocks() from public;

grant execute on function public.search_social_profiles(text) to authenticated;
grant execute on function public.lookup_social_profile(text) to authenticated;
grant execute on function public.send_social_friend_request(text) to authenticated;
grant execute on function public.respond_social_friend_request(uuid, boolean) to authenticated;
grant execute on function public.list_social_friend_requests() to authenticated;
grant execute on function public.list_social_friends() to authenticated;
grant execute on function public.remove_social_friend(uuid) to authenticated;
grant execute on function public.block_social_user(uuid) to authenticated;
grant execute on function public.unblock_social_user(uuid) to authenticated;
grant execute on function public.list_social_blocks() to authenticated;

comment on table public.social_blocks is
  'Bidirectional social safety boundary. Only the blocker can list and remove a block.';

comment on table private.social_audit_events is
  'Privacy-safe social state-change events. Contains account IDs and event types only; never chart or birth data.';

notify pgrst, 'reload schema';
