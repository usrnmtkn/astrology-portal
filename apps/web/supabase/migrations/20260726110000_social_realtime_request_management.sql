-- Live friend-request management and durable acceptance notices.
--
-- Realtime delivers only row-change signals. All user-facing data is still
-- reloaded through the narrow, authorization-aware RPCs below.

alter table private.social_audit_events
  drop constraint if exists social_audit_event_type_valid;

alter table private.social_audit_events
  add constraint social_audit_event_type_valid
    check (event_type in (
      'friend_request_sent',
      'friend_request_accepted',
      'friend_request_declined',
      'friend_request_cancelled',
      'friend_removed',
      'member_blocked',
      'member_unblocked',
      'chart_sharing_paused',
      'chart_sharing_resumed'
    ));

create table if not exists public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  source_request_id uuid references public.social_friend_requests(id) on delete set null,
  friendship_id uuid references public.social_friendships(id) on delete set null,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint social_notifications_not_self
    check (recipient_user_id <> actor_user_id),
  constraint social_notifications_type_valid
    check (notification_type in ('friend_request_accepted'))
);

create unique index if not exists social_notifications_acceptance_unique_idx
  on public.social_notifications(source_request_id, notification_type)
  where source_request_id is not null;

create index if not exists social_notifications_recipient_created_idx
  on public.social_notifications(recipient_user_id, created_at desc)
  where dismissed_at is null;

alter table public.social_notifications enable row level security;

drop policy if exists "Members can view their social notifications"
  on public.social_notifications;
create policy "Members can view their social notifications"
  on public.social_notifications
  for select
  using (auth.uid() = recipient_user_id);

revoke all on table public.social_notifications from public, anon;
grant select on table public.social_notifications to authenticated;

create or replace function private.create_friend_acceptance_notification()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth, extensions
as $$
declare
  resolved_friendship_id uuid;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    select friendship.id
      into resolved_friendship_id
    from public.social_friendships friendship
    where friendship.created_from_request_id = new.id
       or (
         friendship.user_low_id = least(new.requester_user_id, new.recipient_user_id)
         and friendship.user_high_id = greatest(new.requester_user_id, new.recipient_user_id)
       )
    order by (friendship.created_from_request_id = new.id) desc
    limit 1;

    insert into public.social_notifications (
      recipient_user_id,
      actor_user_id,
      notification_type,
      source_request_id,
      friendship_id,
      created_at
    )
    values (
      new.requester_user_id,
      new.recipient_user_id,
      'friend_request_accepted',
      new.id,
      resolved_friendship_id,
      coalesce(new.responded_at, now())
    )
    on conflict (source_request_id, notification_type) where source_request_id is not null
      do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.create_friend_acceptance_notification() from public;

drop trigger if exists social_friend_requests_create_acceptance_notification
  on public.social_friend_requests;
create trigger social_friend_requests_create_acceptance_notification
  after update of status on public.social_friend_requests
  for each row execute function private.create_friend_acceptance_notification();

create or replace function public.cancel_social_friend_request(request_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  target_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  update public.social_friend_requests request
  set
    status = 'cancelled',
    responded_at = now()
  where request.id = request_id_input
    and request.requester_user_id = auth.uid()
    and request.status = 'pending'
  returning request.recipient_user_id into target_user_id;

  if target_user_id is null then
    raise exception 'This outgoing request is no longer available.';
  end if;

  perform private.record_social_audit_event(
    'friend_request_cancelled',
    target_user_id
  );
end;
$$;

create or replace function public.list_social_notifications()
returns table (
  notification_id uuid,
  notification_type text,
  actor_user_id uuid,
  actor_handle text,
  actor_display_name text,
  actor_avatar_url text,
  friendship_id uuid,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select
    notification.id,
    notification.notification_type,
    actor.user_id,
    actor.handle::text,
    actor.display_name,
    actor.avatar_url,
    notification.friendship_id,
    notification.created_at
  from public.social_notifications notification
  join public.social_profiles actor
    on actor.user_id = notification.actor_user_id
  where auth.uid() is not null
    and notification.recipient_user_id = auth.uid()
    and notification.dismissed_at is null
  order by notification.created_at desc;
$$;

create or replace function public.dismiss_social_notification(notification_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  update public.social_notifications notification
  set dismissed_at = now()
  where notification.id = notification_id_input
    and notification.recipient_user_id = auth.uid()
    and notification.dismissed_at is null;

  if not found then
    raise exception 'This notification is no longer available.';
  end if;
end;
$$;

revoke all on function public.cancel_social_friend_request(uuid) from public;
revoke all on function public.list_social_notifications() from public;
revoke all on function public.dismiss_social_notification(uuid) from public;

grant execute on function public.cancel_social_friend_request(uuid) to authenticated;
grant execute on function public.list_social_notifications() to authenticated;
grant execute on function public.dismiss_social_notification(uuid) to authenticated;

-- Supabase Realtime still applies each table's RLS policy. The authenticated
-- role needs SELECT for Postgres Changes to receive only its permitted rows.
grant select on table public.social_friend_requests to authenticated;
grant select on table public.social_friendships to authenticated;

do $realtime$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'social_friend_requests'
    ) then
      alter publication supabase_realtime add table public.social_friend_requests;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'social_friendships'
    ) then
      alter publication supabase_realtime add table public.social_friendships;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'social_notifications'
    ) then
      alter publication supabase_realtime add table public.social_notifications;
    end if;
  end if;
end;
$realtime$;

comment on table public.social_notifications is
  'Minimal owner-only social notices. No chart, birth, email, phone, or message content.';

comment on function public.cancel_social_friend_request(uuid) is
  'Allows only the requester to cancel their own still-pending friend request.';

notify pgrst, 'reload schema';
