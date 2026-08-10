-- Add the shared generation lane used by premium reports without changing RLS.

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_mode_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_mode_check
  check (mode in ('feed', 'in_depth', 'article', 'report'));

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_surface_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_surface_check
  check (surface in ('sky', 'you', 'natal', 'synastry', 'composite', 'relationship', 'modifier', 'year_ahead'));

alter table public.user_generated_interpretations
  drop constraint if exists user_generated_interpretations_mode_check;

alter table public.user_generated_interpretations
  add constraint user_generated_interpretations_mode_check
  check (mode in ('feed', 'in_depth', 'article', 'report'));

alter table public.user_generated_interpretations
  drop constraint if exists user_generated_interpretations_surface_check;

alter table public.user_generated_interpretations
  add constraint user_generated_interpretations_surface_check
  check (surface in ('sky', 'you', 'natal', 'synastry', 'composite', 'relationship', 'year_ahead'));
