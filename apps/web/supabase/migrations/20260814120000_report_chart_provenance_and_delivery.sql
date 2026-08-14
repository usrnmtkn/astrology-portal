-- Package 1: governed geocoding provenance and reviewed-delivery identity.
alter table public.manual_charts
  add column if not exists birth_coordinate_provider text,
  add column if not exists birth_coordinate_source_id text,
  add column if not exists birth_coordinate_resolution text
    check (birth_coordinate_resolution in ('municipal_centroid', 'borough_centroid', 'legacy_unprovenanced'));

update public.manual_charts
set birth_coordinate_provider = coalesce(birth_coordinate_provider, 'legacy'),
    birth_coordinate_source_id = coalesce(birth_coordinate_source_id, 'unrecorded'),
    birth_coordinate_resolution = coalesce(birth_coordinate_resolution, 'legacy_unprovenanced')
where birth_coordinate_provider is null
   or birth_coordinate_source_id is null
   or birth_coordinate_resolution is null;

alter table public.user_generated_interpretations
  add column if not exists display_order integer;

alter table public.user_reports
  add column if not exists review_document jsonb,
  add column if not exists review_document_bytes text,
  add column if not exists review_document_hash text;

comment on column public.manual_charts.birth_coordinate_resolution is
  'Governed report convention: birth cities resolve to municipal or borough centroids. legacy_unprovenanced charts must be reconfirmed before a new canonical chart hash is frozen.';
