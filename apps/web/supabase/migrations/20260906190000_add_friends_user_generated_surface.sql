-- Allow private Friends-generated readings to persist in the governed user-generated content table.

alter table public.user_generated_interpretations
  drop constraint if exists user_generated_interpretations_surface_check;

alter table public.user_generated_interpretations
  add constraint user_generated_interpretations_surface_check
  check (surface in ('sky', 'you', 'natal', 'synastry', 'composite', 'relationship', 'friends', 'year_ahead'));
