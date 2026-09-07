-- Owner-only Ask TLDR Content Studio records reuse the existing global editorial
-- table. RLS is unchanged: only explicitly serving LIVE rows are publicly readable.
--
-- Preserve every existing generated_interpretations mode/surface while adding
-- only the Ask TLDR owner-preview values. The final check makes this surface
-- structurally non-serving even if another admin path attempts promotion.

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_mode_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_mode_check
  check (mode in ('feed', 'in_depth', 'article', 'report', 'studio-draft', 'question', 'preview'));

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_surface_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_surface_check
  check (surface in ('sky', 'you', 'natal', 'synastry', 'composite', 'relationship', 'modifier', 'year_ahead', 'ask_tldr'));

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_ask_tldr_non_serving_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_ask_tldr_non_serving_check
  check (surface <> 'ask_tldr' or status <> 'LIVE');

create index if not exists generated_interpretations_ask_tldr_review_idx
  on public.generated_interpretations (mode, updated_at desc)
  where surface = 'ask_tldr' and status in ('DRAFT', 'REVIEWED');
