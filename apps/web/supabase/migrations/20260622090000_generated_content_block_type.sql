-- Adds an explicit reusable block type for modular natal content.
-- Existing essay-style rows are preserved and can continue to alias into
-- modular keys until the library has complete sign/house/ruler/aspect coverage.

alter table public.generated_interpretations
  add column if not exists block_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generated_interpretations_block_type_check'
  ) then
    alter table public.generated_interpretations
      add constraint generated_interpretations_block_type_check
      check (
        block_type is null
        or block_type in ('sign', 'house', 'ruler', 'aspect', 'synthesis', 'essay')
      );
  end if;
end $$;

create index if not exists generated_interpretations_block_type_idx
  on public.generated_interpretations (surface, block_type, status, updated_at desc);

update public.generated_interpretations
set block_type = case
  when content_key like 'natal.sign.%' then 'sign'
  when content_key like 'natal.house.%' then 'house'
  when content_key like 'natal.ruler.%' then 'ruler'
  when content_key like 'natal.aspect.%' then 'aspect'
  when content_key like 'natal.synthesis.%' then 'synthesis'
  when surface = 'natal' and event_type in ('natal-placement', 'manual-natal-chart') then 'essay'
  when surface = 'natal' and (event_type = 'natal-aspect' or content_key ~ '^natal-.+-(conjunction|opposition|square|trine|sextile)-.+$') then 'aspect'
  else block_type
end
where block_type is null;

comment on column public.generated_interpretations.block_type is
  'Reusable content block type for modular natal assembly: sign, house, ruler, aspect, synthesis, or legacy essay.';
