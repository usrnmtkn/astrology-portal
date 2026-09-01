-- Allow Content Studio to fork a non-serving draft beside an existing generated-content baseline.
--
-- The application already uses mode='studio-draft' for SKY V4 reader-copy drafts,
-- but the deployed generated_interpretations constraints still reflect an older schema:
-- a content_key-only unique index and a mode check that excludes studio-draft.
-- This migration aligns the database with the versioned draft lifecycle without
-- changing any existing reader-serving row.

drop index if exists public.generated_interpretations_content_key_unique_idx;

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_content_key_key;

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_unique_target;

drop index if exists public.generated_interpretations_unique_target_idx;

create unique index generated_interpretations_unique_target_idx
  on public.generated_interpretations (content_key, target_date, mode)
  nulls not distinct;

comment on index public.generated_interpretations_unique_target_idx is
  'Unique generated-content edit target; allows a non-serving studio-draft sibling while keeping one row per content_key/target_date/mode.';

alter table public.generated_interpretations
  drop constraint if exists generated_interpretations_mode_check;

alter table public.generated_interpretations
  add constraint generated_interpretations_mode_check
  check (mode in ('feed', 'in_depth', 'article', 'report', 'studio-draft'));
