-- Disposable migrated database only; all fixture writes are rolled back.
begin;
create function pg_temp.claim_denied(token text) returns boolean language plpgsql as $$
begin
  perform public.claim_social_invitation(token);
  return false;
exception when others then return true;
end $$;
do $$
declare
  sender uuid := gen_random_uuid();
  recipient uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  invitation uuid;
  token text;
  recipient_email text := gen_random_uuid()::text || '@example.test';
begin
  insert into auth.users(id, email, email_confirmed_at) values
    (sender, gen_random_uuid()::text || '@example.test', now()),
    (recipient, recipient_email, now()),
    (stranger, gen_random_uuid()::text || '@example.test', now());
  insert into public.social_profiles(user_id, handle, display_name) values
    (sender, 'qa_' || left(sender::text, 8), 'Fixture sender'),
    (recipient, 'qa_' || left(recipient::text, 8), 'Fixture recipient'),
    (stranger, 'qa_' || left(stranger::text, 8), 'Fixture stranger');
  perform set_config('request.jwt.claim.sub', sender::text, true);
  select invitation_id, invitation_token into invitation, token from public.create_social_invitation('email', recipient_email);
  if not pg_temp.claim_denied(token) then raise exception 'Self claim succeeded'; end if;
  perform set_config('request.jwt.claim.sub', '', true);
  if not pg_temp.claim_denied(token) then raise exception 'Anonymous claim succeeded'; end if;
  perform set_config('request.jwt.claim.sub', stranger::text, true);
  if not pg_temp.claim_denied(token) then raise exception 'Wrong recipient claim succeeded'; end if;
  perform set_config('request.jwt.claim.sub', recipient::text, true);
  update public.social_invitations set expires_at = now() - interval '1 second' where id = invitation;
  if not pg_temp.claim_denied(token) then raise exception 'Expired claim succeeded'; end if;
  update public.social_invitations set expires_at = now() + interval '1 day', cancelled_at = now() where id = invitation;
  if not pg_temp.claim_denied(token) then raise exception 'Cancelled claim succeeded'; end if;
  update public.social_invitations set cancelled_at = null where id = invitation;
  insert into public.social_blocks(blocker_user_id, blocked_user_id) values(sender, recipient);
  if not pg_temp.claim_denied(token) then raise exception 'Blocked claim succeeded'; end if;
  delete from public.social_blocks where blocker_user_id = sender and blocked_user_id = recipient;
  perform public.claim_social_invitation(token);
  perform public.claim_social_invitation(token);
  if (select count(*) from public.social_friendships where user_low_id = least(sender, recipient) and user_high_id = greatest(sender, recipient)) <> 1 then
    raise exception 'Retry did not retain exactly one friendship';
  end if;
  if not exists(select 1 from public.list_social_friends() where user_id = sender) then raise exception 'Recipient Circle missing friendship'; end if;
  perform set_config('request.jwt.claim.sub', sender::text, true);
  if not exists(select 1 from public.list_social_friends() where user_id = recipient) then raise exception 'Sender Circle missing friendship'; end if;
  select invitation_id, invitation_token into invitation, token from public.create_social_share_invitation();
  perform set_config('request.jwt.claim.sub', recipient::text, true);
  perform public.claim_social_invitation(token);
  perform set_config('request.jwt.claim.sub', stranger::text, true);
  if not pg_temp.claim_denied(token) then raise exception 'Different account replayed a claimed share link'; end if;
end $$;
rollback;
