-- Social handles, mutual friend requests, and friend-safe natal chart sharing.
--
-- Exact birth inputs remain in owner-only user_profiles. social_profiles stores
-- only the derived natal chart projection needed by accepted friends.

create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text,
  display_name text not null,
  avatar_url text,
  natal_chart jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_profiles_handle_format
    check (
      handle is null
      or handle::text ~ '^[a-z][a-z0-9_]{2,23}$'
    ),
  constraint social_profiles_display_name_present
    check (length(btrim(display_name)) between 1 and 80)
);

create unique index if not exists social_profiles_handle_unique_idx
  on public.social_profiles(lower(handle))
  where handle is not null;

create table if not exists public.social_friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_friend_requests_not_self
    check (requester_user_id <> recipient_user_id),
  constraint social_friend_requests_status_valid
    check (status in ('pending', 'accepted', 'declined', 'cancelled'))
);

create unique index if not exists social_friend_requests_active_pair_idx
  on public.social_friend_requests(
    (case
      when requester_user_id < recipient_user_id then requester_user_id
      else recipient_user_id
    end),
    (case
      when requester_user_id < recipient_user_id then recipient_user_id
      else requester_user_id
    end)
  )
  where status = 'pending';

create index if not exists social_friend_requests_recipient_idx
  on public.social_friend_requests(recipient_user_id, status, created_at desc);

create table if not exists public.social_friendships (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references auth.users(id) on delete cascade,
  user_high_id uuid not null references auth.users(id) on delete cascade,
  created_from_request_id uuid references public.social_friend_requests(id) on delete set null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint social_friendships_canonical_pair
    check (user_low_id < user_high_id),
  constraint social_friendships_unique_pair
    unique (user_low_id, user_high_id)
);

drop trigger if exists social_profiles_set_updated_at on public.social_profiles;
create trigger social_profiles_set_updated_at
  before update on public.social_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists social_friend_requests_set_updated_at on public.social_friend_requests;
create trigger social_friend_requests_set_updated_at
  before update on public.social_friend_requests
  for each row execute function public.set_updated_at();

alter table public.social_profiles enable row level security;
alter table public.social_friend_requests enable row level security;
alter table public.social_friendships enable row level security;

drop policy if exists "Members can manage their own social profile" on public.social_profiles;
create policy "Members can manage their own social profile"
  on public.social_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Members can view their friend requests" on public.social_friend_requests;
create policy "Members can view their friend requests"
  on public.social_friend_requests
  for select
  using (auth.uid() in (requester_user_id, recipient_user_id));

