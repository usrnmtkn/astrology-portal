-- Allows the admin content dashboard to save long-form Sky rows that are
-- authored as articles or lunar calendar entries.

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_block_type_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_block_type_check
  check (
    block_type is null
    or block_type in (
      'sign',
      'house',
      'ruler',
      'natal_aspect',
      'sky_aspect',
      'sky_article',
      'lunar_calendar',
      'transit_to_natal_aspect',
      'synastry_aspect',
      'composite_aspect',
      'condition_modifier',
      'synthesis',
      'essay'
    )
  );

comment on column public.generated_interpretations.block_type is
  'Reusable content block type. Includes explicit sky_article, lunar_calendar, condition_modifier, and aspect-family values.';
