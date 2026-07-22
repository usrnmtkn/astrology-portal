drop policy if exists "Approved fallback architecture system rows are public"
  on public.generated_interpretations;

create policy "Approved fallback architecture system rows are public"
  on public.generated_interpretations
  for select
  using (
    provider = 'tldrastro-fallback-architecture-v3'
    and coalesce(source_snapshot ->> 'contentType', source_snapshot ->> 'content_type', '') = 'fallback-system'
    and coalesce(
      source_snapshot ->> 'content_role',
      source_snapshot ->> 'contentRole',
      facts ->> 'content_role',
      facts ->> 'contentRole',
      sections -> 'packageRecord' ->> 'content_role',
      sections -> 'packageRecord' ->> 'contentRole',
      ''
    ) in ('fallback_hook', 'vocabulary', 'template')
    and coalesce(
      source_snapshot ->> 'review_status',
      source_snapshot ->> 'reviewStatus',
      facts ->> 'review_status',
      facts ->> 'reviewStatus',
      sections -> 'packageRecord' ->> 'review_status',
      sections -> 'packageRecord' ->> 'reviewStatus',
      ''
    ) in ('approved', 'approved_reuse', 'reviewed')
  );
