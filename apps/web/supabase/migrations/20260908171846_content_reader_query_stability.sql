-- Reader provider pages must not sort all approved JSON/prose rows on disk.
-- Existing (provider,id) includes draft/reference rows; the reader index starts
-- at the serving subset and preserves the cursor order. Authorization is unchanged.
set lock_timeout = '3s';
set statement_timeout = '30s';

create index if not exists generated_interpretations_live_provider_id_idx
  on public.generated_interpretations (provider, id)
  where status = 'LIVE' and lane = 'serving' and review_state is null;

-- These filters are correlated. Independent estimates underestimated the live
-- provider by almost 4x even after ANALYZE, preferring a disk-spilling sort.
create statistics if not exists public.generated_interpretations_reader_filter_stats
  (mcv, dependencies) on provider, status, lane, review_state
  from public.generated_interpretations;

analyze public.generated_interpretations;
reset statement_timeout;
reset lock_timeout;
