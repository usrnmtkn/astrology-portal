-- Formalizes aspect content as separate families so natal, sky, transit,
-- synastry, and composite meanings cannot collapse into one generic aspect row.

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
      'transit_to_natal_aspect',
      'synastry_aspect',
      'composite_aspect',
      'synthesis',
      'essay'
    )
  );

update public.generated_interpretations
set block_type = case
  when block_type = 'aspect' and surface = 'natal' then 'natal_aspect'
  when block_type = 'aspect' and surface = 'sky' then 'sky_aspect'
  when block_type = 'aspect' and surface = 'you' then 'transit_to_natal_aspect'
  when block_type = 'aspect' and surface in ('synastry', 'relationship') then 'synastry_aspect'
  when block_type = 'aspect' and surface = 'composite' then 'composite_aspect'
  when content_key like 'natal.aspect.%' then 'natal_aspect'
  when content_key like 'sky.aspect.%' then 'sky_aspect'
  when content_key like 'transit.aspect.%' then 'transit_to_natal_aspect'
  when content_key like 'synastry.aspect.%' then 'synastry_aspect'
  when content_key like 'composite.aspect.%' then 'composite_aspect'
  when surface = 'sky' and event_type = 'current-aspect' then 'sky_aspect'
  when surface = 'you' and event_type = 'transit-to-natal' then 'transit_to_natal_aspect'
  when surface = 'natal' and (event_type = 'natal-aspect' or content_key ~ '^natal-.+-(conjunction|opposition|square|trine|sextile)-.+$') then 'natal_aspect'
  when surface in ('synastry', 'relationship') and event_type = 'synastry-aspect' then 'synastry_aspect'
  when surface = 'composite' and event_type = 'composite-aspect' then 'composite_aspect'
  else block_type
end
where block_type is null or block_type = 'aspect';

comment on column public.generated_interpretations.block_type is
  'Reusable content block type. Aspect families are explicit: natal_aspect, sky_aspect, transit_to_natal_aspect, synastry_aspect, and composite_aspect.';
