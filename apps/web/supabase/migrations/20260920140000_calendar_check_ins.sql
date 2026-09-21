-- Private per-account calendar mood and journal check-ins.
-- Browser clients may read and write only their own rows.

create table if not exists public.calendar_check_ins (
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  mood smallint,
  sleep smallint not null default 50,
  social smallint not null default 50,
  mood_note text not null default '',
  note text not null default '',
  tags text[] not null default '{}'::text[],
  people text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key),
  constraint calendar_check_ins_mood_range
    check (mood is null or mood between 0 and 4),
  constraint calendar_check_ins_sleep_range
    check (sleep between 0 and 100),
  constraint calendar_check_ins_social_range
    check (social between 0 and 100),
  constraint calendar_check_ins_mood_note_len
    check (char_length(mood_note) <= 4000),
  constraint calendar_check_ins_note_len
    check (char_length(note) <= 8000),
  constraint calendar_check_ins_tags_len
    check (cardinality(tags) <= 24),
  constraint calendar_check_ins_people_len
    check (cardinality(people) <= 24)
);

create table if not exists public.calendar_check_in_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, label),
  constraint calendar_check_in_library_kind_check
    check (kind in ('tag', 'person')),
  constraint calendar_check_in_library_label_len
    check (char_length(label) between 1 and 80)
);

create or replace function public.enforce_calendar_check_in_payload()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  item text;
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'calendar check-in owner cannot change';
    end if;
    if new.date_key is distinct from old.date_key then
      raise exception 'calendar check-in date cannot change';
    end if;
  end if;

  new.mood_note := coalesce(new.mood_note, '');
  new.note := coalesce(new.note, '');
  new.tags := coalesce(new.tags, '{}'::text[]);
  new.people := coalesce(new.people, '{}'::text[]);

  foreach item in array new.tags loop
    if char_length(btrim(item)) < 1 or char_length(item) > 80 then
      raise exception 'calendar check-in tag is invalid';
    end if;
  end loop;

  foreach item in array new.people loop
    if char_length(btrim(item)) < 1 or char_length(item) > 80 then
      raise exception 'calendar check-in person is invalid';
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.enforce_calendar_check_in_library_payload()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'calendar check-in library owner cannot change';
    end if;
  end if;

  new.label := btrim(new.label);
  if char_length(new.label) < 1 or char_length(new.label) > 80 then
    raise exception 'calendar check-in library label is invalid';
  end if;

  return new;
end;
$$;

drop trigger if exists calendar_check_ins_enforce_payload on public.calendar_check_ins;
create trigger calendar_check_ins_enforce_payload
  before insert or update on public.calendar_check_ins
  for each row execute function public.enforce_calendar_check_in_payload();

drop trigger if exists calendar_check_ins_set_updated_at on public.calendar_check_ins;
create trigger calendar_check_ins_set_updated_at
  before update on public.calendar_check_ins
  for each row execute function public.set_updated_at();

drop trigger if exists calendar_check_in_library_enforce_payload on public.calendar_check_in_library;
create trigger calendar_check_in_library_enforce_payload
  before insert or update on public.calendar_check_in_library
  for each row execute function public.enforce_calendar_check_in_library_payload();

drop trigger if exists calendar_check_in_library_set_updated_at on public.calendar_check_in_library;
create trigger calendar_check_in_library_set_updated_at
  before update on public.calendar_check_in_library
  for each row execute function public.set_updated_at();

alter table public.calendar_check_ins enable row level security;
alter table public.calendar_check_ins force row level security;
alter table public.calendar_check_in_library enable row level security;
alter table public.calendar_check_in_library force row level security;

drop policy if exists "Users can view their calendar check-ins" on public.calendar_check_ins;
create policy "Users can view their calendar check-ins"
  on public.calendar_check_ins
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their calendar check-ins" on public.calendar_check_ins;
create policy "Users can create their calendar check-ins"
  on public.calendar_check_ins
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their calendar check-ins" on public.calendar_check_ins;
create policy "Users can update their calendar check-ins"
  on public.calendar_check_ins
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their calendar check-ins" on public.calendar_check_ins;
create policy "Users can delete their calendar check-ins"
  on public.calendar_check_ins
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their calendar check-in library" on public.calendar_check_in_library;
create policy "Users can view their calendar check-in library"
  on public.calendar_check_in_library
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their calendar check-in library" on public.calendar_check_in_library;
create policy "Users can create their calendar check-in library"
  on public.calendar_check_in_library
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their calendar check-in library" on public.calendar_check_in_library;
create policy "Users can update their calendar check-in library"
  on public.calendar_check_in_library
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their calendar check-in library" on public.calendar_check_in_library;
create policy "Users can delete their calendar check-in library"
  on public.calendar_check_in_library
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on function public.enforce_calendar_check_in_payload() from public, anon, authenticated;
revoke all on function public.enforce_calendar_check_in_library_payload() from public, anon, authenticated;

revoke all on table public.calendar_check_ins from public, anon;
revoke all on table public.calendar_check_in_library from public, anon;

grant select, insert, update, delete on table public.calendar_check_ins to authenticated;
grant select, insert, update, delete on table public.calendar_check_in_library to authenticated;
revoke truncate, references, trigger on table public.calendar_check_ins from authenticated;
revoke truncate, references, trigger on table public.calendar_check_in_library from authenticated;
grant select, insert, update, delete on table public.calendar_check_ins to service_role;
grant select, insert, update, delete on table public.calendar_check_in_library to service_role;
