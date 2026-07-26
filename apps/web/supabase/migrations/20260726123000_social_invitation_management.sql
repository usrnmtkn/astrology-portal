-- Complete the provider-neutral social invitation lifecycle.
--
-- Invite links remain single-use and contact-bound. Preview and decline are
-- available only to the authenticated account whose verified email or phone
-- matches the invitation. Raw contact values and tokens are never stored.

alter table public.social_invitations
  add column if not exists declined_at timestamptz;

alter table public.social_invitations
  add column if not exists contact_hint text not null default 'Private contact';

create or replace function public.create_social_invitation(
  contact_kind_input text,
  contact_input text
)
returns table (
  invitation_id uuid,
  invitation_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  normalized_kind text := lower(btrim(coalesce(contact_kind_input, '')));
  normalized_contact text;
  resolved_contact_hint text;
  current_member_contact text;
  raw_token text;
  resolved_invitation_id uuid;
  resolved_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if normalized_kind = 'email' then
    normalized_contact := lower(btrim(coalesce(contact_input, '')));

    if normalized_contact !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Enter a valid email address.';
    end if;

    resolved_contact_hint := left(split_part(normalized_contact, '@', 1), 1)
      || '***@'
      || split_part(normalized_contact, '@', 2);

    select lower(btrim(coalesce(member.email, '')))
      into current_member_contact
    from auth.users member
    where member.id = auth.uid();
  elsif normalized_kind = 'phone' then
    normalized_contact := regexp_replace(coalesce(contact_input, ''), '[^0-9+]', '', 'g');

    if normalized_contact !~ '^\+[0-9]{8,15}$' then
      raise exception 'Enter a phone number with country code, such as +1 212 555 0100.';
    end if;

    resolved_contact_hint := '•••• ' || right(normalized_contact, 4);

    select regexp_replace(coalesce(member.phone, ''), '[^0-9+]', '', 'g')
      into current_member_contact
    from auth.users member
    where member.id = auth.uid();
  else
    raise exception 'Choose email or phone.';
  end if;

  if normalized_contact = current_member_contact then
    raise exception 'You cannot invite your own contact information.';
  end if;

  perform private.consume_social_rate_limit('contact-invite-minute', 60, 10);
  perform private.consume_social_rate_limit('contact-invite-day', 86400, 50);

  update public.social_invitations invitation
  set cancelled_at = now()
  where invitation.inviter_user_id = auth.uid()
    and invitation.contact_kind = normalized_kind
    and invitation.contact_hash = encode(digest(normalized_contact, 'sha256'), 'hex')
    and invitation.claimed_at is null
    and invitation.declined_at is null
    and invitation.cancelled_at is null
    and invitation.expires_at > now();

  raw_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');

  insert into public.social_invitations (
    inviter_user_id,
    contact_kind,
    contact_hash,
    contact_hint,
    token_hash
  )
  values (
    auth.uid(),
    normalized_kind,
    encode(digest(normalized_contact, 'sha256'), 'hex'),
    resolved_contact_hint,
    encode(digest(raw_token, 'sha256'), 'hex')
  )
  returning id, social_invitations.expires_at
    into resolved_invitation_id, resolved_expires_at;

  return query
  select resolved_invitation_id, raw_token, resolved_expires_at;
end;
$$;

create or replace function private.social_invitation_matches_current_user(
  invitation public.social_invitations
)
returns boolean
language plpgsql
security definer
stable
set search_path = public, private, auth, extensions
as $$
declare
  current_email text;
  current_phone text;
  current_contact_hash text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select
    lower(btrim(coalesce(member.email, ''))),
    regexp_replace(coalesce(member.phone, ''), '[^0-9+]', '', 'g')
  into current_email, current_phone
  from auth.users member
  where member.id = auth.uid();

  current_contact_hash := encode(
    digest(
      case
        when invitation.contact_kind = 'email' then current_email
        else current_phone
      end,
      'sha256'
    ),
    'hex'
  );

  return current_contact_hash = invitation.contact_hash;
end;
$$;

revoke all on function private.social_invitation_matches_current_user(
  public.social_invitations
) from public;

drop function if exists public.list_social_invitations();

create function public.list_social_invitations()
returns table (
  invitation_id uuid,
  contact_kind text,
  contact_hint text,
  invitation_status text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select
    invitation.id,
    invitation.contact_kind,
    invitation.contact_hint,
    case
      when invitation.claimed_at is not null then 'claimed'
      when invitation.declined_at is not null then 'declined'
      when invitation.cancelled_at is not null then 'cancelled'
      when invitation.expires_at <= now() then 'expired'
      else 'pending'
    end,
    invitation.created_at,
    invitation.expires_at
  from public.social_invitations invitation
  where auth.uid() is not null
    and invitation.inviter_user_id = auth.uid()
  order by invitation.created_at desc;
$$;

create or replace function public.cancel_social_invitation(
  invitation_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  update public.social_invitations invitation
  set cancelled_at = now()
  where invitation.id = invitation_id_input
    and invitation.inviter_user_id = auth.uid()
    and invitation.claimed_at is null
    and invitation.declined_at is null
    and invitation.cancelled_at is null
    and invitation.expires_at > now();

  if not found then
    raise exception 'This invitation is no longer available.';
  end if;
end;
$$;

create or replace function public.preview_social_invitation(
  invitation_token_input text
)
returns table (
  invitation_id uuid,
  contact_kind text,
  inviter_user_id uuid,
  inviter_handle text,
  inviter_display_name text,
  inviter_avatar_url text,
  expires_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, private, auth, extensions
as $$
declare
  invitation public.social_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in with the invited account.';
  end if;

  select *
    into invitation
  from public.social_invitations candidate
  where candidate.token_hash = encode(
    digest(btrim(coalesce(invitation_token_input, '')), 'sha256'),
    'hex'
  )
    and candidate.cancelled_at is null
    and candidate.declined_at is null
    and candidate.expires_at > now();

  if not found then
    raise exception 'This invitation is invalid or has expired.';
  end if;

  if invitation.inviter_user_id = auth.uid() then
    raise exception 'You cannot accept your own invitation.';
  end if;

  if not private.social_invitation_matches_current_user(invitation) then
    raise exception 'Sign in with the email address or phone number that received this invitation.';
  end if;

  if exists (
    select 1
    from public.social_blocks block
    where (
      block.blocker_user_id = invitation.inviter_user_id
      and block.blocked_user_id = auth.uid()
    )
    or (
      block.blocker_user_id = auth.uid()
      and block.blocked_user_id = invitation.inviter_user_id
    )
  ) then
    raise exception 'This invitation is no longer available.';
  end if;

  return query
  select
    invitation.id,
    invitation.contact_kind,
    inviter.user_id,
    inviter.handle::text,
    inviter.display_name,
    inviter.avatar_url,
    invitation.expires_at
  from public.social_profiles inviter
  where inviter.user_id = invitation.inviter_user_id;
end;
$$;

create or replace function public.decline_social_invitation(
  invitation_token_input text
)
returns void
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  invitation public.social_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in with the invited account.';
  end if;

  select *
    into invitation
  from public.social_invitations candidate
  where candidate.token_hash = encode(
    digest(btrim(coalesce(invitation_token_input, '')), 'sha256'),
    'hex'
  )
    and candidate.claimed_at is null
    and candidate.cancelled_at is null
    and candidate.declined_at is null
    and candidate.expires_at > now()
  for update;

  if not found or not private.social_invitation_matches_current_user(invitation) then
    raise exception 'This invitation is no longer available.';
  end if;

  update public.social_invitations
  set declined_at = now()
  where id = invitation.id;
end;
$$;

-- Replace claim with the same contact and block checks used by preview.
create or replace function public.claim_social_invitation(invitation_token_input text)
returns table (
  invitation_id uuid,
  request_id uuid,
  request_status text
)
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  invitation public.social_invitations%rowtype;
  resolved_request_id uuid;
  resolved_friendship_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select *
    into invitation
  from public.social_invitations candidate
  where candidate.token_hash = encode(
    digest(btrim(coalesce(invitation_token_input, '')), 'sha256'),
    'hex'
  )
    and candidate.cancelled_at is null
    and candidate.declined_at is null
    and candidate.expires_at > now()
  for update;

  if not found then
    raise exception 'This invitation is invalid or has expired.';
  end if;

  if invitation.inviter_user_id = current_user_id then
    raise exception 'You cannot accept your own invitation.';
  end if;

  if not private.social_invitation_matches_current_user(invitation) then
    raise exception 'Sign in with the email address or phone number that received this invitation.';
  end if;

  if invitation.claimed_by_user_id is not null
    and invitation.claimed_by_user_id <> current_user_id then
    raise exception 'This invitation has already been used.';
  end if;

  if exists (
    select 1
    from public.social_blocks block
    where (
      block.blocker_user_id = invitation.inviter_user_id
      and block.blocked_user_id = current_user_id
    )
    or (
      block.blocker_user_id = current_user_id
      and block.blocked_user_id = invitation.inviter_user_id
    )
  ) then
    raise exception 'This invitation is no longer available.';
  end if;

  if exists (
    select 1
    from public.social_friendships friendship
    where friendship.user_low_id = least(invitation.inviter_user_id, current_user_id)
      and friendship.user_high_id = greatest(invitation.inviter_user_id, current_user_id)
  ) then
    update public.social_invitations
    set
      claimed_by_user_id = current_user_id,
      claimed_at = coalesce(claimed_at, now())
    where id = invitation.id;

    return query select invitation.id, null::uuid, 'friends'::text;
    return;
  end if;

  select request.id
    into resolved_request_id
  from public.social_friend_requests request
  where request.status = 'pending'
    and (
      (
        request.requester_user_id = invitation.inviter_user_id
        and request.recipient_user_id = current_user_id
      )
      or (
        request.requester_user_id = current_user_id
        and request.recipient_user_id = invitation.inviter_user_id
      )
    )
  order by request.created_at desc
  limit 1;

  if resolved_request_id is null then
    insert into public.social_friend_requests (
      requester_user_id,
      recipient_user_id
    )
    values (
      invitation.inviter_user_id,
      current_user_id
    )
    returning id into resolved_request_id;
  end if;

  insert into public.social_friendships (
    user_low_id,
    user_high_id,
    created_from_request_id
  )
  values (
    least(invitation.inviter_user_id, current_user_id),
    greatest(invitation.inviter_user_id, current_user_id),
    resolved_request_id
  )
  on conflict (user_low_id, user_high_id) do update
  set accepted_at = public.social_friendships.accepted_at
  returning id into resolved_friendship_id;

  update public.social_friend_requests request
  set
    status = 'accepted',
    responded_at = now()
  where request.status = 'pending'
    and (
      (
        request.requester_user_id = invitation.inviter_user_id
        and request.recipient_user_id = current_user_id
      )
      or (
        request.requester_user_id = current_user_id
        and request.recipient_user_id = invitation.inviter_user_id
      )
    );

  update public.social_invitations
  set
    claimed_by_user_id = current_user_id,
    claimed_at = coalesce(claimed_at, now())
  where id = invitation.id;

  perform private.record_social_audit_event(
    'friend_request_accepted',
    invitation.inviter_user_id
  );

  return query select invitation.id, resolved_request_id, 'friends'::text;
end;
$$;

revoke all on function public.list_social_invitations() from public;
revoke all on function public.create_social_invitation(text, text) from public;
revoke all on function public.cancel_social_invitation(uuid) from public;
revoke all on function public.preview_social_invitation(text) from public;
revoke all on function public.decline_social_invitation(text) from public;
revoke all on function public.claim_social_invitation(text) from public;

grant execute on function public.list_social_invitations() to authenticated;
grant execute on function public.create_social_invitation(text, text) to authenticated;
grant execute on function public.cancel_social_invitation(uuid) to authenticated;
grant execute on function public.preview_social_invitation(text) to authenticated;
grant execute on function public.decline_social_invitation(text) to authenticated;
grant execute on function public.claim_social_invitation(text) to authenticated;

notify pgrst, 'reload schema';
