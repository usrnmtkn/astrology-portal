-- Allow feed and in-depth siblings for the same generated content key.
--
-- Earlier deployed databases may still have a content_key-only unique index,
-- which blocks rows such as:
--   sky-season-cancer / feed
--   sky-season-cancer / in_depth
--
-- Runtime/import code keys generated_interpretations by content_key + target_date
-- + mode. NULLS NOT DISTINCT keeps evergreen/template rows with null target_date
-- unique per mode, while still allowing feed and in_depth siblings.

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
  'Unique serving/edit target for generated content; permits feed and in_depth siblings for the same content_key.';
