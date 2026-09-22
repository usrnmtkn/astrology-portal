-- Run against a migrated, disposable database. Every mutation is rolled back.

begin;

do $calendar_check_in_auth$
declare
  member_a constant uuid := '00000000-0000-4000-8000-00000000c001';
  member_b constant uuid := '00000000-0000-4000-8000-00000000c002';
  visible integer;
  forced boolean;
begin
  if to_regclass('public.calendar_check_ins') is null
    or to_regclass('public.calendar_check_in_library') is null then
    raise exception 'Calendar check-in tables are missing.';
  end if;

  select relrowsecurity and relforcerowsecurity
    into forced
  from pg_class
  where oid = 'public.calendar_check_ins'::regclass;

  if not coalesce(forced, false) then
    raise exception 'calendar_check_ins must enable and force RLS.';
  end if;

  select relrowsecurity and relforcerowsecurity
    into forced
  from pg_class
  where oid = 'public.calendar_check_in_library'::regclass;

  if not coalesce(forced, false) then
    raise exception 'calendar_check_in_library must enable and force RLS.';
  end if;

  if has_table_privilege('anon', 'public.calendar_check_ins', 'SELECT')
    or has_table_privilege('anon', 'public.calendar_check_ins', 'INSERT')
    or has_table_privilege('anon', 'public.calendar_check_ins', 'UPDATE')
    or has_table_privilege('anon', 'public.calendar_check_ins', 'DELETE')
    or has_table_privilege('anon', 'public.calendar_check_in_library', 'SELECT')
    or has_table_privilege('anon', 'public.calendar_check_in_library', 'INSERT') then
    raise exception 'Anonymous role can access calendar check-ins.';
  end if;

  if not has_table_privilege('authenticated', 'public.calendar_check_ins', 'SELECT')
    or not has_table_privilege('authenticated', 'public.calendar_check_ins', 'INSERT')
    or not has_table_privilege('authenticated', 'public.calendar_check_ins', 'UPDATE')
    or not has_table_privilege('authenticated', 'public.calendar_check_ins', 'DELETE') then
    raise exception 'Authenticated role cannot manage its own calendar check-ins.';
  end if;

  insert into auth.users (id) values (member_a), (member_b);

  perform set_config('request.jwt.claim.sub', member_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', member_a::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';

  insert into public.calendar_check_ins (
    user_id, date_key, mood, sleep, social, mood_note, note, tags, people
  ) values (
    member_a,
    date '2026-09-20',
    3,
    62,
    40,
    'quiet morning',
    'kept the evening short',
    array['Rest Day'],
    array['Sam']
  );

  insert into public.calendar_check_in_library (user_id, kind, label)
  values (member_a, 'tag', 'Rest Day'), (member_a, 'person', 'Sam');

  select count(*) into visible
  from public.calendar_check_ins
  where date_key = date '2026-09-20';

  if visible <> 1 then
    raise exception 'Owner could not read their calendar check-in.';
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', member_b::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', member_b::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';

  select count(*) into visible
  from public.calendar_check_ins;

  if visible <> 0 then
    raise exception 'Authenticated user read another account calendar check-in.';
  end if;

  select count(*) into visible
  from public.calendar_check_in_library;

  if visible <> 0 then
    raise exception 'Authenticated user read another account check-in library.';
  end if;

  begin
    insert into public.calendar_check_ins (user_id, date_key, mood, note)
    values (member_a, date '2026-09-21', 4, 'stolen');
    raise exception 'Authenticated user inserted another account check-in.';
  exception
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm not ilike '%row-level security%' then
        raise;
      end if;
  end;

  begin
    update public.calendar_check_ins
    set note = 'rewritten'
    where user_id = member_a;
    if found then
      raise exception 'Authenticated user updated another account check-in.';
    end if;
  exception
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm not ilike '%row-level security%' then
        raise;
      end if;
  end;

  insert into public.calendar_check_ins (user_id, date_key, mood, note)
  values (member_b, date '2026-09-20', 1, 'own row');

  delete from public.calendar_check_ins
  where user_id = member_b
    and date_key = date '2026-09-20';

  select count(*) into visible
  from public.calendar_check_ins
  where user_id = member_b;

  if visible <> 0 then
    raise exception 'Owner could not delete their calendar check-in.';
  end if;

  insert into public.calendar_check_ins (user_id, date_key, mood, note)
  values (member_b, date '2026-09-20', 1, 'own row');

  begin
    update public.calendar_check_ins
    set user_id = member_a
    where user_id = member_b
      and date_key = date '2026-09-20';
    if found then
      raise exception 'Authenticated user reassigned a calendar check-in.';
    end if;
  exception
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm not ilike '%row-level security%'
        and sqlerrm not ilike '%owner cannot change%' then
        raise;
      end if;
  end;

  delete from public.calendar_check_ins
  where user_id = member_a;

  if found then
    raise exception 'Authenticated user deleted another account check-in.';
  end if;

  -- The non-owner cannot SELECT this row either. Inspect persistence only
  -- after leaving the restricted role; zero visible rows is expected under RLS.
  execute 'reset role';

  select count(*) into visible
  from public.calendar_check_ins
  where user_id = member_a;

  if visible <> 1 then
    raise exception 'Authenticated user deleted another account check-in.';
  end if;

  delete from auth.users
  where id = member_a;

  if exists (
    select 1 from public.calendar_check_ins where user_id = member_a
    union all
    select 1 from public.calendar_check_in_library where user_id = member_a
  ) then
    raise exception 'Account deletion left calendar check-in rows behind.';
  end if;

  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);

  begin
    perform count(*) from public.calendar_check_ins;
    raise exception 'Anonymous role can query calendar check-ins.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$calendar_check_in_auth$;

reset role;
rollback;
