-- Native Calendar ingress and station editors already emit calendar_event.
-- Preserve the existing block types while admitting these authored events.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_block_type_check;
alter table public.generated_interpretations
  add constraint generated_interpretations_block_type_check
  check (block_type is null or block_type in (
    'fallback_aspect','fallback_hook','fallback_template','fallback_article',
    'sign','house','ruler','natal_aspect','sky_aspect','sky_article','sky_placement',
    'lunar_calendar','calendar_event','transit_to_natal_aspect','synastry_aspect',
    'composite_aspect','compatibility_planet_card','condition_modifier','synthesis','essay'
  ));
commit;