drop policy if exists "Members can view their friendships" on public.social_friendships;
create policy "Members can view their friendships"
  on public.social_friendships
  for select
  using (auth.uid() in (user_low_id, user_high_id));

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
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if normalized_handle !~ '^[a-z][a-z0-9_]{2,23}$' then
    return;
  end if;

  select *
    into target_profile
  from public.social_profiles sp
  where lower(sp.handle) = normalized_handle
    and sp.handle is not null;

  if not found then
    return;
  end if;

  if target_profile.user_id = current_user_id then
    return query
    select
      target_profile.user_id,
      target_profile.handle::text,
      target_profile.display_name,
      target_profile.avatar_url,
      'self'::text,
      null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.social_friendships sf
    where sf.user_low_id = case when current_user_id < target_profile.user_id then current_user_id else target_profile.user_id end
      and sf.user_high_id = case when current_user_id < target_profile.user_id then target_profile.user_id else current_user_id end
  ) then
    return query
    select
      target_profile.user_id,
      target_profile.handle::text,
      target_profile.display_name,
      target_profile.avatar_url,
      'friends'::text,
      null::uuid;
    return;
  end if;

  select *
    into pending_request
  from public.social_friend_requests sfr
  where sfr.status = 'pending'
    and (
      (sfr.requester_user_id = current_user_id and sfr.recipient_user_id = target_profile.user_id)
      or
      (sfr.requester_user_id = target_profile.user_id and sfr.recipient_user_id = current_user_id)
    )
  order by sfr.created_at desc
  limit 1;

  return query
  select
    target_profile.user_id,
    target_profile.handle::text,
    target_profile.display_name,
    target_profile.avatar_url,
    case
      when pending_request.id is null then 'none'
      when pending_request.requester_user_id = current_user_id then 'request_sent'
      else 'request_received'
    end,
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
    select 1 from public.social_profiles sp
    where sp.user_id = current_user_id and sp.handle is not null
  ) then
    raise exception 'Choose your handle before adding friends.';
  end if;

  select sp.user_id
    into target_user_id
  from public.social_profiles sp
  where lower(sp.handle) = normalized_handle
    and sp.handle is not null;

  if target_user_id is null then
    raise exception 'No profile found for that handle.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot add yourself as a friend.';
  end if;

  if exists (
    select 1
    from public.social_friendships sf
    where sf.user_low_id = case when current_user_id < target_user_id then current_user_id else target_user_id end
      and sf.user_high_id = case when current_user_id < target_user_id then target_user_id else current_user_id end
  ) then
    return query select null::uuid, 'friends'::text;
    return;
  end if;

  select *
    into existing_request
  from public.social_friend_requests sfr
  where sfr.status = 'pending'
    and (
      (sfr.requester_user_id = current_user_id and sfr.recipient_user_id = target_user_id)
      or
      (sfr.requester_user_id = target_user_id and sfr.recipient_user_id = current_user_id)
    )
  order by sfr.created_at desc
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
  on conflict do nothing
  returning id into inserted_request_id;

  if inserted_request_id is null then
    select *
      into existing_request
    from public.social_friend_requests sfr
    where sfr.status = 'pending'
      and (
        (sfr.requester_user_id = current_user_id and sfr.recipient_user_id = target_user_id)
        or
        (sfr.requester_user_id = target_user_id and sfr.recipient_user_id = current_user_id)
      )
    order by sfr.created_at desc
    limit 1;

    return query
    select
      existing_request.id,
      case
        when existing_request.requester_user_id = current_user_id then 'request_sent'::text
        else 'request_received'::text
      end;
    return;
  end if;

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
  from public.social_friend_requests sfr
  where sfr.id = request_id_input
    and sfr.recipient_user_id = current_user_id
    and sfr.status = 'pending'
  for update;

  if not found then
    raise exception 'This friend request is no longer available.';
  end if;

  if not accept_input then
    update public.social_friend_requests
    set status = 'declined', responded_at = now()
    where id = request_row.id;

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
    sfr.id,
    case when sfr.recipient_user_id = auth.uid() then 'incoming' else 'outgoing' end,
    sfr.status,
    other_profile.user_id,
    other_profile.handle::text,
    other_profile.display_name,
    other_profile.avatar_url,
    sfr.created_at
  from public.social_friend_requests sfr
  join public.social_profiles other_profile
    on other_profile.user_id = case
      when sfr.recipient_user_id = auth.uid() then sfr.requester_user_id
      else sfr.recipient_user_id
    end
  where auth.uid() is not null
    and auth.uid() in (sfr.requester_user_id, sfr.recipient_user_id)
    and sfr.status = 'pending'
  order by sfr.created_at desc;
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
    sf.id,
    friend_profile.user_id,
    friend_profile.handle::text,
    friend_profile.display_name,
    friend_profile.avatar_url,
    friend_profile.natal_chart,
    sf.accepted_at
  from public.social_friendships sf
  join public.social_profiles friend_profile
    on friend_profile.user_id = case
      when sf.user_low_id = auth.uid() then sf.user_high_id
      else sf.user_low_id
    end
  where auth.uid() is not null
    and auth.uid() in (sf.user_low_id, sf.user_high_id)
  order by friend_profile.display_name, friend_profile.handle;
$$;

create or replace function public.remove_social_friend(friendship_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  delete from public.social_friendships sf
  where sf.id = friendship_id_input
    and auth.uid() in (sf.user_low_id, sf.user_high_id);

  if not found then
    raise exception 'Friendship not found.';
  end if;
end;
$$;

revoke all on function public.lookup_social_profile(text) from public;
revoke all on function public.send_social_friend_request(text) from public;
revoke all on function public.respond_social_friend_request(uuid, boolean) from public;
revoke all on function public.list_social_friend_requests() from public;
revoke all on function public.list_social_friends() from public;
revoke all on function public.remove_social_friend(uuid) from public;

grant execute on function public.lookup_social_profile(text) to authenticated;
grant execute on function public.send_social_friend_request(text) to authenticated;
grant execute on function public.respond_social_friend_request(uuid, boolean) to authenticated;
grant execute on function public.list_social_friend_requests() to authenticated;
grant execute on function public.list_social_friends() to authenticated;
grant execute on function public.remove_social_friend(uuid) to authenticated;

comment on table public.social_profiles is
  'Handle-based member identity and friend-safe derived natal chart projection.';

comment on table public.social_friend_requests is
  'Pending and terminal mutual friend requests created through exact handle lookup.';

comment on table public.social_friendships is
  'Canonical mutual account friendships. One row per accepted user pair.';
