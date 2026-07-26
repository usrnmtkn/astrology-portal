-- Per-friend chart-sharing controls.
--
-- A friendship remains mutual while either member may independently pause the
-- derived natal-chart projection they share with that friend. Identity fields
-- remain visible so the relationship can be managed and sharing can be resumed.

alter table public.social_friendships
  add column if not exists low_shares_chart boolean not null default true,
  add column if not exists high_shares_chart boolean not null default true;

alter table private.social_audit_events
  drop constraint if exists social_audit_event_type_valid;

alter table private.social_audit_events
  add constraint social_audit_event_type_valid
    check (event_type in (
      'friend_request_sent',
      'friend_request_accepted',
      'friend_request_declined',
      'friend_removed',
      'member_blocked',
      'member_unblocked',
      'chart_sharing_paused',
      'chart_sharing_resumed'
    ));

drop function if exists public.list_social_friends();

create function public.list_social_friends()
returns table (
  friendship_id uuid,
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  natal_chart jsonb,
  viewer_shares_chart boolean,
  friend_shares_chart boolean,
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
    case
      when (
        case
          when friend_profile.user_id = friendship.user_low_id
            then friendship.low_shares_chart
          else friendship.high_shares_chart
        end
      ) then friend_profile.natal_chart
      else null::jsonb
    end,
    case
      when auth.uid() = friendship.user_low_id
        then friendship.low_shares_chart
      else friendship.high_shares_chart
    end,
    case
      when friend_profile.user_id = friendship.user_low_id
        then friendship.low_shares_chart
      else friendship.high_shares_chart
    end,
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

create or replace function public.set_social_friend_chart_sharing(
  friendship_id_input uuid,
  share_input boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  friend_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if share_input is null then
    raise exception 'Choose whether to share your chart.';
  end if;

  update public.social_friendships friendship
  set
    low_shares_chart = case
      when friendship.user_low_id = current_user_id then share_input
      else friendship.low_shares_chart
    end,
    high_shares_chart = case
      when friendship.user_high_id = current_user_id then share_input
      else friendship.high_shares_chart
    end
  where friendship.id = friendship_id_input
    and current_user_id in (friendship.user_low_id, friendship.user_high_id)
  returning case
    when friendship.user_low_id = current_user_id then friendship.user_high_id
    else friendship.user_low_id
  end
  into friend_user_id;

  if friend_user_id is null then
    raise exception 'Friendship not found.';
  end if;

  perform private.record_social_audit_event(
    case when share_input then 'chart_sharing_resumed' else 'chart_sharing_paused' end,
    friend_user_id
  );
end;
$$;

revoke all on function public.list_social_friends() from public;
revoke all on function public.set_social_friend_chart_sharing(uuid, boolean) from public;

grant execute on function public.list_social_friends() to authenticated;
grant execute on function public.set_social_friend_chart_sharing(uuid, boolean) to authenticated;

comment on column public.social_friendships.low_shares_chart is
  'Whether the lower-ID member shares their derived natal-chart projection with this friend.';

comment on column public.social_friendships.high_shares_chart is
  'Whether the higher-ID member shares their derived natal-chart projection with this friend.';

comment on function public.set_social_friend_chart_sharing(uuid, boolean) is
  'Lets either member independently pause or resume their own derived chart projection for this friendship.';

notify pgrst, 'reload schema';
