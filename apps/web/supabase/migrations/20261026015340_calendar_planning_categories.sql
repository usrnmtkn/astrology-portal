begin;
alter table public.calendar_subscriptions
  add column latitude double precision,
  add column longitude double precision,
  add column location_label text,
  add constraint calendar_subscriptions_location_check check (
    (latitude is null and longitude is null and location_label is null)
    or (latitude is not null and longitude is not null and location_label is not null
      and latitude between -90 and 90 and longitude between -180 and 180
      and char_length(location_label) between 1 and 200)
  );
alter table public.calendar_subscriptions
  drop constraint calendar_subscriptions_include_check;
alter table public.calendar_subscriptions
  add constraint calendar_subscriptions_include_check check (
    cardinality(include) between 1 and 11
    and include <@ array['lunations','quarter-moons','void-moons','daily-guidance','moon-signs','seasons','ingresses','retrogrades','key','weekly','aspects']::text[]
  );
commit;
