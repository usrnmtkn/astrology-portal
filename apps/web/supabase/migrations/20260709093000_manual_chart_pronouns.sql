alter table public.manual_charts
  add column if not exists pronouns text not null default 'name_only';

alter table public.manual_charts
  drop constraint if exists manual_charts_pronouns_check;

alter table public.manual_charts
  add constraint manual_charts_pronouns_check
  check (pronouns in ('she', 'he', 'they', 'name_only'));
