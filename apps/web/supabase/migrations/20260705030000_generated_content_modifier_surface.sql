alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_surface_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_surface_check
  check (surface in ('sky', 'you', 'natal', 'synastry', 'composite', 'relationship', 'modifier'));
