-- Keep the generated_interpretations block_type constraint aligned with the
-- canonical fallback V3 Content Studio materializer, which emits
-- fallback_article for approved full-copy package rows.

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_block_type_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_block_type_check
  check (
    block_type is null
    or block_type in (
      'fallback_aspect',
      'fallback_hook',
      'fallback_template',
      'fallback_article',
      'sign',
      'house',
      'ruler',
      'natal_aspect',
      'sky_aspect',
      'sky_article',
      'sky_placement',
      'lunar_calendar',
      'transit_to_natal_aspect',
      'synastry_aspect',
      'composite_aspect',
      'compatibility_planet_card',
      'condition_modifier',
      'synthesis',
      'essay'
    )
  );

comment on column public.generated_interpretations.block_type is
  'Reusable content block type. Includes fallback aspects/hooks/templates/articles, sky placement/article, lunar calendar, compatibility, condition modifier, and aspect-family values.';
