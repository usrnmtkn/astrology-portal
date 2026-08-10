-- Run against a migrated, disposable database. The test creates its own users
-- and profiles, and every mutation is rolled back. A raised exception indicates
-- an authorization or revocation regression.

begin;

do $authorization_test$
declare
  member_a uuid;
  member_b uuid;
  member_invite_test uuid;
  member_delete_test uuid;
  member_b_name text;
  member_invite_email text;
  friendship_id uuid;
  request_id uuid;
  request_status text;
  acceptance_notification_id uuid;
  created_invitation_id uuid;
  invitation_token text;
begin
  member_a := gen_random_uuid();
  member_b := gen_random_uuid();

  insert into auth.users (id)
  values (member_a), (member_b);

  insert into public.social_profiles (
    user_id,
    handle,
    display_name,
    discoverable
  )
  values
    (
      member_a,
      'auth_test_' || left(replace(member_a::text, '-', ''), 8),
      'Authorization Test A',
      true
    ),
    (
      member_b,
      'auth_test_' || left(replace(member_b::text, '-', ''), 8),
      'Authorization Test B',
      true
    );

  select profile.display_name
    into member_b_name
  from public.social_profiles profile
  where profile.user_id = member_b;

  delete from public.social_blocks
  where (
    blocker_user_id = member_a
    and blocked_user_id = member_b
  )
  or (
    blocker_user_id = member_b
    and blocked_user_id = member_a
  );

  insert into public.social_friendships (
    user_low_id,
    user_high_id
  )
  values (
    case when member_a < member_b then member_a else member_b end,
    case when member_a < member_b then member_b else member_a end
  )
  on conflict (user_low_id, user_high_id) do update
    set accepted_at = public.social_friendships.accepted_at
  returning id into friendship_id;

  perform set_config('request.jwt.claim.sub', member_a::text, true);

  if not exists (
    select 1
    from public.list_social_friends() friend
    where friend.user_id = member_b
  ) then
    raise exception 'Accepted friend could not read the shared profile.';
  end if;

  update public.social_profiles
  set natal_chart = '{"authorization_test": true}'::jsonb
  where user_id = member_a;

  perform public.ensure_own_social_profile(
    (select profile.display_name from public.social_profiles profile where profile.user_id = member_a),
    (select profile.avatar_url from public.social_profiles profile where profile.user_id = member_a),
    null
  );

  if not exists (
    select 1
    from public.social_profiles profile
    where profile.user_id = member_a
      and profile.natal_chart = '{"authorization_test": true}'::jsonb
  ) then
    raise exception 'Null profile synchronization erased the cached natal chart.';
  end if;

  perform public.set_social_friend_chart_sharing(friendship_id, false);

  if not exists (
    select 1
    from public.list_social_friends() friend
    where friend.user_id = member_b
      and friend.viewer_shares_chart = false
  ) then
    raise exception 'Member could not pause their own chart sharing.';
  end if;

  perform set_config('request.jwt.claim.sub', member_b::text, true);

  if not exists (
    select 1
    from public.list_social_friends() friend
    where friend.user_id = member_a
      and friend.friend_shares_chart = false
      and friend.natal_chart is null
  ) then
    raise exception 'Paused chart remained visible to the friend.';
  end if;

  perform set_config('request.jwt.claim.sub', member_a::text, true);
  perform public.set_social_friend_chart_sharing(friendship_id, true);

  if not exists (
    select 1
    from public.list_social_friends() friend
    where friend.user_id = member_b
      and friend.viewer_shares_chart = true
  ) then
    raise exception 'Member could not resume their own chart sharing.';
  end if;

  perform public.remove_social_friend(friendship_id);

  if exists (
    select 1
    from public.list_social_friends() friend
    where friend.user_id = member_b
  ) then
    raise exception 'Removed friend retained shared-profile access.';
  end if;

  update public.social_profiles
  set discoverable = false
  where user_id = member_b;

  if exists (
    select 1
    from public.search_social_profiles(member_b_name) result
    where result.user_id = member_b
  ) then
    raise exception 'Private member remained discoverable to another account.';
  end if;

  update public.social_profiles
  set
    discoverable = true,
    natal_chart = jsonb_build_object(
      'ascendant', 'Gemini',
      'positions', jsonb_build_array(
        jsonb_build_object('planet', 'Sun', 'sign', 'Virgo'),
        jsonb_build_object('planet', 'Moon', 'sign', 'Pisces')
      )
    )
  where user_id = member_b;

  if not exists (
    select 1
    from public.search_social_profiles(member_b_name) result
    where result.user_id = member_b
  ) then
    raise exception 'Public member could not be discovered by another account.';
  end if;

  if not exists (
    select 1
    from public.search_social_profiles_public(member_b_name) result
    where result.user_id = member_b
      and result.sun_sign = 'Virgo'
  ) then
    raise exception 'Public discovery did not expose the derived Sun sign.';
  end if;

  if not exists (
    select 1
    from public.search_social_profiles(member_b_name || 'ner') result
    where result.user_id = member_b
  ) then
    raise exception 'Public member could not be discovered through a longer name-token prefix.';
  end if;

  if not exists (
    select 1
    from public.search_social_profiles(
      '@' || (
        select profile.handle
        from public.social_profiles profile
        where profile.user_id = member_b
      )
    ) result
    where result.user_id = member_b
  ) then
    raise exception 'Public member could not be discovered through an exact handle.';
  end if;

  perform public.block_social_user(member_b);

  if exists (
    select 1
    from public.search_social_profiles(member_b_name) result
    where result.user_id = member_b
  ) then
    raise exception 'Blocked member remained discoverable to the blocker.';
  end if;

  if not exists (
    select 1
    from public.list_social_blocks() blocked
    where blocked.user_id = member_b
  ) then
    raise exception 'Blocker could not list the account they blocked.';
  end if;

  perform set_config('request.jwt.claim.sub', member_b::text, true);

  if exists (
    select 1
    from public.search_social_profiles(
      (
        select profile.display_name
        from public.social_profiles profile
        where profile.user_id = member_a
      )
    ) result
    where result.user_id = member_a
  ) then
    raise exception 'Block remained visible from the blocked account side.';
  end if;

  if exists (
    select 1
    from public.list_social_friends() friend
    where friend.user_id = member_a
  ) then
    raise exception 'Blocked account retained shared-profile access.';
  end if;

  perform set_config('request.jwt.claim.sub', member_a::text, true);
  perform public.unblock_social_user(member_b);

  if not exists (
    select 1
    from public.search_social_profiles(member_b_name) result
    where result.user_id = member_b
  ) then
    raise exception 'Unblocked public member did not become discoverable.';
  end if;

  select sent.request_id, sent.request_status
    into request_id, request_status
  from public.send_social_friend_request(
    (
      select profile.handle
      from public.social_profiles profile
      where profile.user_id = member_b
    )
  ) sent;

  perform public.cancel_social_friend_request(request_id);

  if exists (
    select 1
    from public.social_friend_requests request
    where request.id = request_id
      and request.status = 'pending'
  ) then
    raise exception 'Cancelled outgoing request remained pending.';
  end if;

  select sent.request_id, sent.request_status
    into request_id, request_status
  from public.send_social_friend_request(
    (
      select profile.handle
      from public.social_profiles profile
      where profile.user_id = member_b
    )
  ) sent;

  perform set_config('request.jwt.claim.sub', member_b::text, true);

  select sent.request_id, sent.request_status
    into request_id, request_status
  from public.send_social_friend_request(
    (
      select profile.handle
      from public.social_profiles profile
      where profile.user_id = member_a
    )
  ) sent;

  if request_status <> 'request_received' then
    raise exception 'Opposite-direction simultaneous request created a second pending flow.';
  end if;

  select accepted.friendship_id
    into friendship_id
  from public.respond_social_friend_request(request_id, true) accepted;

  perform set_config('request.jwt.claim.sub', member_a::text, true);

  select notification.notification_id
    into acceptance_notification_id
  from public.list_social_notifications() notification
  where notification.actor_user_id = member_b
  order by notification.created_at desc
  limit 1;

  if acceptance_notification_id is null then
    raise exception 'Accepted request did not create a requester notification.';
  end if;

  perform public.dismiss_social_notification(acceptance_notification_id);

  if exists (
    select 1
    from public.list_social_notifications() notification
    where notification.notification_id = acceptance_notification_id
  ) then
    raise exception 'Dismissed acceptance notification remained visible.';
  end if;

  perform public.remove_social_friend(friendship_id);

  member_invite_test := gen_random_uuid();
  member_invite_email := 'codex-invite-'
    || left(replace(member_invite_test::text, '-', ''), 12)
    || '@example.com';

  insert into auth.users (id, email)
  values (member_invite_test, member_invite_email);

  insert into public.social_profiles (
    user_id,
    handle,
    display_name,
    discoverable
  )
  values (
    member_invite_test,
    'invite_test_' || left(replace(member_invite_test::text, '-', ''), 8),
    'Invitation Authorization Test',
    true
  );

  perform set_config('request.jwt.claim.sub', member_a::text, true);

  select created.invitation_id, created.invitation_token
    into created_invitation_id, invitation_token
  from public.create_social_invitation('email', member_invite_email) created;

  if not exists (
    select 1
    from public.list_social_invitations() invitation
    where invitation.invitation_id = created_invitation_id
      and invitation.invitation_status = 'pending'
  ) then
    raise exception 'Created invitation was not visible to its sender.';
  end if;

  perform set_config('request.jwt.claim.sub', member_invite_test::text, true);

  if not exists (
    select 1
    from public.preview_social_invitation(invitation_token) preview
    where preview.invitation_id = created_invitation_id
      and preview.inviter_user_id = member_a
  ) then
    raise exception 'Verified invitation recipient could not preview the inviter.';
  end if;

  select claimed.request_status
    into request_status
  from public.claim_social_invitation(invitation_token) claimed;

  if request_status <> 'friends' then
    raise exception 'Accepting a contact invitation did not create the friendship.';
  end if;

  if not exists (
    select 1
    from public.list_social_friends() friend
    where friend.user_id = member_a
  ) then
    raise exception 'Invitation recipient could not read the accepted friendship.';
  end if;

  select friend.friendship_id
    into friendship_id
  from public.list_social_friends() friend
  where friend.user_id = member_a;

  perform public.remove_social_friend(friendship_id);
  perform set_config('request.jwt.claim.sub', member_a::text, true);

  select created.invitation_id, created.invitation_token
    into created_invitation_id, invitation_token
  from public.create_social_share_invitation() created;

  perform set_config('request.jwt.claim.sub', member_b::text, true);

  if not exists (
    select 1
    from public.preview_social_invitation(invitation_token) preview
    where preview.invitation_id = created_invitation_id
      and preview.contact_kind = 'link'
      and preview.inviter_user_id = member_a
  ) then
    raise exception 'Share-link recipient could not preview the inviter.';
  end if;

  select claimed.request_status
    into request_status
  from public.claim_social_invitation(invitation_token) claimed;

  if request_status <> 'friends' then
    raise exception 'Accepting a share link did not create the friendship.';
  end if;

  select friend.friendship_id
    into friendship_id
  from public.list_social_friends() friend
  where friend.user_id = member_a;

  perform public.remove_social_friend(friendship_id);
  perform set_config('request.jwt.claim.sub', member_a::text, true);

  select created.invitation_id
    into created_invitation_id
  from public.create_social_invitation('email', member_invite_email) created;

  perform public.cancel_social_invitation(created_invitation_id);

  if not exists (
    select 1
    from public.list_social_invitations() invitation
    where invitation.invitation_id = created_invitation_id
      and invitation.invitation_status = 'cancelled'
  ) then
    raise exception 'Cancelled invitation remained active.';
  end if;

  member_delete_test := gen_random_uuid();

  insert into auth.users (id)
  values (member_delete_test);

  insert into public.social_profiles (
    user_id,
    handle,
    display_name,
    discoverable
  )
  values (
    member_delete_test,
    'delete_test_' || left(replace(member_delete_test::text, '-', ''), 8),
    'Deletion Cascade Test',
    true
  );

  insert into public.social_friend_requests (
    requester_user_id,
    recipient_user_id
  )
  values (
    member_delete_test,
    member_a
  );

  insert into public.social_blocks (
    blocker_user_id,
    blocked_user_id
  )
  values (
    member_delete_test,
    member_a
  );

  insert into private.social_rate_limits (
    user_id,
    action_key,
    window_started_at,
    attempt_count
  )
  values (
    member_delete_test,
    'deletion-cascade-test',
    now(),
    1
  );

  insert into private.social_audit_events (
    actor_user_id,
    subject_user_id,
    event_type
  )
  values (
    member_delete_test,
    member_a,
    'member_blocked'
  );

  delete from auth.users
  where id = member_delete_test;

  if exists (
    select 1 from public.social_profiles where user_id = member_delete_test
    union all
    select 1 from public.social_friend_requests
      where requester_user_id = member_delete_test or recipient_user_id = member_delete_test
    union all
    select 1 from public.social_blocks
      where blocker_user_id = member_delete_test or blocked_user_id = member_delete_test
    union all
    select 1 from public.social_invitations
      where inviter_user_id = member_delete_test or claimed_by_user_id = member_delete_test
    union all
    select 1 from private.social_rate_limits where user_id = member_delete_test
    union all
    select 1 from private.social_audit_events
      where actor_user_id = member_delete_test or subject_user_id = member_delete_test
  ) then
    raise exception 'Account deletion left social or monitoring rows behind.';
  end if;
end;
$authorization_test$;

rollback;
