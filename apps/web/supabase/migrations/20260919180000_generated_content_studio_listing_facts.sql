-- Content Studio lists are served from table columns only, because returning every document made
-- the list request fail. A row's group, title, and review-queue membership are still decided from a
-- few small facts inside sections, source_snapshot, and facts. Without them a list cannot tell a
-- Sky Placement article from a house horoscope, and an imported article never reaches the review
-- queue. This keeps those facts in a column so a list can classify a row without its copy.
--
-- The key lists match api/_lib/studio-listing-facts.ts. scripts/test-studio-listing-facts.mjs fails
-- when the two disagree. The column is generated, so it is computed once here and stays correct for
-- every writer without an update that would move every row's updated_at.

create or replace function public.generated_interpretations_studio_facts(
  sections jsonb,
  source_snapshot jsonb,
  facts jsonb
) returns jsonb
language sql
immutable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'source', nullif(jsonb_strip_nulls(jsonb_build_object(
      'sourceType', source_snapshot->>'sourceType',
      'type', source_snapshot->>'type',
      'sourcePackage', source_snapshot->>'sourcePackage',
      'contentType', source_snapshot->>'contentType',
      'content_type', source_snapshot->>'content_type',
      'contentRole', source_snapshot->>'contentRole',
      'content_role', source_snapshot->>'content_role',
      'sourceRole', source_snapshot->>'sourceRole',
      'source_role', source_snapshot->>'source_role',
      'role', source_snapshot->>'role',
      'bucket', source_snapshot->>'bucket',
      'targetContentFamily', source_snapshot->>'targetContentFamily',
      'contentFamily', source_snapshot->>'contentFamily',
      'contentSystem', source_snapshot->>'contentSystem',
      'review_status', source_snapshot->>'review_status',
      'reviewStatus', source_snapshot->>'reviewStatus',
      'lane', source_snapshot->>'lane',
      'sourceFile', source_snapshot->>'sourceFile',
      'tier', source_snapshot->>'tier',
      'phrasebankTier', source_snapshot->>'phrasebankTier',
      'provenanceTier', source_snapshot->>'provenanceTier',
      'sourceTier', source_snapshot->>'sourceTier',
      'flags', case when jsonb_typeof(source_snapshot->'flags') = 'array' then source_snapshot->'flags' end
    )), '{}'::jsonb),
    'packageRecord', nullif(jsonb_strip_nulls(jsonb_build_object(
      'contentKey', sections->'packageRecord'->>'contentKey',
      'content_role', sections->'packageRecord'->>'content_role',
      'render_policy', sections->'packageRecord'->>'render_policy',
      'studio_review_category', sections->'packageRecord'->>'studio_review_category',
      'review_status', sections->'packageRecord'->>'review_status',
      'owner_approved', sections->'packageRecord'->'owner_approved',
      'reader_only', sections->'packageRecord'->'reader_only',
      'serving_enabled', sections->'packageRecord'->'serving_enabled'
    )), '{}'::jsonb),
    'fallbackArchitectureV3', case when facts->'fallbackArchitectureV3' = 'true'::jsonb then true end
  ));
$$;

alter table public.generated_interpretations
  add column if not exists studio_facts jsonb
  generated always as (public.generated_interpretations_studio_facts(sections, source_snapshot, facts)) stored;
